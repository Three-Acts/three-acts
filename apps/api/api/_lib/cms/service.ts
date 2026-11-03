import { preserveReadOnlyChildren, validateReferences, validateFieldValue, resolveFieldPath } from "@three-acts/cms-schema";
import {
  CmsError,
  MAX_ASSET_UPLOAD_BYTES,
  canCreateRecords,
  collectionRegistry,
  hasPublishWorkflow,
  isReadOnlyField,
  type AssetUploadResult,
  type CmsCollection,
  type CmsCollectionSummary,
  type CmsField,
  type CmsRecord,
  type CmsRecordValue,
  type ListRecordsOptions,
  type ListRecordsResult,
  type PublishStatus,
  type UploadAssetBody
} from "@three-acts/cms-schema";
import { getBlobStore, getDataStore } from "./resolve-store";

const MAX_IMPORT_ROWS = 1000;
const MAX_STATUS_RECORD_IDS = 1000;
const STATUS_TARGETS: ReadonlyArray<PublishStatus> = ["queued_to_publish", "not_published"];

function getCollectionOrThrow(collectionId: string): CmsCollection {
  const collection = collectionRegistry.find((item) => item.id === collectionId);
  if (!collection) {
    throw new CmsError("not_found", `Unknown collection: ${collectionId}`);
  }
  return collection;
}

/** Enforces the collection contract: readonly collections reject editor writes (delete is exempt — see deleteRecord). */
function assertWritable(collection: CmsCollection): CmsCollection {
  if (collection.mode === "readonly") {
    throw new CmsError("readonly", `${collection.label} is read-only: records are created by the site, not editors.`);
  }
  return collection;
}

/**
 * Rejects editor-initiated creation (New / Import / asset upload) of records
 * in a collection the site itself creates (`recordSource: "site"`, e.g.
 * orders and customers): inventing one from the CMS would fabricate
 * operational data. `readonly`-mode collections are already rejected earlier
 * by `assertWritable` with the "readonly" error, so this only fires for
 * `recordSource: "site"` collections editors can otherwise edit and delete.
 */
function assertCanCreate(collection: CmsCollection): CmsCollection {
  if (!canCreateRecords(collection)) {
    throw new CmsError("forbidden", `${collection.label} records are created by the site, not editors.`);
  }
  return collection;
}


function defaultValueForField(field: CmsField): CmsRecordValue {
  if (field.cardinality === "multiple") return "[]";
  if (field.type === "boolean") return false;
  if (field.type === "number") return 0;
  if (field.type === "image-gallery") return "[]";
  return "";
}

/** Preflight composed values and relationships before promoting any records. */
async function validateLinksForPublish(collection: CmsCollection, rawValues: Record<string, CmsRecordValue>): Promise<void> {
  const values = { ...rawValues };
  await validateReferences(collection.fields, values, async (collectionId, id) => {
    const target = collectionRegistry.find(item => item.id === collectionId);
    return Boolean(target && await getDataStore().getRecord(target, id));
  });
  for (const field of collection.fields) {
    if (field.type === "link" || field.type === "object" || field.type === "reference" || field.cardinality === "multiple") {
      values[field.key] = validateFieldValue(field, values[field.key], true);
    }
  }
}

/**
 * Builds a full, validated `values` map for a collection from client input,
 * falling back to `existingValues` (on save) or a type-appropriate default
 * (on create/import) for any field the client didn't send.
 *
 * Readonly fields (`isReadOnlyField`: `readOnly: true` or `type: "readonly"`)
 * are never accepted from an editor: their existing stored value is kept
 * as-is (or the field's default when there isn't one yet, e.g. on create).
 * Pass `allowReadOnlyInput: true` for the site's system write path
 * (`createSystemRecord`/`updateSystemRecord`), which is the only legitimate
 * way to set them.
 */
