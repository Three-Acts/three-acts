import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CmsCollection, CmsRecord, CmsRecordValue, ListRecordsOptions, ListRecordsResult, PublishStatus } from "@three-acts/cms-schema";
import type { SeedCollections } from "@three-acts/cms-schema/seed";
import { cloneRecord, RecordCollectionEngine } from "./collection-engine";
import type { CmsBlobStore, CmsDataStore, UpdateRecordOptions } from "./store";

/** Directory holding `apps/api/package.json`, resolved from this module's own location (not `process.cwd()`). */
function resolvePackageDir(): string {
  const here = fileURLToPath(import.meta.url);
  // here = <pkg>/api/_lib/cms/file-store.ts -> up three levels (cms, _lib, api) -> <pkg>
  return path.resolve(path.dirname(here), "../../..");
}

/** `CMS_DATA_DIR` (default `./data`), resolved against the `apps/api` package dir, never the process cwd. */
export function resolveDataDir(envValue: string | undefined = process.env.CMS_DATA_DIR): string {
  const raw = envValue && envValue.trim() ? envValue.trim() : "./data";
  return path.resolve(resolvePackageDir(), raw);
}

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

type CollectionState = {
  records: CmsRecord[];
  engine: RecordCollectionEngine;
};

type StoredFile = {
  collectionId: string;
  records: CmsRecord[];
};

function isEnoent(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as NodeJS.ErrnoException).code === "ENOENT");
}

/**
 * `CmsDataStore` backed by one JSON file per collection under `CMS_DATA_DIR`
 * (default `./data`, relative to the `apps/api` package, not the cwd).
 *
 * On first access of a collection whose file is missing, the collection is
 * seeded from `cloneSeedCollections()` (when `loadSeed` is provided — dev
 * only, never in production) or starts empty. Once loaded, the collection's
 * records live in memory (one shared array per collection, held by both this
 * store's state map and the `RecordCollectionEngine` that mutates it); every
 * mutating call rewrites `<collectionId>.json` atomically (write `.tmp`, then
 * rename) before the store method that triggered it resolves. Concurrent
 * writes to the same collection are serialized through a per-collection
 * promise chain so two overlapping mutations never race on the same file.
 *
 * The record logic itself (search/sort/paginate, the publish/live-snapshot
 * model, id/timestamp stamping) lives in `RecordCollectionEngine`, shared
 * with `MemoryDataStore`.
 */
export class FileDataStore implements CmsDataStore {
  readonly name = "file";
  readonly dir: string;
  private readonly loadSeed: (() => Promise<SeedCollections> | SeedCollections) | undefined;
  private readonly seedIfMissing: boolean;
  private readonly states = new Map<string, Promise<CollectionState>>();
  private readonly writeQueues = new Map<string, Promise<void>>();

  constructor(options?: { dir?: string; loadSeed?: () => Promise<SeedCollections> | SeedCollections; seedIfMissing?: boolean }) {
    this.dir = options?.dir ?? resolveDataDir();
    this.loadSeed = options?.loadSeed;
    this.seedIfMissing = options?.seedIfMissing ?? !isProduction();
  }

  private filePathFor(collectionId: string): string {
    return path.join(this.dir, `${collectionId}.json`);
  }

  private loadState(collection: CmsCollection): Promise<CollectionState> {
    let promise = this.states.get(collection.id);
    if (!promise) {
      promise = this.readOrSeed(collection);
      this.states.set(collection.id, promise);
    }
    return promise;
  }

  private async readOrSeed(collection: CmsCollection): Promise<CollectionState> {
    let records: CmsRecord[] | undefined;
    let justSeeded = false;

    try {
      const raw = await readFile(this.filePathFor(collection.id), "utf8");
      const parsed = JSON.parse(raw) as Partial<StoredFile>;
      records = Array.isArray(parsed.records) ? parsed.records.map(cloneRecord) : [];
    } catch (error) {
      if (!isEnoent(error)) {
        throw error;
      }
      records = undefined;
    }

    if (records === undefined) {
      if (this.seedIfMissing && this.loadSeed) {
        const seed = await this.loadSeed();
        records = (seed[collection.id] ?? []).map(cloneRecord);
        justSeeded = true;
      } else {
        records = [];
      }
    }

    const liveRecords = records;
    const engine = new RecordCollectionEngine(collection, liveRecords, () => {
      this.queuePersist(collection.id, liveRecords);
    });

    // Write the freshly seeded file to disk right away (not only on the next
    // mutation), so a read-only session against a brand new CMS_DATA_DIR
    // still leaves `<collectionId>.json` on disk for the next process to
    // load. Awaited (not fire-and-forget) so the write has actually landed
    // before this collection's first access resolves.
    if (justSeeded) {
      await this.queuePersist(collection.id, liveRecords);
    }

    return { records: liveRecords, engine };
  }

