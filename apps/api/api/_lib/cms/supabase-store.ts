import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CmsError,
  columnForField,
  systemColumnsFor,
  type CmsCollection,
  type CmsField,
  type CmsRecord,
  type CmsRecordValue,
  type ListRecordsOptions,
  type ListRecordsResult,
  type PublishStatus
} from "@three-acts/cms-schema";
import { getServiceClient } from "../supabase";
import type { CmsBlobStore, CmsDataStore } from "./store";

/** Field types whose backing column is free text and safe to `ilike` search over. */
const SEARCHABLE_FIELD_TYPES = new Set<CmsField["type"]>(["text", "textarea", "slug"]);

function requireClient(): SupabaseClient {
  const client = getServiceClient();
  if (!client) {
    throw new CmsError("unavailable", "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return client;
}

function searchableColumns(collection: CmsCollection): string[] {
  return collection.fields
    .filter((field) => SEARCHABLE_FIELD_TYPES.has(field.type))
    .map((field) => columnForField(collection, field));
}

function resolveSortColumn(collection: CmsCollection, key: string): string {
  const sys = systemColumnsFor(collection);

  switch (key) {
    case "id":
      return sys.id;
    case "publishStatus":
      return sys.publishStatus;
    case "createdAt":
      return sys.createdAt;
    case "modifiedAt":
      return sys.modifiedAt;
    default: {
      const field = collection.fields.find((item) => item.key === key);
      return field ? columnForField(collection, field) : sys.modifiedAt;
    }
  }
}

/** Escapes ILIKE's own wildcard and the `.or()` filter separator so user input is matched literally. */
function escapeSearchTerm(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/,/g, "\\,");
}

function toRecordValue(field: CmsField, raw: unknown): CmsRecordValue {
  if (raw === null || raw === undefined) {
    if (field.type === "boolean") return false;
    if (field.type === "number") return 0;
    return "";
  }

  if (field.type === "number") {
    return typeof raw === "number" ? raw : Number(raw);
  }

  if (field.type === "boolean") {
    return Boolean(raw);
  }

  // Datetimes come back from Supabase already as ISO strings; everything else
  // (text/textarea/slug/select/asset/readonly) is stored as plain text.
  return String(raw);
}

function toIsoString(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }
  if (raw instanceof Date) {
    return raw.toISOString();
  }
  return new Date().toISOString();
}

function mapRowToRecord(collection: CmsCollection, row: Record<string, unknown>): CmsRecord {
  const sys = systemColumnsFor(collection);
  const values: Record<string, CmsRecordValue> = {};

  for (const field of collection.fields) {
    const column = columnForField(collection, field);
    values[field.key] = toRecordValue(field, row[column]);
  }

  return {
    id: String(row[sys.id]),
    publishStatus: (row[sys.publishStatus] as PublishStatus | undefined) ?? "not_published",
    createdAt: toIsoString(row[sys.createdAt]),
    modifiedAt: toIsoString(row[sys.modifiedAt]),
    values
  };
}

function mapRecordToRow(collection: CmsCollection, values: Record<string, CmsRecordValue>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const field of collection.fields) {
    const column = columnForField(collection, field);
    const value = values[field.key];
    row[column] = value === undefined ? null : value;
  }

  return row;
}

/** `CmsDataStore` backed by a Supabase/Postgres table per collection (see scripts/print-schema.ts). */
export class SupabaseDataStore implements CmsDataStore {
  readonly name = "supabase";

  async listRecords(collection: CmsCollection, options: ListRecordsOptions): Promise<ListRecordsResult> {
    const client = requireClient();
    const sys = systemColumnsFor(collection);

    let query = client.from(collection.tableName).select("*", { count: "exact" });

    if (options.publishStatus) {
      query = query.eq(sys.publishStatus, options.publishStatus);
    }

    if (options.search) {
      const columns = searchableColumns(collection);
      if (columns.length > 0) {
        const term = escapeSearchTerm(options.search);
        query = query.or(columns.map((column) => `${column}.ilike.%${term}%`).join(","));
      }
    }

    const sortColumn = options.sort ? resolveSortColumn(collection, options.sort.key) : sys.modifiedAt;
    const ascending = options.sort?.direction === "asc";
    query = query.order(sortColumn, { ascending });

    if (options.limit !== undefined) {
      const offset = options.offset ?? 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      throw error;
    }

    return {
      records: (data ?? []).map((row: Record<string, unknown>) => mapRowToRecord(collection, row)),
      total: count ?? 0
    };
  }