async function buildRecordValues(
  collection: CmsCollection,
  input: Partial<Record<string, CmsRecordValue>> | undefined,
  existingValues: Record<string, CmsRecordValue> | undefined,
  options: { enforceRequired?: boolean; allowReadOnlyInput?: boolean } = {}
): Promise<Record<string, CmsRecordValue>> {
  const { enforceRequired = false, allowReadOnlyInput = false } = options;
  const values: Record<string, CmsRecordValue> = {};

  for (const field of collection.fields) {
    if (isReadOnlyField(field) && !allowReadOnlyInput) {
      values[field.key] = existingValues?.[field.key] ?? defaultValueForField(field);
      continue;
    }

    const provided = Boolean(input && Object.prototype.hasOwnProperty.call(input, field.key));
    let raw: CmsRecordValue;

    if (provided) {
      raw = input![field.key];
    } else if (existingValues && Object.prototype.hasOwnProperty.call(existingValues, field.key)) {
      raw = existingValues[field.key];
    } else {
      raw = defaultValueForField(field);
    }

    values[field.key] = validateFieldValue(field, allowReadOnlyInput ? raw : preserveReadOnlyChildren(field, raw, existingValues?.[field.key]), enforceRequired);
  }

  await validateReferences(collection.fields, values, async (collectionId, id) => {
    const target = collectionRegistry.find(item => item.id === collectionId);
    return Boolean(target && await getDataStore().getRecord(target, id));
  });
  return values;
}

function isPublishStatus(value: unknown): value is PublishStatus {
  return value === "published" || value === "not_published" || value === "queued_to_publish";
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  return cleaned || "file";
}

function matchesAcceptMetadata(fileName: string, contentType: string, accept?: string): boolean {
  const patterns = (accept ?? "")
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;

  const lowerName = fileName.toLowerCase();
  const lowerType = contentType.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return lowerName.endsWith(pattern);
    if (pattern.endsWith("/*")) return lowerType.startsWith(pattern.slice(0, -1));
    return lowerType === pattern;
  });
}

export async function listCollections(): Promise<CmsCollectionSummary[]> {
  const store = getDataStore();
  return Promise.all(
    collectionRegistry.map(async (collection) => ({
      ...collection,
      count: await store.countRecords(collection),
      queuedCount: hasPublishWorkflow(collection)
        ? await store.countRecords(collection, { publishStatus: "queued_to_publish" })
        : 0
    }))
  );
}

export async function listRecords(collectionId: string, options: ListRecordsOptions): Promise<ListRecordsResult> {
  const collection = getCollectionOrThrow(collectionId);
  return getDataStore().listRecords(collection, options);
}

/**
 * Public read used by the static site build (`/api/content/*`): published
 * records of an editorial collection only. Collections without a publish
 * workflow (`data`, `readonly`) are reported as not found so operational and
 * system-generated records never leak through the unauthenticated route.
 */
export async function listPublishedRecords(collectionId: string, options: ListRecordsOptions): Promise<ListRecordsResult> {
  const collection = getCollectionOrThrow(collectionId);
  if (!hasPublishWorkflow(collection)) {
    throw new CmsError("not_found", `Unknown collection: ${collectionId}`);
  }
  const store = getDataStore();
  // Stores that track live snapshots serve those (so an unpublished draft
  // edit never reaches the site); the rest serve `published` records as-is.
  if (store.listLiveRecords) {
    return store.listLiveRecords(collection, { ...options, publishStatus: undefined });
  }
  return store.listRecords(collection, { ...options, publishStatus: "published" });
}

/** Alias for `listPublishedRecords`: what the live site renders for a collection, by its public name. */
export const listLiveRecords = listPublishedRecords;

/**
 * Internal convenience for callers that need every record matching a
 * predicate (e.g. the redirects route, or a future order-number lookup) —
 * loads the whole collection via the store with no `limit`, then filters
 * in-process. Not for editor-facing paginated listing; use `listRecords`.
 */
export async function findRecords(collectionId: string, predicate: (record: CmsRecord) => boolean): Promise<CmsRecord[]> {
  const collection = getCollectionOrThrow(collectionId);
  const { records } = await getDataStore().listRecords(collection, {});
  return records.filter(predicate);
}

export async function getRecord(collectionId: string, recordId: string): Promise<CmsRecord> {
  const collection = getCollectionOrThrow(collectionId);
  const record = await getDataStore().getRecord(collection, recordId);
  if (!record) {
    throw new CmsError("not_found", `Unknown record: ${recordId}`);
  }
  return record;
}

