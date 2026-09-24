/**
 * Pure SQL-generation helpers for the CMS registry (`@three-acts/cms-schema`).
 * No console output here — `print-schema.ts` and `diff-schema.ts` are the
 * only things allowed to print. Kept dependency-free (no SQL-builder libs).
 *
 * Naming is deterministic everywhere (constraint/index names derive only
 * from table + column names) so statements can be dropped and recreated
 * idempotently, and so a from-scratch full schema and a snapshot diff can
 * emit byte-identical constraint SQL for the same collection.
 */
import { columnsForCollection, columnForField, isUniqueField, publishStatuses, systemColumnsFor, type CmsCollection, type CmsField } from "@three-acts/cms-schema";

export function sqlColumnType(field: CmsField): string {
  switch (field.type) {
    case "number":
      return "numeric";
    case "boolean":
      return "boolean";
    case "datetime":
      return "timestamptz";
    // text/textarea/slug/select/asset/readonly all store plain text.
    default:
      return "text";
  }
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Single-quoted SQL string literal, escaping embedded quotes (' -> ''). */
export function sqlStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * The four system columns every table carries, in the fixed order they're
 * declared. `systemColumnsFor` always returns exactly these four keys (it
 * spreads `collection.systemColumns`, a `Partial` of the same shape, over
 * `defaultSystemColumns`), so this order is a safe, stable contract.
 */
export const systemColumnOrder = ["id", "publishStatus", "createdAt", "modifiedAt"] as const;
export type SystemColumnRole = (typeof systemColumnOrder)[number];

/** Column definition line (ident + type + constraints) for a system column, by role. */
export function systemColumnLine(role: SystemColumnRole, columnName: string): string {
  const col = quoteIdent(columnName);
  switch (role) {
    case "id":
      return `${col} uuid primary key default gen_random_uuid()`;
    case "publishStatus":
      return `${col} text not null default 'not_published'`;
    case "createdAt":
    case "modifiedAt":
      return `${col} timestamptz not null default now()`;
  }
}

/** Column definition line (ident + type, no default/not null) for a regular field. */
export function fieldColumnLine(collection: CmsCollection, field: CmsField): string {
  return `${quoteIdent(columnForField(collection, field))} ${sqlColumnType(field)}`;
}

export function renderCreateTableSql(tableName: string, columnLines: readonly string[], commentLabel?: string): string {
  const table = quoteIdent(tableName);
  const header = commentLabel ? `-- ${commentLabel}\n` : "";
  return `${header}create table if not exists ${table} (\n${columnLines.map((line) => `  ${line}`).join(",\n")}\n);`;
}

export function createTableSql(collection: CmsCollection): string {
  const sys = systemColumnsFor(collection);
  // Throws on a column-name collision (e.g. a field keyed "updatedAt" mapping
  // onto the "updated_at" system column) so the registry gets fixed instead
  // of emitting an invalid CREATE TABLE or silently replacing a system column.
  columnsForCollection(collection);

  const columnLines = [
    ...systemColumnOrder.map((role) => systemColumnLine(role, sys[role])),
    ...collection.fields.map((field) => fieldColumnLine(collection, field))
  ];
  return renderCreateTableSql(collection.tableName, columnLines, `${collection.label} (${collection.id})`);
}

// --- Constraints -----------------------------------------------------------

export function selectCheckConstraintName(tableName: string, column: string): string {
  return `${tableName}_${column}_check`;
}

export function publishStatusCheckConstraintName(tableName: string): string {
  return `${tableName}_publish_status_check`;
}

export function uniqueIndexName(tableName: string, column: string): string {
  return `${tableName}_${column}_key`;
}

/**
 * Drop + recreate the check constraint that limits a select column to its
 * configured option values (or `''`/`null`, since drafts may be empty).
 * Values are compared exactly against `option.value`.
 */
export function selectCheckConstraintSql(tableName: string, column: string, optionValues: readonly string[]): string {
  const name = selectCheckConstraintName(tableName, column);
  const table = quoteIdent(tableName);
  const col = quoteIdent(column);
  const dropLine = `alter table ${table} drop constraint if exists ${quoteIdent(name)};`;
  if (optionValues.length === 0) {
    // No options configured: nothing valid to check against `in (...)`.
    return dropLine;
  }
  const values = optionValues.map(sqlStringLiteral).join(", ");
  const addLine = `alter table ${table} add constraint ${quoteIdent(name)} check (${col} is null or ${col} = '' or ${col} in (${values}));`;
  return [dropLine, addLine].join("\n");
}

/** Drop + recreate the check constraint on the publish-status system column. */
export function publishStatusCheckSql(tableName: string, column: string, statuses: readonly string[]): string {
  const name = publishStatusCheckConstraintName(tableName);
  const table = quoteIdent(tableName);
  const col = quoteIdent(column);
  const dropLine = `alter table ${table} drop constraint if exists ${quoteIdent(name)};`;
  const values = statuses.map(sqlStringLiteral).join(", ");
  const addLine = `alter table ${table} add constraint ${quoteIdent(name)} check (${col} in (${values}));`;
  return [dropLine, addLine].join("\n");
}

/** Partial unique index (ignores `''`/null so drafts can share an empty value). */
export function uniqueIndexSql(tableName: string, column: string): string {
  const name = uniqueIndexName(tableName, column);
  const table = quoteIdent(tableName);
  const col = quoteIdent(column);
  return `create unique index if not exists ${quoteIdent(name)} on ${table} (${col}) where ${col} is not null and ${col} <> '';`;
}

export function dropUniqueIndexSql(tableName: string, column: string): string {
  return `drop index if exists ${quoteIdent(uniqueIndexName(tableName, column))};`;
}

/**
 * All constraint/index statements for a collection: one check per select
 * field, one partial unique index per unique field, and the publish-status
 * check (emitted for every collection — the column exists on every table).
 * Ordered after `createTableSql` in the output so they also apply cleanly to
 * pre-existing tables.
 */
export function constraintSql(collection: CmsCollection): string {
  const sys = systemColumnsFor(collection);
  const blocks: string[] = [];

  for (const field of collection.fields) {
    const column = columnForField(collection, field);
    if (field.type === "select") {
      blocks.push(selectCheckConstraintSql(collection.tableName, column, field.options.map((option) => option.value)));
    }
    if (isUniqueField(field)) {
      blocks.push(uniqueIndexSql(collection.tableName, column));
    }
  }

  blocks.push(publishStatusCheckSql(collection.tableName, sys.publishStatus, publishStatuses));

  return blocks.join("\n\n");
}

// --- Trigger -----------------------------------------------------------

export function triggerSqlForTable(tableName: string, modifiedAtColumn: string): string {
  const table = quoteIdent(tableName);
  const triggerFn = quoteIdent(`set_${tableName}_${modifiedAtColumn}`);
  const trigger = quoteIdent(`trg_${tableName}_${modifiedAtColumn}`);

  return [
    `create or replace function ${triggerFn}()`,
    `returns trigger as $$`,
    `begin`,
    `  new.${quoteIdent(modifiedAtColumn)} = now();`,
    `  return new;`,
    `end;`,
    `$$ language plpgsql;`,
    ``,
    `drop trigger if exists ${trigger} on ${table};`,
    `create trigger ${trigger}`,
    `before update on ${table}`,
    `for each row`,
    `execute function ${triggerFn}();`
  ].join("\n");
}

export function triggerSql(collection: CmsCollection): string {
  const sys = systemColumnsFor(collection);
  return triggerSqlForTable(collection.tableName, sys.modifiedAt);
}

// --- Full schema -----------------------------------------------------------

function tableBlockSql(collection: CmsCollection): string {
  return [createTableSql(collection), constraintSql(collection), triggerSql(collection)].join("\n\n");
}

const schemaHeader = [
  "-- Generated by `npm run schema:sql -w @three-acts/api` from packages/cms-schema/src/registry.ts.",
  "-- Review before running: adjust column types/constraints/RLS to your needs.",
  "-- gen_random_uuid() needs pgcrypto on Postgres < 13:",
  "--   create extension if not exists pgcrypto;",
  ""
].join("\n");

const rlsExample = [
  "",
  "-- Example RLS policy (not enabled by default). The API always connects",
  "-- with the Supabase service-role key, which bypasses RLS, so this only",
  "-- matters if these tables are also queried directly with the anon/public",
  "-- key (e.g. from apps/web). Adjust the role/condition to your auth model:",
  "--",
  "-- alter table launch_pages enable row level security;",
  "-- create policy \"public can read published rows\" on launch_pages",
  "--   for select",
  "--   using (publish_status = 'published');",
  ""
].join("\n");

/** Full idempotent schema (create tables + constraints + triggers + an RLS example) for every collection. */
export function fullSchemaSql(registry: readonly CmsCollection[]): string {
  const tables = registry.map(tableBlockSql).join("\n\n");
  return `${schemaHeader}\n${tables}\n${rlsExample}`;
}
