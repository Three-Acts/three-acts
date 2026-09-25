import type { CmsCollection, CmsField, PublishStatus } from "./types";

/** snake_case for camelCase keys: heroImage -> hero_image. */
export function toSnakeCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/-+/g, "_").toLowerCase();
}

/** Backing column for a field, honouring explicit `column` then the collection's naming strategy. */
export function columnForField(collection: CmsCollection, field: CmsField): string {
  if (field.column) {
    return field.column;
  }
  return collection.columnNaming === "as_is" ? field.key : toSnakeCase(field.key);
}

export const defaultSystemColumns = {
  id: "id",
  publishStatus: "publish_status",
  createdAt: "created_at",
  modifiedAt: "updated_at",
  /** jsonb snapshot of the live values; only created on publish-workflow tables. */
  liveValues: "published_data"
} as const;

export function systemColumnsFor(collection: CmsCollection): Record<keyof typeof defaultSystemColumns, string> {
  return { ...defaultSystemColumns, ...collection.systemColumns };
}

/** Whether a field's values must be unique across the collection. `slug` fields are unique unless opted out. */
export function isUniqueField(field: CmsField): boolean {
  if (field.unique !== undefined) {
    return field.unique;
  }
  return field.type === "slug";
}

/** Only `editorial` (or default-mode) collections carry a publish workflow; `data`/`readonly` collections never queue or publish. */
export function hasPublishWorkflow(collection: CmsCollection): boolean {
  return collection.mode === undefined || collection.mode === "editorial";
}

/** Every publish status a record can hold, in the order the editor shows them. */
export const publishStatuses: ReadonlyArray<PublishStatus> = ["published", "draft", "queued_to_publish", "not_published"];

/**
 * Every backing column a collection maps onto (system columns first, then
 * fields). Throws when two entries resolve to the same column name, e.g. a
 * field keyed `updatedAt` colliding with the default `updated_at` system
 * column; fix it with an explicit `column` on the field.
 */
export function columnsForCollection(collection: CmsCollection): Map<string, { kind: "system"; role: keyof typeof defaultSystemColumns } | { kind: "field"; field: CmsField }> {
  const columns = new Map<string, { kind: "system"; role: keyof typeof defaultSystemColumns } | { kind: "field"; field: CmsField }>();
  const sys = systemColumnsFor(collection);

  for (const role of Object.keys(defaultSystemColumns) as Array<keyof typeof defaultSystemColumns>) {
    const name = sys[role];
    if (columns.has(name)) {
      throw new Error(`Collection "${collection.id}": system columns "${role}" and another system column both map to "${name}".`);
    }
    columns.set(name, { kind: "system", role });
  }

  for (const field of collection.fields) {
    const name = columnForField(collection, field);
    const existing = columns.get(name);
    if (existing) {
      const other = existing.kind === "system" ? `system column "${existing.role}"` : `field "${existing.field.key}"`;
      throw new Error(`Collection "${collection.id}": field "${field.key}" and ${other} both map to column "${name}". Set an explicit \`column\` on one of them.`);
    }
    columns.set(name, { kind: "field", field });
  }

  return columns;
}