/**
 * Singleton collections (e.g. site settings) hold at most one record: reject
 * a create/import that would push the count past one.
 */
async function assertSingletonCapacity(collection: CmsCollection, incoming: number): Promise<void> {
  if (!collection.singleton || incoming === 0) return;
  const existing = await getDataStore().countRecords(collection);
  if (existing + incoming > 1) {
    // "validation" (not "conflict") so the editor shows this message instead
    // of the generic "changed elsewhere, reload" copy reserved for conflicts.
    throw new CmsError(
      "validation",
      existing > 0
        ? `${collection.label} already has a record. Edit the existing record instead of creating another.`
        : `${collection.label} holds a single record; import at most one row.`,
      { details: { singleton: true } }
    );
  }
}

export async function createRecord(collectionId: string, values?: Partial<Record<string, CmsRecordValue>>): Promise<CmsRecord> {
  const collection = assertCanCreate(assertWritable(getCollectionOrThrow(collectionId)));
  await assertSingletonCapacity(collection, 1);
  const normalizedValues = await buildRecordValues(collection, values, undefined);
  const [record] = await getDataStore().insertRecords(collection, [{ publishStatus: "not_published", values: normalizedValues }]);
  return record;
}

/**
 * The site's own write path (checkout, sign-up, form submissions): creates a
 * record bypassing `recordSource`/`readOnly` gating entirely — those gates
 * exist to stop editors from fabricating operational data, not to stop the
 * site from writing the data it owns. Field values are still validated, with
 * required fields enforced (a system create is always a complete record, not
 * an editor's in-progress draft).
 */
export async function createSystemRecord(
  collectionId: string,
  values: Partial<Record<string, CmsRecordValue>>,
  publishStatus: PublishStatus = "not_published"
): Promise<CmsRecord> {
  const collection = getCollectionOrThrow(collectionId);
  await assertSingletonCapacity(collection, 1);
  const normalizedValues = await buildRecordValues(collection, values, undefined, { enforceRequired: true, allowReadOnlyInput: true });
  const [record] = await getDataStore().insertRecords(collection, [{ publishStatus, values: normalizedValues }]);
  return record;
}

/**
 * The site's own write path for updating a record it already created (e.g.
 * decrementing inventory, aggregating a customer's order totals). Merges
 * `patch` over the record's stored values — untouched fields keep their
 * current value — bypassing `recordSource`/`readOnly` gating like
 * `createSystemRecord`, and leaves `publishStatus` untouched. Pass
 * `{ live: true }` for operational changes to a published record (inventory,
 * availability) so they land in the live snapshot too instead of creating a
 * draft the editor would have to publish.
 */
export async function updateSystemRecord(
  collectionId: string,
  recordId: string,
  patch: Partial<Record<string, CmsRecordValue>>,
  options: { live?: boolean } = {}
): Promise<CmsRecord> {
  const collection = getCollectionOrThrow(collectionId);
  const store = getDataStore();
  const existing = await store.getRecord(collection, recordId);
  if (!existing) {
    throw new CmsError("not_found", `Unknown record: ${recordId}`);
  }

  const normalizedValues = await buildRecordValues(collection, patch, existing.values, { enforceRequired: true, allowReadOnlyInput: true });
  const nextRecord: CmsRecord = {
    id: existing.id,
    publishStatus: existing.publishStatus,
    createdAt: existing.createdAt,
    modifiedAt: existing.modifiedAt,
    values: normalizedValues
  };

  // `live`: the patch is operational (stock, availability), not an editorial
  // draft — it must reach the live snapshot immediately so the public
  // catalogue and the next checkout see it, and it must not flip a published
  // record into a draft. Only the patched keys are pushed to the snapshot.
  const liveValuesPatch =
    options.live && hasPublishWorkflow(collection)
      ? Object.fromEntries(Object.keys(patch).filter((key) => key in normalizedValues).map((key) => [key, normalizedValues[key]]))
      : undefined;
  const result = await store.updateRecord(collection, nextRecord, undefined, liveValuesPatch ? { liveValuesPatch } : undefined);
  if (result === "conflict" || result === null) {
    throw new CmsError("not_found", `Unknown record: ${recordId}`);
  }
  return result;
}

