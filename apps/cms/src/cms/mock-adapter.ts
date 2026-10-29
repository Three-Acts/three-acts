import { collectionRegistry } from "./registry";
import { cloneSeedCollections } from "@three-acts/cms-schema/seed";
import { CmsError, canCreateRecords, hasPublishWorkflow, isReadOnlyField } from "./types";
import type {
  AssetUploadResult,
  CmsBackend,
  CmsCollection,
  CmsField,
  CmsRecord,
  CmsRecordValue,
  ListRecordsOptions,
  PublishStatus,
  SaveRecordOptions,
  SelectField
} from "./types";
import { normalizeDateTime } from "../lib/format";

function matchesAccept(file: File, accept?: string): boolean {
  const patterns = (accept ?? "")
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  const fileName = file.name.toLowerCase();
  const contentType = file.type.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return fileName.endsWith(pattern);
    if (pattern.endsWith("/*")) return contentType.startsWith(pattern.slice(0, -1));
    return contentType === pattern;
  });
}

/**
 * The mock backend serves a fresh deep clone of the shared "Fynbos & Fire"
 * seed (`@three-acts/cms-schema/seed`), so the CMS, the API memory store and
 * the web mock source all show the same realistic data. Edits live in memory
 * for the lifetime of the page.
 */
const records: Record<string, CmsRecord[]> = cloneSeedCollections();

function delay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

