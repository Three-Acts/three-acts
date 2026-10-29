import { randomUUID } from "node:crypto";
import { hasPublishWorkflow } from "@three-acts/cms-schema";
import type { CmsCollection, CmsRecord, CmsRecordValue, ListRecordsOptions, ListRecordsResult, PublishStatus } from "@three-acts/cms-schema";

/** Field types whose values are matched against a free-text search term. */
const SEARCHABLE_FIELD_TYPES = new Set(["text", "textarea", "slug"]);

/** Statuses whose live snapshot is on the site (a draft or queued record keeps serving its last published snapshot). */
const LIVE_STATUSES = new Set<PublishStatus>(["published", "draft", "queued_to_publish"]);

export function cloneRecord(record: CmsRecord): CmsRecord {
  return { ...record, values: { ...record.values }, liveValues: record.liveValues ? { ...record.liveValues } : null };
}

function areValuesEqual(a: Record<string, CmsRecordValue>, b: Record<string, CmsRecordValue>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? "") !== (b[key] ?? "")) return false;
  }
  return true;
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
 * In-memory query/mutation engine for a single collection's records: search,
 * sort, paginate, the publish/live-snapshot model, id/timestamp stamping.
 *
 * Shared by `MemoryDataStore` and `FileDataStore` so this record logic is
 * written once instead of copy-pasted between them. The engine operates
 * directly on the `records` array passed into the constructor (mutating it in
 * place via `unshift`/`splice`/index-assignment), so a caller that keeps its
 * own reference to that same array — e.g. to persist it to disk — observes
 * every change without the engine needing to know about persistence at all.
 * `onChange` fires synchronously after any call that actually mutated the
 * array, before the mutating method returns.
 */
export class RecordCollectionEngine {
  constructor(
    private readonly collection: CmsCollection,
    private readonly records: CmsRecord[],
    private readonly onChange?: () => void
  ) {}

  list(options: ListRecordsOptions): ListRecordsResult {
    return this.query(this.records.map(cloneRecord), options);
  }

  /**
   * What the live site renders: editorial records that have a live snapshot
   * (published, or a draft/queued edit of a published record), with `values`
   * replaced by that snapshot so unpublished working values never leak.
   */
  listLive(options: ListRecordsOptions): ListRecordsResult {
    if (!hasPublishWorkflow(this.collection)) {
      return { records: [], total: 0 };
    }
    const live = this.records
      .filter((record) => LIVE_STATUSES.has(record.publishStatus) && record.liveValues)
      .map(({ liveValues, ...record }): CmsRecord => ({ ...record, values: { ...(liveValues ?? {}) } }));
    return this.query(live, { ...options, publishStatus: undefined });
  }

  private query(input: CmsRecord[], options: ListRecordsOptions): ListRecordsResult {
    let records = input;

    if (options.publishStatus) {
      records = records.filter((record) => record.publishStatus === options.publishStatus);
    }

    if (options.search) {
      const term = options.search.toLowerCase();
      const searchableKeys = this.collection.fields.filter((field) => SEARCHABLE_FIELD_TYPES.has(field.type)).map((field) => field.key);
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

  count(filter?: { publishStatus?: PublishStatus }): number {
    if (!filter?.publishStatus) {
      return this.records.length;
    }
    return this.records.filter((record) => record.publishStatus === filter.publishStatus).length;
  }

  get(recordId: string): CmsRecord | null {
    const record = this.records.find((item) => item.id === recordId);
    return record ? cloneRecord(record) : null;
  }

  insert(rows: Array<{ publishStatus: PublishStatus; values: Record<string, CmsRecordValue> }>): CmsRecord[] {
    const now = new Date().toISOString();
    const inserted = rows.map(
      (row): CmsRecord => ({
        id: randomUUID(),
        publishStatus: row.publishStatus,
        createdAt: now,
        modifiedAt: now,
        values: { ...row.values },
        liveValues: null
      })
    );

    this.records.unshift(...inserted);
    this.onChange?.();
    return inserted.map(cloneRecord);
  }

  update(record: CmsRecord, expectedModifiedAt?: string, liveValuesPatch?: Record<string, CmsRecordValue>): CmsRecord | "conflict" | null {
    const index = this.records.findIndex((item) => item.id === record.id);

    if (index < 0) {
      return null;
    }

    if (expectedModifiedAt !== undefined && this.records[index].modifiedAt !== expectedModifiedAt) {
      return "conflict";
    }

    const stored = this.records[index];
    // A live patch (site-driven stock changes) lands in the snapshot too, so
    // the publish model below compares against the patched snapshot and a
    // published record whose only change is that patch stays published.
    const base = liveValuesPatch && stored.liveValues ? { ...stored, liveValues: { ...stored.liveValues, ...liveValuesPatch } } : stored;
    const updated: CmsRecord = {
      ...cloneRecord(record),
      ...this.resolveSnapshot(base, record),
      modifiedAt: new Date().toISOString()
    };
    this.records[index] = updated;
    this.onChange?.();
    return cloneRecord(updated);
  }

  /**
   * Publish model on save: the stored snapshot is kept, `not_published` clears
   * it, and a `published` record whose values no longer match its snapshot
   * becomes a `draft`.
   */
  private resolveSnapshot(stored: CmsRecord, next: CmsRecord): Pick<CmsRecord, "publishStatus" | "liveValues"> {
    const liveValues = stored.liveValues ?? null;
    if (!hasPublishWorkflow(this.collection)) {
      return { publishStatus: stored.publishStatus, liveValues: null };
    }
    if (next.publishStatus === "not_published") {
      return { publishStatus: "not_published", liveValues: null };
    }
    if (next.publishStatus === "published" && !(liveValues && areValuesEqual(next.values, liveValues))) {
      return { publishStatus: "draft", liveValues };
    }
    if (next.publishStatus === "draft" && liveValues && areValuesEqual(next.values, liveValues)) {
      return { publishStatus: "published", liveValues };
    }
    return { publishStatus: next.publishStatus, liveValues };
  }

  delete(recordId: string): boolean {
    const index = this.records.findIndex((item) => item.id === recordId);
    if (index < 0) {
      return false;
    }
    this.records.splice(index, 1);
    this.onChange?.();
    return true;
  }

  publishQueued(): number {
    let count = 0;

    for (const record of this.records) {
      if (record.publishStatus === "queued_to_publish") {
        record.publishStatus = "published";
        record.liveValues = { ...record.values };
        record.modifiedAt = new Date().toISOString();
        count += 1;
      }
    }

    if (count > 0) {
      this.onChange?.();
    }
    return count;
  }

  setPublishStatus(recordIds: string[], status: PublishStatus): CmsRecord[] {
    const byId = new Map(this.records.map((record) => [record.id, record]));
    const now = new Date().toISOString();
    const updated: CmsRecord[] = [];

    for (const id of recordIds) {
      const record = byId.get(id);
      if (!record) {
        continue;
      }
      record.publishStatus = status;
      if (status === "not_published") {
        record.liveValues = null;
      }
      record.modifiedAt = now;
      updated.push(cloneRecord(record));
    }

    if (updated.length > 0) {
      this.onChange?.();
    }
    return updated;
  }
}
