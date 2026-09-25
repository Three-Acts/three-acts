export type PublishStatus = "published" | "not_published" | "queued_to_publish";

/**
 * How editors work with a collection's records (mirrors Webflow's split
 * between CMS items and form submissions):
 * - "editorial": site content with a publish workflow — status + publish controls.
 * - "data": editable operational records with no publish workflow (flags, redirects).
 * - "readonly": system-generated records (form submissions) — view, export, delete only.
 */
export type CollectionMode = "editorial" | "data" | "readonly";

export type FieldType =
  | "text"
  | "slug"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "datetime"
  | "asset"
  | "image"
  | "image-gallery"
  | "readonly";

export type CmsRecordValue = string | number | boolean | null | undefined;

export type CmsRecord = {
  id: string;
  publishStatus: PublishStatus;
  createdAt: string;
  modifiedAt: string;
  values: Record<string, CmsRecordValue>;
};

export type SelectOption = {
  label: string;
  value: string;
};

type FieldBase<TType extends FieldType> = {
  key: string;
  label: string;
  type: TType;
  required?: boolean;
  helpText?: string;
  /**
   * Enforce uniqueness of this field's value across the collection (ignoring
   * empty values). `slug` fields default to unique; set `unique: false` to opt
   * out. Realised as a partial unique index by the schema tooling.
   */
  unique?: boolean;
  /**
   * Backing column name when it differs from `key`. Adapters fall back to the
   * collection's `columnNaming` strategy (default: snake_case of `key`).
   */
  column?: string;
};

export type PrimitiveField = FieldBase<Exclude<FieldType, "select" | "slug" | "asset" | "image" | "image-gallery">>;

export type SelectField = FieldBase<"select"> & {
  type: "select";
  options: SelectOption[];
};

export type SlugField = FieldBase<"slug"> & {
  type: "slug";
  urlPrefix?: string;
};

export type AssetField = FieldBase<"asset"> & {
  type: "asset";
  bucket: string;
  accept?: string;
};

/**
 * Single typed image: uploads to the Blob Store like an Asset Field but the
 * record stores an `ImageValue` JSON string (see `./images`) instead of a
 * bare URL, so filename, dimensions, and alt text survive the round trip.
 */
export type ImageField = FieldBase<"image"> & {
  type: "image";
  bucket: string;
  accept?: string;
};

/**
 * Ordered gallery of typed images, stored as an `ImageValue[]` JSON string.
 * `minItems`/`maxItems` are publish-time rules (like `required`), not
 * draft-time ones — see the API service's `validateFieldValue`.
 */
export type ImageGalleryField = FieldBase<"image-gallery"> & {
  type: "image-gallery";
  bucket: string;
  accept?: string;
  minItems?: number;
  maxItems?: number;
};

export type CmsField = PrimitiveField | SelectField | SlugField | AssetField | ImageField | ImageGalleryField;

export type ListColumn = {
  key: string;
  label: string;
  width?: string;
  valueType?: "text" | "status" | "datetime" | "boolean" | "asset" | "image";
};

export type CmsCollection = {
  id: string;
  label: string;
  tableName: string;
  /** Defaults to "editorial" when omitted. */
  mode?: CollectionMode;
  group?: string;
  titleField?: string;
  description?: string;
  fields: CmsField[];
  listColumns: ListColumn[];
  /**
   * How record-level system fields map onto the backing table. Every value is
   * optional; adapters default to `id`, `publish_status`, `created_at`, `updated_at`.
   */
  systemColumns?: Partial<Record<"id" | "publishStatus" | "createdAt" | "modifiedAt", string>>;
  /** Column naming used when a field has no explicit `column`. Defaults to "snake_case". */
  columnNaming?: "snake_case" | "as_is";
};

export type CmsCollectionSummary = CmsCollection & {
  count: number;
  /** Records currently `queued_to_publish`; drives whether "Publish site" is offered. */
  queuedCount: number;
};

export type AssetUploadResult = {
  path: string;
  url: string;
  fileName: string;
  size: number;
};

/** Query options for `listRecords`. Adapters may ignore `search` and filter client-side. */
export type ListRecordsOptions = {
  search?: string;
  /** Only records with this publish status (used by the public content API). */
  publishStatus?: PublishStatus;
  sort?: { key: string; direction: "asc" | "desc" };
  /** Page size. Omit to return every record (mock/dev only). */
  limit?: number;
  offset?: number;
};

export type ListRecordsResult = {
  records: CmsRecord[];
  /** Total matching records ignoring `limit`/`offset`. */
  total: number;
};

export type SaveRecordOptions = {
  /**
   * Optimistic concurrency: when set, the adapter rejects the save with a
   * `conflict` error if the stored record's `modifiedAt` no longer matches.
   */
  expectedModifiedAt?: string;
};

/**
 * Record access. Datetime values are ISO 8601 UTC strings ("...Z") or "".
 * Implementations throw `CmsError` (see ./errors) for expected failures so the
 * UI can distinguish not-found, validation, conflict and permission problems.
 */
export type CmsDataAdapter = {
  listCollections: () => Promise<CmsCollectionSummary[]>;
  listRecords: (collectionId: string, options?: ListRecordsOptions) => Promise<ListRecordsResult>;
  getRecord: (collectionId: string, recordId: string) => Promise<CmsRecord>;
  /** The server owns ids and timestamps; optional initial values seed the row. */
  createRecord: (collectionId: string, values?: Partial<Record<string, CmsRecordValue>>) => Promise<CmsRecord>;
  saveRecord: (collectionId: string, record: CmsRecord, options?: SaveRecordOptions) => Promise<CmsRecord>;
  deleteRecord: (collectionId: string, recordId: string) => Promise<void>;
  importRecords: (collectionId: string, rows: Array<Record<string, CmsRecordValue>>) => Promise<CmsRecord[]>;
  /**
   * Publish step 1: flip every `queued_to_publish` record (optionally in one
   * collection) to `published`. The deploy/rebuild is step 2 and lives outside
   * the data adapter.
   */
  publishQueued: (collectionId?: string) => Promise<{ published: number }>;
  /**
   * Bulk status override for the selection toolbar ("Update items"). Only
   * `queued_to_publish` and `not_published` are valid targets: `published` is
   * reached solely through `publishQueued` + a site deploy.
   */
  setPublishStatus: (collectionId: string, recordIds: string[], status: Exclude<PublishStatus, "published">) => Promise<CmsRecord[]>;
};

/** File storage. Independent from data so Postgres data can pair with R2/Supabase Storage. */
export type CmsStorageAdapter = {
  uploadAsset: (collectionId: string, fieldKey: string, file: File) => Promise<AssetUploadResult>;
};

/** Everything the CMS needs from a backend, injected via `CmsBackendProvider`. */
export type CmsBackend = {
  name: string;
  data: CmsDataAdapter;
  storage: CmsStorageAdapter;
};