export const mockCmsBackend: CmsBackend = {
  name: "mock",

  data: {
    async listCollections() {
      return delay(
        collectionRegistry.map((collection) => {
          const collectionRecords = records[collection.id] ?? [];
          return {
            ...collection,
            count: collectionRecords.length,
            // Only collections with a publish workflow can carry queued records —
            // mirrors the same check in publishQueued.
            queuedCount: hasPublishWorkflow(collection)
              ? collectionRecords.filter((record) => record.publishStatus === "queued_to_publish").length
              : 0
          };
        })
      );
    },

    async listRecords(collectionId: string, options?: ListRecordsOptions) {
      const collection = getCollection(collectionId);
      const all = (records[collectionId] ?? []).map(cloneRecord);
      const query = options?.search?.trim().toLowerCase();
      const matching = query ? all.filter((record) => matchesSearch(collection, record, query)) : all;
      const sorted = options?.sort ? sortRecords(matching, options.sort) : matching;
      const total = sorted.length;
      const offset = options?.offset ?? 0;
      const page = options?.limit !== undefined ? sorted.slice(offset, offset + options.limit) : sorted.slice(offset);

      return delay({ records: page, total });
    },

    async getRecord(collectionId: string, recordId: string) {
      getCollection(collectionId);
      const record = records[collectionId]?.find((item) => item.id === recordId);

      if (!record) {
        throw new CmsError("not_found", `Unknown record: ${recordId}`);
      }

      return delay(cloneRecord(record));
    },

    async saveRecord(collectionId: string, record: CmsRecord, options?: SaveRecordOptions) {
      const collection = assertWritable(getCollection(collectionId));
      const collectionRecords = records[collectionId] ?? [];
      const index = collectionRecords.findIndex((item) => item.id === record.id);

      if (index < 0) {
        // Unshifting an unknown id would resurrect a record deleted elsewhere.
        // createRecord and importRecords are the only creation paths.
        throw new CmsError("not_found", `Unknown record: ${record.id}`);
      }

      const stored = collectionRecords[index];

      if (options?.expectedModifiedAt !== undefined && options.expectedModifiedAt !== stored.modifiedAt) {
        throw new CmsError("conflict", `${collection.label} record ${record.id} was changed elsewhere.`);
      }

      const values = { ...record.values };
      // `format: "json"` fields must be "" or valid JSON on every save — check
      // the incoming values before a read-only field's are overwritten below,
      // so a malformed submission is rejected rather than silently discarded.
      assertValidFormats(collection, values);

      // The site's system write path is the only one allowed to set a
      // read-only field's value; an editor save keeps whatever is already stored.
      for (const field of collection.fields) {
        if (isReadOnlyField(field)) {
          values[field.key] = stored.values[field.key];
        }
      }

      const nextRecord: CmsRecord = {
        ...cloneRecord(stored),
        ...resolveSavedStatus(collection, stored, record.publishStatus, values),
        values,
        modifiedAt: new Date().toISOString()
      };

      collectionRecords[index] = nextRecord;
      records[collectionId] = collectionRecords;
      return delay(cloneRecord(nextRecord), 220);
    },

    async createRecord(collectionId: string, values?: Partial<Record<string, CmsRecordValue>>) {
      const collection = assertCreatable(getCollection(collectionId));
      assertSingletonCapacity(collection, 1);
      const record = createEmptyRecord(collection);

      if (values) {
        record.values = { ...record.values, ...values };
      }

      assertValidFormats(collection, record.values);

      records[collectionId] = [record, ...(records[collectionId] ?? [])];
      return delay(cloneRecord(record), 160);
    },

    async deleteRecord(collectionId: string, recordId: string) {
      getCollection(collectionId);
      // Intentionally does NOT call assertWritable: readonly collections still
      // allow delete ("view, export, delete only" — see CollectionMode in types.ts).
      records[collectionId] = (records[collectionId] ?? []).filter((item) => item.id !== recordId);
      return delay(undefined, 160);
    },

    async importRecords(collectionId: string, rows: Array<Record<string, CmsRecordValue>>) {
      const collection = assertCreatable(getCollection(collectionId));
      assertSingletonCapacity(collection, rows.length);
      const imported = rows.map((row) => {
        const base = createEmptyRecord(collection, generateId(collection.id));
        const values = { ...base.values };

        for (const field of collection.fields) {
          // Readonly fields are system-generated ids: importing them would let a
          // re-imported export duplicate an existing record's id.
          if (field.type === "readonly") {
            continue;
          }

          if (field.key in row) {
            values[field.key] = coerceValue(field, row[field.key]);
          }
        }

        assertValidFormats(collection, values);

        return { ...base, values };
      });

      records[collectionId] = [...imported, ...(records[collectionId] ?? [])];
      return delay(imported.map(cloneRecord), 260);
    },

    async publishQueued(collectionId?: string) {
      const targets = collectionId ? [getCollection(collectionId)] : collectionRegistry;
      let published = 0;

      for (const collection of targets) {
        // Only collections with a publish workflow have anything to flip —
        // "data"/"readonly" collections never carry queued_to_publish records.
        if (!hasPublishWorkflow(collection)) {
          continue;
        }

        const collectionRecords = records[collection.id] ?? [];
        records[collection.id] = collectionRecords.map((record) => {
          if (record.publishStatus !== "queued_to_publish") {
            return record;
          }

          published += 1;
          // Promotion: the working values become the live snapshot the site renders.
          return {
            ...record,
            publishStatus: "published" as PublishStatus,
            liveValues: { ...record.values },
            modifiedAt: new Date().toISOString()
          };
        });
      }

      return delay({ published }, 200);
    },

    async setPublishStatus(collectionId: string, recordIds: string[], status: Exclude<PublishStatus, "published">) {
      const collection = assertWritable(getCollection(collectionId));

      if (!hasPublishWorkflow(collection)) {
        throw new CmsError("validation", `${collection.label} has no publish workflow.`);
      }

      if (status !== "queued_to_publish" && status !== "not_published") {
        throw new CmsError("validation", "publishStatus must be 'queued_to_publish' or 'not_published'.");
      }

      const idSet = new Set(recordIds);
      const now = new Date().toISOString();
      const updatedById = new Map<string, CmsRecord>();

      records[collectionId] = (records[collectionId] ?? []).map((record) => {
        if (!idSet.has(record.id)) {
          return record;
        }

        // Unpublishing takes the record off the site: its live snapshot goes too.
        const nextRecord: CmsRecord =
          status === "not_published"
            ? { ...record, publishStatus: status, liveValues: null, modifiedAt: now }
            : { ...record, publishStatus: status, modifiedAt: now };
        updatedById.set(record.id, nextRecord);
        return nextRecord;
      });

      const updated = recordIds.filter((id) => updatedById.has(id)).map((id) => cloneRecord(updatedById.get(id) as CmsRecord));

      return delay(updated, 200);
    }
  },

  storage: {
    async uploadAsset(collectionId: string, fieldKey: string, file: File) {
      const collection = assertWritable(getCollection(collectionId));
      const field = collection.fields.find((item) => item.key === fieldKey);

      if (!field || (field.type !== "asset" && field.type !== "image" && field.type !== "image-gallery" && field.type !== "video" && field.type !== "file")) {
        throw new CmsError("validation", `Field is not an asset field: ${fieldKey}`);
      }

      if ((field.type === "image" || field.type === "image-gallery") && file.type && !file.type.startsWith("image/")) {
        throw new CmsError("validation", `${field.label} only accepts images.`);
      }
      if (field.type === "video" && file.type && !file.type.startsWith("video/")) {
        throw new CmsError("validation", `${field.label} only accepts videos.`);
      }
      if ((field.type === "video" || field.type === "file") && !matchesAccept(file, field.accept)) {
        throw new CmsError("validation", `${field.label} does not accept this file type.`);
      }

      const bucket = (field as { bucket: string }).bucket;
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const result: AssetUploadResult = {
        path: `${bucket}/${collection.tableName}/${Date.now()}-${safeName}`,
        url: `/mock-storage/${bucket}/${collection.tableName}/${safeName}`,
        fileName: file.name,
        size: file.size
      };

      return delay(result, 260);
    }
  }
};

