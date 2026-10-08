import { collectionRegistry } from "./registry";
import type { CmsRecord, CmsRecordValue } from "./types";
import { parseImageGallery, parseImageValue } from "./images";
import { parseFileValue, parseVideoValue } from "./files";

/** Only fields consumed by the public domain read models may leave the CMS.
 * Never transfer a full editorial record or its private publication snapshots. */
export const cmsPreviewFields = {
  articles: ["title", "slug", "excerpt", "body", "coverImage", "author", "category", "tags", "publishedAt", "readingTime", "featured", "seoTitle", "seoDescription"],
  authors: ["name", "slug", "role", "bio", "avatar", "email", "websiteUrl", "xHandle", "instagramHandle", "linkedinUrl"],
  "article-categories": ["name", "slug", "description", "sortOrder"],
  products: ["title", "slug", "sku", "category", "price", "compareAtPrice", "currency", "inventory", "availability", "shortDescription", "description", "images", "productVideo", "specSheet", "weightGrams", "tags", "featured"],
  "product-categories": ["name", "slug", "description", "image", "sortOrder"],
  faqs: ["question", "answer", "topic", "sortOrder"],
  testimonials: ["customerName", "quote", "customerTitle", "company", "avatar", "rating", "product", "featured", "sortOrder"],
} as const;
export type CmsPreviewCollection = keyof typeof cmsPreviewFields;
export type CmsPreviewTemplateCollection = Exclude<CmsPreviewCollection, "faqs" | "testimonials">;
export const cmsPreviewCollections = Object.keys(cmsPreviewFields) as CmsPreviewCollection[];
export const cmsPreviewLimits = { records: 5000, bytes: 8 * 1024 * 1024, text: 200_000 } as const;
export type CmsPreviewRecord = Pick<CmsRecord, "id" | "values">;
export type CmsDraftPreview = {
  version: 1;
  session: string;
  sequence: number;
  collectionId: CmsPreviewTemplateCollection;
  recordId: string;
  collections: Record<CmsPreviewCollection, CmsPreviewRecord[]>;
};
export type CmsPreviewSession = Pick<CmsDraftPreview, "session"> & Partial<Pick<CmsDraftPreview, "collectionId" | "recordId">>;

for (const collectionId of cmsPreviewCollections) {
  const fields = new Set(collectionRegistry.find(collection => collection.id === collectionId)?.fields.map(field => field.key));
  if (cmsPreviewFields[collectionId].some(field => !fields.has(field))) throw new Error(`Draft preview fields do not match the ${collectionId} registry.`);
}

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
const validId = (value: unknown): value is string => typeof value === "string" && /^[\w.:-]{1,200}$/.test(value);
const validSession = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{16,80}$/.test(value);
function projectValue(collectionId: CmsPreviewCollection, key: string, value: CmsRecordValue): CmsRecordValue {
  const type = collectionRegistry.find(collection => collection.id === collectionId)?.fields.find(field => field.key === key)?.type;
  const imageRef = (image: NonNullable<ReturnType<typeof parseImageValue>>) => ({ src: image.src, alt: image.alt, width: image.width, height: image.height });
  if (type === "image") { const image = parseImageValue(value); return image ? JSON.stringify(imageRef(image)) : ""; }
  if (type === "image-gallery") return JSON.stringify(parseImageGallery(value).map(imageRef));
  if (type === "video") { const video = parseVideoValue(value); return video ? JSON.stringify({ src: video.src, contentType: video.contentType }) : ""; }
  if (type === "file") { const file = parseFileValue(value); return file ? JSON.stringify({ src: file.src, fileName: file.fileName }) : ""; }
  return value;
}
export function isCmsPreviewTemplateCollection(value: unknown): value is CmsPreviewTemplateCollection {
  return typeof value === "string" && Object.hasOwn(cmsPreviewFields, value) && value !== "faqs" && value !== "testimonials";
}

/** Validate before mounting any draft DOM. Origins/parent windows are checked
 * by the caller; the session also rejects payloads for a previous frame/item. */
export function readCmsDraftPreview(input: unknown, expected: CmsPreviewSession): CmsDraftPreview | null {
  if (!object(input) || Object.keys(input).length !== 6 || ["version", "session", "sequence", "collectionId", "recordId", "collections"].some(key => !Object.hasOwn(input, key)) || input.version !== 1 || !validSession(input.session) || input.session !== expected.session || !Number.isSafeInteger(input.sequence) || Number(input.sequence) < 1 || !isCmsPreviewTemplateCollection(input.collectionId) || !validId(input.recordId)) return null;
  if (expected.collectionId && input.collectionId !== expected.collectionId || expected.recordId && input.recordId !== expected.recordId) return null;
  if (!object(input.collections) || Object.keys(input.collections).length !== cmsPreviewCollections.length || cmsPreviewCollections.some(id => !Object.hasOwn(input.collections as object, id))) return null;
  let count = 0;
  let bytes = 500;
  const encoder = new TextEncoder();
  for (const collectionId of cmsPreviewCollections) {
    const records = input.collections[collectionId];
    if (!Array.isArray(records) || records.length > cmsPreviewLimits.records) return null;
    const ids = new Set<string>();
    const fields = new Set<string>(cmsPreviewFields[collectionId]);
    for (const record of records) {
      if (!object(record) || Object.keys(record).length !== 2 || !Object.hasOwn(record, "id") || !Object.hasOwn(record, "values") || !validId(record.id) || ids.has(record.id) || !object(record.values) || ++count > cmsPreviewLimits.records) return null;
      ids.add(record.id);
      bytes += record.id.length + 100;
      for (const [key, value] of Object.entries(record.values)) {
        if (!fields.has(key) || !(value === null || typeof value === "boolean" || typeof value === "string" && value.length <= cmsPreviewLimits.text || typeof value === "number" && Number.isFinite(value))) return null;
        bytes += key.length + 10 + encoder.encode(JSON.stringify(value)).length;
        if (bytes > cmsPreviewLimits.bytes) return null;
      }
    }
  }
  const preview = input as unknown as CmsDraftPreview;
  return preview.collections[preview.collectionId].some(record => record.id === preview.recordId) ? preview : null;
}

/** Copy a minimal saved-value snapshot; caller obtains these records through
 * its authenticated CMS backend. No liveValues, credentials or unrelated data. */
export function createCmsDraftPreview(
  source: Omit<CmsDraftPreview, "version" | "collections">,
  records: Record<CmsPreviewCollection, readonly CmsRecord[]>,
): CmsDraftPreview {
  if (cmsPreviewCollections.some(id => !Array.isArray(records[id])) || cmsPreviewCollections.reduce((total, id) => total + records[id].length, 0) > cmsPreviewLimits.records) throw new Error("Saved CMS draft preview exceeds the supported record limits.");
  const collections = Object.fromEntries(cmsPreviewCollections.map(collectionId => [collectionId, records[collectionId].map(record => ({
    id: record.id,
    values: Object.fromEntries(cmsPreviewFields[collectionId].filter(key => Object.hasOwn(record.values, key)).map(key => [key, projectValue(collectionId, key, record.values[key] as CmsRecordValue)])),
  }))])) as CmsDraftPreview["collections"];
  const payload: CmsDraftPreview = { session: source.session, sequence: source.sequence, collectionId: source.collectionId, recordId: source.recordId, version: 1, collections };
  if (!readCmsDraftPreview(payload, source)) throw new Error("Saved CMS draft preview is missing its item, contains invalid values, or exceeds the supported content limits.");
  return payload;
}