  async countRecords(collection: CmsCollection, filter?: { publishStatus?: PublishStatus }): Promise<number> {
    const client = requireClient();
    const sys = systemColumnsFor(collection);
    let query = client.from(collection.tableName).select("*", { count: "exact", head: true });
    if (filter?.publishStatus) {
      query = query.eq(sys.publishStatus, filter.publishStatus);
    }
    const { count, error } = await query;
    if (error) {
      throw error;
    }
    return count ?? 0;
  }

  async getRecord(collection: CmsCollection, recordId: string): Promise<CmsRecord | null> {
    const client = requireClient();
    const sys = systemColumnsFor(collection);
    const { data, error } = await client.from(collection.tableName).select("*").eq(sys.id, recordId).maybeSingle();
    if (error) {
      throw error;
    }
    return data ? mapRowToRecord(collection, data as Record<string, unknown>) : null;
  }

  async insertRecords(
    collection: CmsCollection,
    rows: Array<{ publishStatus: PublishStatus; values: Record<string, CmsRecordValue> }>
  ): Promise<CmsRecord[]> {
    const client = requireClient();
    const sys = systemColumnsFor(collection);
    const now = new Date().toISOString();

    const payload = rows.map((row) => ({
      ...mapRecordToRow(collection, row.values),
      [sys.publishStatus]: row.publishStatus,
      [sys.createdAt]: now,
      [sys.modifiedAt]: now
    }));

    const { data, error } = await client.from(collection.tableName).insert(payload).select("*");
    if (error) {
      throw error;
    }

    return (data ?? []).map((row: Record<string, unknown>) => mapRowToRecord(collection, row));
  }

  async updateRecord(collection: CmsCollection, record: CmsRecord, expectedModifiedAt?: string): Promise<CmsRecord | "conflict" | null> {
    const client = requireClient();
    const sys = systemColumnsFor(collection);
    const now = new Date().toISOString();

    const payload: Record<string, unknown> = {
      ...mapRecordToRow(collection, record.values),
      [sys.publishStatus]: record.publishStatus,
      [sys.modifiedAt]: now
    };

    let query = client.from(collection.tableName).update(payload).eq(sys.id, record.id);
    if (expectedModifiedAt !== undefined) {
      query = query.eq(sys.modifiedAt, expectedModifiedAt);
    }

    const { data, error } = await query.select("*");
    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      return mapRowToRecord(collection, data[0] as Record<string, unknown>);
    }

    // Zero rows updated: either the record doesn't exist, or (when checking
    // expectedModifiedAt) it exists but was modified since the caller last read it.
    const stillExists = await this.getRecord(collection, record.id);
    return stillExists ? "conflict" : null;
  }

  async deleteRecord(collection: CmsCollection, recordId: string): Promise<boolean> {
    const client = requireClient();
    const sys = systemColumnsFor(collection);
    const { data, error } = await client.from(collection.tableName).delete().eq(sys.id, recordId).select(sys.id);
    if (error) {
      throw error;
    }
    return (data?.length ?? 0) > 0;
  }

  async publishQueued(collection: CmsCollection): Promise<number> {
    const client = requireClient();
    const sys = systemColumnsFor(collection);
    const publishedStatus: PublishStatus = "published";
    const queuedStatus: PublishStatus = "queued_to_publish";

    const { data, error } = await client
      .from(collection.tableName)
      .update({ [sys.publishStatus]: publishedStatus })
      .eq(sys.publishStatus, queuedStatus)
      .select(sys.id);
    if (error) {
      throw error;
    }
    return data?.length ?? 0;
  }

  async setPublishStatus(collection: CmsCollection, recordIds: string[], status: PublishStatus): Promise<CmsRecord[]> {
    const client = requireClient();
    const sys = systemColumnsFor(collection);
    const now = new Date().toISOString();

    const { data, error } = await client
      .from(collection.tableName)
      .update({ [sys.publishStatus]: status, [sys.modifiedAt]: now })
      .in(sys.id, recordIds)
      .select("*");
    if (error) {
      throw error;
    }

    const records = (data ?? []).map((row: Record<string, unknown>) => mapRowToRecord(collection, row));
    const byId = new Map(records.map((record) => [record.id, record]));
    return recordIds.map((id) => byId.get(id)).filter((record): record is CmsRecord => Boolean(record));
  }
}

/** `CmsBlobStore` backed by Supabase Storage. */
export class SupabaseBlobStore implements CmsBlobStore {
  readonly name = "supabase";

  async upload(input: { bucket: string; path: string; contentType: string; data: Buffer }): Promise<{ path: string; url: string }> {
    const client = requireClient();
    const { error } = await client.storage.from(input.bucket).upload(input.path, input.data, {
      contentType: input.contentType,
      upsert: false
    });

    if (error) {
      throw error;
    }

    const { data } = client.storage.from(input.bucket).getPublicUrl(input.path);
    return { path: input.path, url: data.publicUrl };
  }
}
