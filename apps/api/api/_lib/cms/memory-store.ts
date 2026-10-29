import type { CmsCollection, CmsRecord, CmsRecordValue, ListRecordsOptions, ListRecordsResult, PublishStatus } from "@three-acts/cms-schema";
import type { SeedCollections } from "@three-acts/cms-schema/seed";
import { cloneRecord, RecordCollectionEngine } from "./collection-engine";
import type { CmsBlobStore, CmsDataStore, UpdateRecordOptions } from "./store";

/**
 * In-process `CmsDataStore`/`CmsBlobStore` for local dev without Supabase.
 *
 * Dev-only: state lives in a module-level Map for the lifetime of this
 * process. On Vercel, each invocation may run in a fresh process/container
 * with no shared memory, so this store must never be selected in production —
 * `resolve-store.ts` only falls back to it when Supabase isn't configured,
 * which in practice means local/dev environments.
 *
 * Optionally starts from a seed (`resolve-store.ts` passes the shared
 * "Fynbos & Fire" dataset outside production). The seed loader is awaited
 * lazily by the first call, so the dataset is only evaluated when this store
 * is actually used.
 *
 * Unlike the Supabase store, this store tracks the `liveValues` snapshot:
 * saves keep it, `publishQueued` promotes values into it, `not_published`
 * clears it, and `listLiveRecords` serves it to the public content route.
 * The actual record logic (search/sort/paginate, the publish model,
 * id/timestamp stamping) lives in `RecordCollectionEngine`, shared with
 * `FileDataStore`.
 */
export class MemoryDataStore implements CmsDataStore {
  readonly name = "memory";
  private readonly collections = new Map<string, CmsRecord[]>();
  private readonly engines = new Map<string, RecordCollectionEngine>();
  private ready: Promise<void> | undefined;

  constructor(private readonly loadSeed?: () => Promise<SeedCollections> | SeedCollections) {}

  /** Loads the seed once, before the first read or write. */
  private init(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        if (!this.loadSeed) return;
        const seed = await this.loadSeed();
        for (const [collectionId, records] of Object.entries(seed)) {
          this.collections.set(collectionId, records.map(cloneRecord));
        }
      })();
    }
    return this.ready;
  }

  private engineFor(collection: CmsCollection): RecordCollectionEngine {
    let engine = this.engines.get(collection.id);
    if (!engine) {
      let records = this.collections.get(collection.id);
      if (!records) {
        records = [];
        this.collections.set(collection.id, records);
      }
      engine = new RecordCollectionEngine(collection, records);
      this.engines.set(collection.id, engine);
    }
    return engine;
  }

  async listRecords(collection: CmsCollection, options: ListRecordsOptions): Promise<ListRecordsResult> {
    await this.init();
    return this.engineFor(collection).list(options);
  }

  async listLiveRecords(collection: CmsCollection, options: ListRecordsOptions): Promise<ListRecordsResult> {
    await this.init();
    return this.engineFor(collection).listLive(options);
  }

  async countRecords(collection: CmsCollection, filter?: { publishStatus?: PublishStatus }): Promise<number> {
    await this.init();
    return this.engineFor(collection).count(filter);
  }

  async getRecord(collection: CmsCollection, recordId: string): Promise<CmsRecord | null> {
    await this.init();
    return this.engineFor(collection).get(recordId);
  }

  async insertRecords(
    collection: CmsCollection,
    rows: Array<{ publishStatus: PublishStatus; values: Record<string, CmsRecordValue> }>
  ): Promise<CmsRecord[]> {
    await this.init();
    return this.engineFor(collection).insert(rows);
  }

  async updateRecord(
    collection: CmsCollection,
    record: CmsRecord,
    expectedModifiedAt?: string,
    options?: UpdateRecordOptions
  ): Promise<CmsRecord | "conflict" | null> {
    await this.init();
    return this.engineFor(collection).update(record, expectedModifiedAt, options?.liveValuesPatch);
  }

  async deleteRecord(collection: CmsCollection, recordId: string): Promise<boolean> {
    await this.init();
    return this.engineFor(collection).delete(recordId);
  }

  async publishQueued(collection: CmsCollection): Promise<number> {
    await this.init();
    return this.engineFor(collection).publishQueued();
  }

  async setPublishStatus(collection: CmsCollection, recordIds: string[], status: PublishStatus): Promise<CmsRecord[]> {
    await this.init();
    return this.engineFor(collection).setPublishStatus(recordIds, status);
  }
}

/** In-process `CmsBlobStore` for local dev without Supabase Storage; never persists bytes. */
export class MemoryBlobStore implements CmsBlobStore {
  readonly name = "memory";

  async upload(input: { bucket: string; path: string; contentType: string; data: Buffer }): Promise<{ path: string; url: string }> {
    // Dev-only fake URL. Bytes are intentionally not retained anywhere beyond
    // this call (only `size`, via the caller's AssetUploadResult, survives).
    void input.contentType;
    void input.data.length;
    return { path: input.path, url: `/dev-storage/${input.bucket}/${input.path}` };
  }
}
