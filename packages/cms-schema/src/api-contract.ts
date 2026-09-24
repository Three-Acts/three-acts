import type { CmsRecord, CmsRecordValue, ListRecordsOptions, PublishStatus } from "./types";

/**
 * Wire contract for the CMS REST bridge (`apps/api/api/cms/*`), consumed by
 * the CMS `RestCmsBackend`. Every response uses the API envelope
 * `{ ok: true, data } | { ok: false, error: { code: CmsErrorCode, message } }`.
 *
 *   GET    /api/cms/collections                                   -> CmsCollectionSummary[]
 *   GET    /api/cms/collections/:collectionId/records?search&sortKey&sortDirection&limit&offset -> ListRecordsResult
 *   POST   /api/cms/collections/:collectionId/records             body CreateRecordBody   -> CmsRecord
 *   GET    /api/cms/collections/:collectionId/records/:recordId   -> CmsRecord
 *   PUT    /api/cms/collections/:collectionId/records/:recordId   body SaveRecordBody     -> CmsRecord (409 on conflict)
 *   DELETE /api/cms/collections/:collectionId/records/:recordId   -> { deleted: true }
 *   POST   /api/cms/collections/:collectionId/import              body ImportRecordsBody  -> CmsRecord[]
 *   POST   /api/cms/collections/:collectionId/assets/:fieldKey    body UploadAssetBody    -> AssetUploadResult
 *   POST   /api/cms/collections/:collectionId/status              body SetPublishStatusBody -> CmsRecord[]
 *   POST   /api/cms/publish                                       body PublishBody        -> { published: number }
 *
 * All routes require the same bearer auth as /api/deploy.
 */
export const cmsApiPaths = {
  collections: () => "/cms/collections" as const,
  records: (collectionId: string) => `/cms/collections/${encodeURIComponent(collectionId)}/records` as const,
  record: (collectionId: string, recordId: string) =>
    `/cms/collections/${encodeURIComponent(collectionId)}/records/${encodeURIComponent(recordId)}` as const,
  import: (collectionId: string) => `/cms/collections/${encodeURIComponent(collectionId)}/import` as const,
  asset: (collectionId: string, fieldKey: string) =>
    `/cms/collections/${encodeURIComponent(collectionId)}/assets/${encodeURIComponent(fieldKey)}` as const,
  status: (collectionId: string) => `/cms/collections/${encodeURIComponent(collectionId)}/status` as const,
  publish: () => "/cms/publish" as const
};

export type CreateRecordBody = { values?: Partial<Record<string, CmsRecordValue>> };
export type SaveRecordBody = { record: CmsRecord; expectedModifiedAt?: string };
export type ImportRecordsBody = { rows: Array<Record<string, CmsRecordValue>> };
export type PublishBody = { collectionId?: string };
export type SetPublishStatusBody = { recordIds: string[]; publishStatus: Exclude<PublishStatus, "published"> };
/** Base64 payload keeps the bridge dependency-free; keep files under 4 MB (Vercel body limit). */
export type UploadAssetBody = { fileName: string; contentType: string; size: number; data: string };

export const MAX_ASSET_UPLOAD_BYTES = 4 * 1024 * 1024;

export function listRecordsQuery(options?: ListRecordsOptions): string {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.sort) {
    params.set("sortKey", options.sort.key);
    params.set("sortDirection", options.sort.direction);
  }
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  if (options?.offset !== undefined) params.set("offset", String(options.offset));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Public, unauthenticated read contract for published content, consumed by
 * the static site build (`apps/web`). Only collections with a publish
 * workflow are served, and only their `published` records.
 *
 *   GET /api/content/collections/:collectionId/records?sortKey&sortDirection&limit&offset -> ListRecordsResult
 */
export const contentApiPaths = {
  records: (collectionId: string) => `/content/collections/${encodeURIComponent(collectionId)}/records` as const
};