export async function saveRecord(
  collectionId: string,
  recordId: string,
  record: CmsRecord,
  expectedModifiedAt?: string
): Promise<CmsRecord> {
  const collection = assertWritable(getCollectionOrThrow(collectionId));

  if (record.id !== undefined && record.id !== recordId) {
    throw new CmsError("validation", "record.id does not match the URL record id.");
  }

  const store = getDataStore();
  const existing = await store.getRecord(collection, recordId);
  if (!existing) {
    throw new CmsError("not_found", `Unknown record: ${recordId}`);
  }

  const publishStatus = isPublishStatus(record.publishStatus) ? record.publishStatus : existing.publishStatus;
  // Required fields gate publishing, not drafting.
  const enforceRequired = publishStatus === "published" || publishStatus === "queued_to_publish";
  const normalizedValues = await buildRecordValues(collection, record.values, existing.values, { enforceRequired });

  const nextRecord: CmsRecord = {
    id: existing.id,
    publishStatus,
    createdAt: existing.createdAt,
    modifiedAt: existing.modifiedAt,
    values: normalizedValues
  };

  const result = await store.updateRecord(collection, nextRecord, expectedModifiedAt);

  if (result === "conflict") {
    throw new CmsError("conflict", "This record was changed elsewhere. Reload and try again.");
  }
  if (result === null) {
    throw new CmsError("not_found", `Unknown record: ${recordId}`);
  }
  return result;
}

export async function deleteRecord(collectionId: string, recordId: string): Promise<void> {
  const collection = getCollectionOrThrow(collectionId);
  // Intentionally not gated by assertWritable: readonly collections still
  // allow delete ("view, export, delete only" — see CollectionMode in types.ts).
  const deleted = await getDataStore().deleteRecord(collection, recordId);
  if (!deleted) {
    throw new CmsError("not_found", `Unknown record: ${recordId}`);
  }
}

export async function importRecords(collectionId: string, rows: Array<Record<string, CmsRecordValue>>): Promise<CmsRecord[]> {
  const collection = assertCanCreate(assertWritable(getCollectionOrThrow(collectionId)));

  if (!Array.isArray(rows)) {
    throw new CmsError("validation", "rows must be an array.");
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new CmsError("validation", `Import is limited to ${MAX_IMPORT_ROWS} rows per request.`);
  }

  await assertSingletonCapacity(collection, rows.length);

  const prepared = await Promise.all(rows.map(async (row) => ({
    publishStatus: "not_published" as const,
    values: await buildRecordValues(collection, row, undefined)
  })));

  return getDataStore().insertRecords(collection, prepared);
}

