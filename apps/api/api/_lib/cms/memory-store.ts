import { randomUUID } from "node:crypto";
import type { CmsCollection, CmsRecord, CmsRecordValue, ListRecordsOptions, ListRecordsResult, PublishStatus } from "@three-acts/cms-schema";
import type { CmsBlobStore, CmsDataStore } from "./store";

/** Field types whose values are matched against a free-text search term. */
const SEARCHABLE_FIELD_TYPES = new Set(["text", "textarea", "slug"]);

function cloneRecord(record: CmsRecord): CmsRecord {
  return { ...record, values: { ...record.values } };
}

function getSortValue(record: CmsRecord, key: string): CmsRecordValue {
  switch (key) {
    case "id":
      return record.id;
    case "publishStatus":
      return record.publishStatus;
    case "createdAt":
      return record.createdAt;
    case "modifiedAt":
      return record.modifiedAt;
    default:
      return record.values[key];
  }
}

function compareValues(a: CmsRecordValue, b: CmsRecordValue): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1;
  return String(a).localeCompare(String(b));
}

/**
 * In-process `CmsDataStore`/`CmsBlobStore` for local dev without Supabase.
 *
 * Dev-only: state lives in a module-level Map for the lifetime of this
 * process. On Vercel, each invocation may run in a fresh process/container
 * with no shared memory, so this store must never be selected in production —
 * `resolve-store.ts` only falls back to it when Supabase isn't configured,
 * which in practice means local/dev environments.
 */
export class MemoryDataStore implements CmsDataStore {
  readonly name = "memory";
  private readonly collections = new Map<string, CmsRecord[]>();

  private recordsFor(collectionId: string): CmsRecord[] {
    let records = this.collections.get(collectionId);
    if (!records) {
      records = [];
      this.collections.set(collectionId, records);
    }
    return records;
  }

  async listRecords(collection: CmsCollection, options: ListRecordsOptions): Promise<ListRecordsResult> {
    let records = this.recordsFor(collection.id).map(cloneRecord);

    if (options.publishStatus) {
      records = records.filter((record) => record.publishStatus === options.publishStatus);
    }

    if (options.search) {
      const term = options.search.toLowerCase();
      const searchableKeys = collection.fields.filter((field) => SEARCHABLE_FIELD_TYPES.has(field.type)).map((field) => field.key);
      records = records.filter((record) => searchableKeys.some((key) => String(record.values[key] ?? "").toLowerCase().includes(term)));
    }

    const sortKey = options.sort?.key ?? "modifiedAt";
    const direction = options.sort?.direction === "asc" ? 1 : -1;
    records.sort((a, b) => compareValues(getSortValue(a, sortKey), getSortValue(b, sortKey)) * direction);

    const total = records.length;
    const offset = options.offset ?? 0;
    const page = options.limit !== undefined ? records.slice(offset, offset + options.limit) : records.slice(offset);

    return { records: page, total };
  }

  async countRecords(collection: CmsCollection, filter?: { publishStatus?: PublishStatus }): Promise<number> {
    const records = this.recordsFor(collection.id);
    if (!filter?.publishStatus) {
      return records.length;
    }
    return records.filter((record) => record.publishStatus === filter.publishStatus).length;
  }

  async getRecord(collection: CmsCollection, recordId: string): Promise<CmsRecord | null> {
    const record = this.recordsFor(collection.id).find((item) => item.id === recordId);
    return record ? cloneRecord(record) : null;
  }

  async insertRecords(
    collection: CmsCollection,
    rows: Array<{ publishStatus: PublishStatus; values: Record<string, CmsRecordValue> }>
  ): Promise<CmsRecord[]> {
    const now = new Date().toISOString();
    const inserted = rows.map(
      (row): CmsRecord => ({
        id: randomUUID(),
        publishStatus: row.publishStatus,
        createdAt: now,
        modifiedAt: now,
        values: { ...row.values }
      })
    );

    this.recordsFor(collection.id).unshift(...inserted);
    return inserted.map(cloneRecord);
  }

  async updateRecord(collection: CmsCollection, record: CmsRecord, expectedModifiedAt?: string): Promise<CmsRecord | "conflict" | null> {
    const records = this.recordsFor(collection.id);
    const index = records.findIndex((item) => item.id === record.id);

    if (index < 0) {
      return null;
    }

    if (expectedModifiedAt !== undefined && records[index].modifiedAt !== expectedModifiedAt) {
      return "conflict";
    }

    const updated: CmsRecord = { ...cloneRecord(record), modifiedAt: new Date().toISOString() };
    records[index] = updated;
    return cloneRecord(updated);
  }

  async deleteRecord(collection: CmsCollection, recordId: string): Promise<boolean> {
    const records = this.recordsFor(collection.id);
    const index = records.findIndex((item) => item.id === recordId);
    if (index < 0) {
      return false;
    }
    records.splice(index, 1);
    return true;
  }

  async publishQueued(collection: CmsCollection): Promise<number> {
    const records = this.recordsFor(collection.id);
    let count = 0;

    for (const record of records) {
      if (record.publishStatus === "queued_to_publish") {
        record.publishStatus = "published";
        record.modifiedAt = new Date().toISOString();
        count += 1;
      }
    }

    return count;
  }

  async setPublishStatus(collection: CmsCollection, recordIds: string[], status: PublishStatus): Promise<CmsRecord[]> {
    const records = this.recordsFor(collection.id);
    const byId = new Map(records.map((record) => [record.id, record]));
    const now = new Date().toISOString();
    const updated: CmsRecord[] = [];

    for (const id of recordIds) {
      const record = byId.get(id);
      if (!record) {
        continue;
      }
      record.publishStatus = status;
      record.modifiedAt = now;
      updated.push(cloneRecord(record));
    }

    return updated;
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