function cloneRecord(record: CmsRecord): CmsRecord {
  return { ...record, values: { ...record.values }, liveValues: record.liveValues ? { ...record.liveValues } : (record.liveValues ?? null) };
}

function areValuesEqual(a: Record<string, CmsRecordValue>, b: Record<string, CmsRecordValue>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? "") !== (b[key] ?? "")) {
      return false;
    }
  }
  return true;
}

/**
 * Publish model on save (see `PublishStatus`). Clients never set `published`
 * or `liveValues` directly:
 * - no publish workflow: status and (null) snapshot stay as stored.
 * - "not_published": off the site, the snapshot is cleared.
 * - "queued_to_publish": stays queued; the snapshot is kept until publishQueued promotes.
 * - otherwise ("published" echoed back, or "draft"): "published" when the values
 *   match the live snapshot, else "draft" (the site keeps the old snapshot).
 */
function resolveSavedStatus(
  collection: CmsCollection,
  stored: CmsRecord,
  requested: PublishStatus | undefined,
  values: Record<string, CmsRecordValue>
): Pick<CmsRecord, "publishStatus" | "liveValues"> {
  const liveValues = stored.liveValues ?? null;

  if (!hasPublishWorkflow(collection)) {
    return { publishStatus: stored.publishStatus, liveValues };
  }

  const status = requested ?? stored.publishStatus;

  if (status === "not_published") {
    return { publishStatus: "not_published", liveValues: null };
  }

  if (status === "queued_to_publish") {
    return { publishStatus: "queued_to_publish", liveValues };
  }

  if (liveValues && areValuesEqual(values, liveValues)) {
    return { publishStatus: "published", liveValues };
  }

  return { publishStatus: "draft", liveValues };
}

function getCollection(collectionId: string): CmsCollection {
  const collection = collectionRegistry.find((item) => item.id === collectionId);

  if (!collection) {
    throw new CmsError("not_found", `Unknown collection: ${collectionId}`);
  }

  return collection;
}

/** Enforce the collection contract: read-only collections reject editor writes. */
function assertWritable(collection: CmsCollection) {
  if (collection.mode === "readonly") {
    throw new CmsError("readonly", `${collection.label} is read-only: records are created by the site, not editors.`);
  }

  return collection;
}

/** Enforce record-source gating: only collections editors can create into accept a create or import. */
function assertCreatable(collection: CmsCollection): CmsCollection {
  if (!canCreateRecords(collection)) {
    throw new CmsError("forbidden", `${collection.label} records are created by the site, not the CMS.`);
  }

  return collection;
}

/** `format: "json"` fields must be "" or hold a valid JSON value (any shape) — same rule as `json-ld`, minus the object-shape requirement. */
function assertValidJsonFormat(field: CmsField, value: CmsRecordValue) {
  if ((field.type !== "text" && field.type !== "textarea") || (field as { format?: string }).format !== "json") {
    return;
  }

  const text = value === null || value === undefined ? "" : String(value);

  if (!text.trim()) {
    return;
  }

  try {
    JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
    throw new CmsError("validation", `${field.label} is not valid JSON${detail}.`, { details: { field: field.key } });
  }
}