export async function uploadAsset(collectionId: string, fieldKey: string, body: UploadAssetBody): Promise<AssetUploadResult> {
  const collection = assertCanCreate(assertWritable(getCollectionOrThrow(collectionId)));
  const field = resolveFieldPath(collection.fields, fieldKey);

  // Uploads serve generic files (`asset`) as well as typed singles:
  // `image`, `video`, `file`, and opted-in link fields, plus per-item gallery uploads
  // (`image-gallery`). The stored record value stays a URL/JSON string the
  // caller composes — no blob deletes happen here.
  if (!field || (field.type !== "asset" && field.type !== "image" && field.type !== "image-gallery" && field.type !== "video" && field.type !== "file" && (field.type !== "link" || !field.bucket))) {
    throw new CmsError("not_found", `Unknown asset field: ${fieldKey}`);
  }
  const bucket = (field as { bucket: string }).bucket;

  if (!body || typeof body.fileName !== "string" || !body.fileName.trim()) {
    throw new CmsError("validation", "fileName is required.");
  }
  if (typeof body.size !== "number" || !Number.isFinite(body.size) || body.size <= 0) {
    throw new CmsError("validation", "size must be a positive number.");
  }
  if (
    (field.type === "image" || field.type === "image-gallery") &&
    (typeof body.contentType !== "string" || !body.contentType.startsWith("image/"))
  ) {
    throw new CmsError("validation", `${field.label} only accepts images.`);
  }
  if (field.type === "video" && (typeof body.contentType !== "string" || !body.contentType.startsWith("video/"))) {
    throw new CmsError("validation", `${field.label} only accepts videos.`);
  }
  if (
    (field.type === "video" || field.type === "file" || field.type === "link") &&
    !matchesAcceptMetadata(body.fileName, typeof body.contentType === "string" ? body.contentType : "", field.accept)
  ) {
    throw new CmsError("validation", `${field.label} does not accept this file type.`);
  }
  if (body.size > MAX_ASSET_UPLOAD_BYTES) {
    throw new CmsError("validation", `File exceeds the ${MAX_ASSET_UPLOAD_BYTES} byte upload limit.`);
  }
  if (typeof body.data !== "string" || !body.data) {
    throw new CmsError("validation", "data is required.");
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(body.data, "base64");
  } catch {
    throw new CmsError("validation", "data must be base64-encoded.");
  }

  if (buffer.length === 0 || buffer.length > MAX_ASSET_UPLOAD_BYTES) {
    throw new CmsError("validation", `File exceeds the ${MAX_ASSET_UPLOAD_BYTES} byte upload limit.`);
  }

  const safeName = sanitizeFileName(body.fileName);
  const path = `${collection.tableName}/${Date.now()}-${safeName}`;
  const contentType = typeof body.contentType === "string" && body.contentType ? body.contentType : "application/octet-stream";

  const uploaded = await getBlobStore().upload({ bucket, path, contentType, data: buffer });

  return { path: uploaded.path, url: uploaded.url, fileName: body.fileName, size: buffer.length };
}

export async function publishQueued(collectionId?: string): Promise<{ published: number }> {
  const collections = collectionId ? [getCollectionOrThrow(collectionId)] : collectionRegistry;
  const store = getDataStore();

  // Preflight every collection before any store promotes records, keeping a
  // multi-collection publish atomic with respect to Link validation failures.
  for (const collection of collections) {
    if (!hasPublishWorkflow(collection)) continue;
    const { records } = await store.listRecords(collection, { publishStatus: "queued_to_publish" });
    for (const record of records) await validateLinksForPublish(collection, record.values);
  }

  let published = 0;
  for (const collection of collections) {
    published += await store.publishQueued(collection);
  }

  return { published };
}

/**
 * Bulk status override for the selection toolbar ("Update items"). Only
 * `queued_to_publish` and `not_published` are valid targets — `published` is
 * reached solely through `publishQueued` + a site deploy — and only
 * collections with a publish workflow can be queued at all.
 */
export async function setPublishStatus(collectionId: string, recordIds: string[], status: PublishStatus): Promise<CmsRecord[]> {
  const collection = assertWritable(getCollectionOrThrow(collectionId));

  if (!Array.isArray(recordIds) || recordIds.length === 0 || !recordIds.every((id) => typeof id === "string")) {
    throw new CmsError("validation", "recordIds must be a non-empty array of strings.");
  }
  if (recordIds.length > MAX_STATUS_RECORD_IDS) {
    throw new CmsError("validation", `Status updates are limited to ${MAX_STATUS_RECORD_IDS} records per request.`);
  }

  if (status === "published") {
    throw new CmsError(
      "validation",
      "Records are published by running publishQueued and deploying the site, not by setting status directly. Use 'queued_to_publish' to queue them first."
    );
  }
  if (!STATUS_TARGETS.includes(status)) {
    throw new CmsError("validation", "publishStatus must be 'queued_to_publish' or 'not_published'.");
  }

  if (!hasPublishWorkflow(collection)) {
    throw new CmsError("validation", `${collection.label} has no publish workflow.`);
  }

  const store = getDataStore();
  if (status === "queued_to_publish") {
    // Validate the whole selected set before the adapter changes any statuses.
    for (const recordId of new Set(recordIds)) {
      const record = await store.getRecord(collection, recordId);
      if (record) await validateLinksForPublish(collection, record.values);
    }
  }

  return store.setPublishStatus(collection, recordIds, status);
}
