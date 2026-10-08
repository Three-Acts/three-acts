import { collectionRegistry } from "./registry";

export type CmsSource = { collectionId: string; recordId: string; label: string; field?: string };
const aliases: Record<string, string> = { productCategories: "product-categories", articleCategories: "article-categories" };
export function normalizeCmsCollection(id: string): string | null {
  const canonical = Object.hasOwn(aliases, id) ? aliases[id] : id;
  return collectionRegistry.some(collection => collection.id === canonical) ? canonical : null;
}
/** Collection/record identity is explicit. A slug, current preview, or parent record is never a fallback. */
export function readCmsSource(value: unknown): CmsSource | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (typeof source.collectionId !== "string" || typeof source.recordId !== "string" || !/^[\w.:-]{1,200}$/.test(source.recordId)) return null;
  const collectionId = normalizeCmsCollection(source.collectionId);
  if (!collectionId || typeof source.label !== "string" || !source.label.trim() || source.label.length > 300) return null;
  if (source.field !== undefined && (typeof source.field !== "string" || !/^[a-zA-Z]\w*(?:\.[\w]+){0,5}$/.test(source.field) || source.field.length > 180)) return null;
  return { collectionId, recordId: source.recordId, label: source.label, ...(typeof source.field === "string" ? { field: source.field } : {}) };
}
export function cmsSourceField(source: CmsSource) {
  const key = source.field?.split(".")[0];
  return collectionRegistry.find(collection => collection.id === source.collectionId)?.fields.find(field => field.key === key);
}
export function cmsAttributes(source?: Omit<CmsSource, "field">, field?: string) {
  if (!source) return {};
  const valid = readCmsSource({ ...source, label: source.label.trim().slice(0, 300) || source.recordId, field });
  if (!valid) throw new Error("Invalid CMS source identity.");
  return { "data-cms-bound": valid.collectionId + (field ? `.${field}` : ""), "data-cms-collection": valid.collectionId, "data-cms-item-id": valid.recordId, "data-cms-item-label": valid.label };
}