  /** Chains a persist of `records` onto this collection's write queue and returns that queue's promise. */
  private queuePersist(collectionId: string, records: CmsRecord[]): Promise<void> {
    const previous = this.writeQueues.get(collectionId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(() => this.writeFile(collectionId, records));
    this.writeQueues.set(collectionId, next);
    return next;
  }

  private async writeFile(collectionId: string, records: CmsRecord[]): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const filePath = this.filePathFor(collectionId);
    const tmpPath = `${filePath}.tmp`;
    const payload: StoredFile = { collectionId, records };
    await writeFile(tmpPath, JSON.stringify(payload, null, 2), "utf8");
    await rename(tmpPath, filePath);
  }

  /** Runs a mutation against the collection's engine, then waits for the resulting file write to land (or settle) before resolving. */
  private async mutate<TResult>(collection: CmsCollection, run: (engine: RecordCollectionEngine) => TResult): Promise<TResult> {
    const { engine } = await this.loadState(collection);
    const result = run(engine);
    await (this.writeQueues.get(collection.id) ?? Promise.resolve());
    return result;
  }

  async listRecords(collection: CmsCollection, options: ListRecordsOptions): Promise<ListRecordsResult> {
    const { engine } = await this.loadState(collection);
    return engine.list(options);
  }

  async listLiveRecords(collection: CmsCollection, options: ListRecordsOptions): Promise<ListRecordsResult> {
    const { engine } = await this.loadState(collection);
    return engine.listLive(options);
  }

  async countRecords(collection: CmsCollection, filter?: { publishStatus?: PublishStatus }): Promise<number> {
    const { engine } = await this.loadState(collection);
    return engine.count(filter);
  }

  async getRecord(collection: CmsCollection, recordId: string): Promise<CmsRecord | null> {
    const { engine } = await this.loadState(collection);
    return engine.get(recordId);
  }

  async insertRecords(
    collection: CmsCollection,
    rows: Array<{ publishStatus: PublishStatus; values: Record<string, CmsRecordValue> }>
  ): Promise<CmsRecord[]> {
    return this.mutate(collection, (engine) => engine.insert(rows));
  }

  async updateRecord(
    collection: CmsCollection,
    record: CmsRecord,
    expectedModifiedAt?: string,
    options?: UpdateRecordOptions
  ): Promise<CmsRecord | "conflict" | null> {
    return this.mutate(collection, (engine) => engine.update(record, expectedModifiedAt, options?.liveValuesPatch));
  }

  async deleteRecord(collection: CmsCollection, recordId: string): Promise<boolean> {
    return this.mutate(collection, (engine) => engine.delete(recordId));
  }

  async publishQueued(collection: CmsCollection): Promise<number> {
    return this.mutate(collection, (engine) => engine.publishQueued());
  }

  async setPublishStatus(collection: CmsCollection, recordIds: string[], status: PublishStatus): Promise<CmsRecord[]> {
    return this.mutate(collection, (engine) => engine.setPublishStatus(recordIds, status));
  }
}

/** `CmsBlobStore` that writes uploads under `CMS_DATA_DIR/uploads/<bucket>/<path>`, served by `GET /api/uploads/[...path]`. */
export class FileBlobStore implements CmsBlobStore {
  readonly name = "file";
  private readonly dir: string;

  constructor(options?: { dir?: string }) {
    this.dir = options?.dir ?? resolveDataDir();
  }

  async upload(input: { bucket: string; path: string; contentType: string; data: Buffer }): Promise<{ path: string; url: string }> {
    void input.contentType;
    const uploadsRoot = path.resolve(this.dir, "uploads", input.bucket);
    const target = path.resolve(uploadsRoot, input.path);

    // Defense in depth: `input.path` is server-generated (service.ts composes
    // it from the collection table name + a timestamp + a sanitized file
    // name), but refuse to write outside the bucket directory regardless.
    if (target !== uploadsRoot && !target.startsWith(uploadsRoot + path.sep)) {
      throw new Error(`Refusing to write upload outside its bucket directory: ${input.path}`);
    }

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.data);

    return { path: input.path, url: `/api/uploads/${input.bucket}/${input.path}` };
  }
}
