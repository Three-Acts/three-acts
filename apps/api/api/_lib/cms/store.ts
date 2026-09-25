import type { CmsCollection, CmsRecord, CmsRecordValue, ListRecordsOptions, ListRecordsResult, PublishStatus } from "@three-acts/cms-schema";

/**
 * Server-side storage contracts for the CMS API, deliberately provider-agnostic.
 * `CmsService` (./service.ts) is the only caller: it owns validation and the
 * collection contract (readonly mode, required fields, etc.), so every
 * implementation here can stay a thin, honest mapping onto its backend.
 *
 * To add another backend (plain Postgres via pg/Drizzle, Cloudflare R2 via the
 * S3 API, ...), implement these two interfaces and register the result in
 * `resolve-store.ts`.
 */
export interface CmsDataStore {
  readonly name: string;

  listRecords(collection: CmsCollection, options: ListRecordsOptions): Promise<ListRecordsResult>;

  /**
   * Optional: the records the live site renders, with `values` set to each
   * record's `liveValues` snapshot (published records plus draft/queued edits
   * of published records). Stores that don't track snapshots omit this and the
   * public content route falls back to `listRecords` with
   * `publishStatus: "published"`.
   */
  listLiveRecords?(collection: CmsCollection, options: ListRecordsOptions): Promise<ListRecordsResult>;

  countRecords(collection: CmsCollection, filter?: { publishStatus?: PublishStatus }): Promise<number>;

  getRecord(collection: CmsCollection, recordId: string): Promise<CmsRecord | null>;

  /** The store owns ids and timestamps for new rows. */
  insertRecords(
    collection: CmsCollection,
    rows: Array<{ publishStatus: PublishStatus; values: Record<string, CmsRecordValue> }>
  ): Promise<CmsRecord[]>;

  /**
   * Persists `record` as given (the caller has already merged/validated
   * values). Implementations always stamp the modified column with "now".
   * When `expectedModifiedAt` is provided, the update is conditioned on the
   * stored record still having that `modifiedAt` (optimistic concurrency):
   * - returns the updated record on success
   * - returns `"conflict"` when the record exists but its stored
   *   `modifiedAt` no longer matches `expectedModifiedAt`
   * - returns `null` when the record does not exist at all
   */
  updateRecord(collection: CmsCollection, record: CmsRecord, expectedModifiedAt?: string): Promise<CmsRecord | "conflict" | null>;

  /** Returns whether a row was actually deleted. */
  deleteRecord(collection: CmsCollection, recordId: string): Promise<boolean>;

  /** Flips every `queued_to_publish` record in this collection to `published`; returns the count changed. */
  publishQueued(collection: CmsCollection): Promise<number>;

  /**
   * Sets `status` (and stamps the modified column with "now") on every id in
   * `recordIds` that exists in this collection. Returns the updated records
   * in the same order as `recordIds`, silently skipping unknown ids.
   */
  setPublishStatus(collection: CmsCollection, recordIds: string[], status: PublishStatus): Promise<CmsRecord[]>;
}

export interface CmsBlobStore {
  readonly name: string;

  upload(input: { bucket: string; path: string; contentType: string; data: Buffer }): Promise<{ path: string; url: string }>;
}