function assertValidFormats(collection: CmsCollection, values: Record<string, CmsRecordValue>) {
  for (const field of collection.fields) {
    assertValidJsonFormat(field, values[field.key]);
  }
}

/** Mirrors the API: singleton collections (site settings) hold at most one record. */
function assertSingletonCapacity(collection: CmsCollection, incoming: number) {
  if (!collection.singleton || incoming === 0) {
    return;
  }

  const existing = (records[collection.id] ?? []).length;

  if (existing + incoming > 1) {
    throw new CmsError(
      "validation",
      existing > 0
        ? `${collection.label} already has a record. Edit the existing record instead of creating another.`
        : `${collection.label} holds a single record; import at most one row.`,
      { details: { singleton: true } }
    );
  }
}

/** Case-insensitive match over the record's display title and its string values. */
function matchesSearch(collection: CmsCollection, record: CmsRecord, query: string): boolean {
  const titleKey = collection.titleField ?? "name";
  const fallback = record.values.name || record.values.title || record.id;
  const title = String(record.values[titleKey] || fallback).toLowerCase();

  if (title.includes(query)) {
    return true;
  }

  return Object.values(record.values).some((value) => {
    if (typeof value === "boolean" || value === null || value === undefined) {
      return false;
    }

    return String(value).toLowerCase().includes(query);
  });
}

function fieldValue(record: CmsRecord, key: string): CmsRecordValue {
  if (key === "id" || key === "publishStatus" || key === "createdAt" || key === "modifiedAt") {
    return record[key];
  }

  return record.values[key];
}

function sortRecords(records: CmsRecord[], sort: { key: string; direction: "asc" | "desc" }): CmsRecord[] {
  const factor = sort.direction === "desc" ? -1 : 1;

  return [...records].sort((a, b) => {
    const aValue = fieldValue(a, sort.key);
    const bValue = fieldValue(b, sort.key);

    if ((aValue ?? null) === (bValue ?? null)) {
      return 0;
    }

    if (aValue === null || aValue === undefined) {
      return 1;
    }

    if (bValue === null || bValue === undefined) {
      return -1;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * factor;
    }

    return String(aValue).localeCompare(String(bValue)) * factor;
  });
}

let idCounter = 0;

/** crypto.randomUUID() when available; otherwise a monotonic counter + timestamp fallback. */
function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function createEmptyRecord(collection: CmsCollection, id = generateId(collection.id)): CmsRecord {
  const values = collection.fields.reduce<Record<string, CmsRecordValue>>((nextValues, field) => {
    if (field.type === "boolean") {
      nextValues[field.key] = false;
    } else if (field.type === "number") {
      nextValues[field.key] = 0;
    } else if (field.type === "readonly" && field.key.toLowerCase().includes("id")) {
      nextValues[field.key] = id;
    } else {
      nextValues[field.key] = "";
    }

    return nextValues;
  }, {});

  const now = new Date().toISOString();

  return {
    id,
    publishStatus: "not_published",
    createdAt: now,
    modifiedAt: now,
    values,
    liveValues: null
  };
}

function coerceValue(field: CmsField, value: CmsRecordValue): CmsRecordValue {
  if (value === null || value === undefined) {
    return value;
  }

  const text = String(value).trim();

  if (field.type === "boolean") {
    const normalized = text.toLowerCase();

    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }

    // Explicit falsy set: "no"/"false"/"0"/"" (and anything else unrecognized).
    return false;
  }

  if (field.type === "number") {
    // Strip thousands separators, currency symbols, and whitespace (e.g. "$1,234.50") before parsing.
    const cleaned = text.replace(/[^0-9.-]/g, "");
    const parsed = Number(cleaned);

    // Keep the original value so validation can catch it, rather than silently coercing to 0.
    return cleaned === "" || Number.isNaN(parsed) ? value : parsed;
  }

  if (field.type === "select") {
    const selectField = field as SelectField;
    const exactMatch = selectField.options.find((option) => option.value === text);

    if (exactMatch) {
      return exactMatch.value;
    }

    const lowered = text.toLowerCase();
    const looseMatch = selectField.options.find(
      (option) => option.value.toLowerCase() === lowered || option.label.toLowerCase() === lowered
    );

    return looseMatch ? looseMatch.value : value;
  }

  if (field.type === "datetime") {
    return normalizeDateTime(value);
  }

  return value;
}
