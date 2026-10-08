import { cmsPreviewCollections, cmsPreviewLimits, createCmsDraftPreview, type CmsDataAdapter, type CmsDraftPreview, type CmsPreviewCollection, type CmsPreviewTemplateCollection, type CmsRecord } from "@three-acts/cms-schema";

const dependencies: Record<CmsPreviewTemplateCollection, CmsPreviewCollection[]> = {
  products: ["products", "product-categories", "faqs"],
  articles: ["articles", "authors", "article-categories", "products"],
  authors: ["authors", "articles", "article-categories"],
  "product-categories": ["product-categories", "products"],
  "article-categories": ["article-categories", "articles"],
};

/** Resolve canonical links without treating incomplete draft placeholders as
 * published URLs. The target template still goes through the page guard. */
export function resolveCmsDraftRoute(preview: CmsDraftPreview, route: string, templates: { id: string; collectionId?: string; route: string }[]): { templateId: string; recordId: string } | null {
  for (const template of templates) {
    if (!template.collectionId || !Object.hasOwn(dependencies, template.collectionId)) continue;
    const collectionId = template.collectionId as CmsPreviewTemplateCollection;
    for (const record of preview.collections[collectionId]) {
      const slug = typeof record.values.slug === "string" && record.values.slug.trim() ? record.values.slug : `__preview_${record.id}`;
      if (template.route.replace("[slug]", encodeURIComponent(slug)) === route) return { templateId: template.id, recordId: record.id };
    }
  }
  return null;
}

/** All requests use the CMS parent's injected authenticated adapter. This
 * loader never gives the website an API client, token, cookie or full record. */
export async function loadCmsDraftPreview(
  data: Pick<CmsDataAdapter, "listRecords" | "getRecord">,
  source: Omit<CmsDraftPreview, "version" | "collections">,
  isCurrent: () => boolean = () => true,
): Promise<CmsDraftPreview> {
  const records = Object.fromEntries(cmsPreviewCollections.map(id => [id, [] as CmsRecord[]])) as Record<CmsPreviewCollection, CmsRecord[]>;
  let count = 0;
  let failed = false;
  function ensureCurrent() {
    if (failed || !isCurrent()) { const error = new Error("Draft preview request was replaced."); error.name = "AbortError"; throw error; }
  }
  try { await Promise.all(dependencies[source.collectionId].map(async collectionId => {
    const seen = new Set<string>();
    let total = Infinity;
    while (records[collectionId].length < total) {
      ensureCurrent();
      const result = await data.listRecords(collectionId, { limit: 100, offset: records[collectionId].length });
      ensureCurrent();
      if (!Number.isSafeInteger(result.total) || result.total < 0 || result.total > cmsPreviewLimits.records) throw new Error("This collection exceeds the saved draft preview limit.");
      if (!Array.isArray(result.records) || result.records.length > 100 || records[collectionId].length + result.records.length > result.total) throw new Error("CMS returned an inconsistent preview page. Try again.");
      total = result.total;
      if (!result.records.length && records[collectionId].length < total) throw new Error("CMS records changed during preview loading. Try again.");
      for (const record of result.records) {
        if (seen.has(record.id)) throw new Error("CMS records changed during preview loading. Try again.");
        if (++count > cmsPreviewLimits.records) throw new Error("Related content exceeds the saved draft preview limit.");
        seen.add(record.id);
        records[collectionId].push(record);
      }
    }
  })); } catch (error) { failed = true; throw error; }
  // Read the selected source last: a save/deletion while related content was
  // loading must not leave the main canvas on an older list-page value.
  ensureCurrent();
  const selected = await data.getRecord(source.collectionId, source.recordId);
  ensureCurrent();
  const list = records[source.collectionId];
  const index = list.findIndex(record => record.id === source.recordId);
  if (index < 0) list.push(selected);
  else list[index] = selected;
  return createCmsDraftPreview(source, records);
}
