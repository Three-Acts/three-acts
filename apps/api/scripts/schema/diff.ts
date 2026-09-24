/**
 * Snapshot-based migration diffing. No DB connection: this compares the
 * current `@three-acts/cms-schema` registry against a committed JSON
 * snapshot (`apps/api/schema/snapshot.json`) and produces SQL to reconcile
 * an existing database. Pure functions only — no console output, no fs
 * access (that's `../diff-schema.ts`'s job).
 *
 * Caveat: a field/table **rename** cannot be distinguished from an unrelated
 * drop + add of a differently-named field/table with the same shape — it
 * always shows up here as a remove followed by an add. Review the generated
 * SQL and fold rename pairs into an `alter ... rename to ...` by hand.
 */
import { columnsForCollection,
  columnForField,
  isUniqueField,
  publishStatuses,
  systemColumnsFor,
  type CmsCollection,
  type FieldType
} from "@three-acts/cms-schema";
import {
  dropUniqueIndexSql,
  publishStatusCheckSql,
  quoteIdent,
  renderCreateTableSql,
  selectCheckConstraintSql,
  sqlColumnType,
  systemColumnLine,
  systemColumnOrder,
  triggerSqlForTable,
  uniqueIndexSql,
  type SystemColumnRole
} from "./sql";

export type SnapshotColumnKind = "system" | "field";

export type SnapshotColumn = {
  /** SQL type, e.g. "text" / "numeric" / "boolean" / "timestamptz" / "uuid". */
  type: string;
  kind: SnapshotColumnKind;
  /**
   * For `kind: "field"`, the CMS field type (drives select/unique handling).
   * For `kind: "system"`, which of the four fixed system columns this is
   * (`"id" | "publishStatus" | "createdAt" | "modifiedAt"`) — needed to
   * regenerate the right default/constraint when a table is recreated from
   * the snapshot alone.
   */
  fieldType?: FieldType | SystemColumnRole;
  unique?: boolean;
  selectOptions?: string[];
};

export type SnapshotTable = {
  collectionId: string;
  columns: Record<string, SnapshotColumn>;
  publishStatuses: string[];
};

export type SchemaSnapshot = {
  version: 1;
  generatedAt: string;
  tables: Record<string, SnapshotTable>;
};

export function emptySnapshot(generatedAt: string = new Date().toISOString()): SchemaSnapshot {
  return { version: 1, generatedAt, tables: {} };
}

/** Build a `SchemaSnapshot` from the live collection registry. */
export function snapshotOf(registry: readonly CmsCollection[], generatedAt: string = new Date().toISOString()): SchemaSnapshot {
  const tables: Record<string, SnapshotTable> = {};

  for (const collection of registry) {
    columnsForCollection(collection); // throws on column-name collisions
    const sys = systemColumnsFor(collection);
    const columns: Record<string, SnapshotColumn> = {};

    for (const role of systemColumnOrder) {
      columns[sys[role]] = { type: systemColumnSqlType(role), kind: "system", fieldType: role };
    }

    for (const field of collection.fields) {
      const column = columnForField(collection, field);
      const entry: SnapshotColumn = { type: sqlColumnType(field), kind: "field", fieldType: field.type };
      if (isUniqueField(field)) {
        entry.unique = true;
      }
      if (field.type === "select") {
        entry.selectOptions = field.options.map((option) => option.value);
      }
      columns[column] = entry;
    }

    tables[collection.tableName] = {
      collectionId: collection.id,
      columns,
      publishStatuses: [...publishStatuses]
    };
  }

  return { version: 1, generatedAt, tables };
}

function systemColumnSqlType(role: SystemColumnRole): string {
  switch (role) {
    case "id":
      return "uuid";
    case "publishStatus":
      return "text";
    case "createdAt":
    case "modifiedAt":
      return "timestamptz";
  }
}

function columnDefinitionLine(columnName: string, def: SnapshotColumn): string {
  if (def.kind === "system") {
    return systemColumnLine(def.fieldType as SystemColumnRole, columnName);
  }
  return `${quoteIdent(columnName)} ${def.type}`;
}

function findColumn(table: SnapshotTable, fieldType: SystemColumnRole): string | undefined {
  return Object.entries(table.columns).find(([, def]) => def.kind === "system" && def.fieldType === fieldType)?.[0];
}

/** All constraint/index statements for a snapshot table (mirrors `sql.ts#constraintSql`, but off a snapshot). */
function constraintSqlForSnapshotTable(tableName: string, table: SnapshotTable): string {
  const blocks: string[] = [];

  for (const [column, def] of Object.entries(table.columns)) {
    if (def.kind !== "field") continue;
    if (def.fieldType === "select") {
      blocks.push(selectCheckConstraintSql(tableName, column, def.selectOptions ?? []));
    }
    if (def.unique) {
      blocks.push(uniqueIndexSql(tableName, column));
    }
  }

  const publishStatusColumn = findColumn(table, "publishStatus");
  if (publishStatusColumn) {
    blocks.push(publishStatusCheckSql(tableName, publishStatusColumn, table.publishStatuses));
  }

  return blocks.join("\n\n");
}

function fullCreateSqlForTable(tableName: string, table: SnapshotTable): string {
  const columnLines = Object.entries(table.columns).map(([column, def]) => columnDefinitionLine(column, def));
  const create = renderCreateTableSql(tableName, columnLines, table.collectionId);
  const constraints = constraintSqlForSnapshotTable(tableName, table);
  const modifiedAtColumn = findColumn(table, "modifiedAt") ?? "updated_at";
  const trigger = triggerSqlForTable(tableName, modifiedAtColumn);
  return [create, constraints, trigger].join("\n\n");
}

function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((value) => setB.has(value));
}

export type SchemaDiffResult = {
  /** Migration SQL. Empty string when there are no changes. */
  sql: string;
  hasChanges: boolean;
};

const renameCaveat = [
  "-- This diff is generated by comparing two schema snapshots; it cannot",
  "-- detect renames. A renamed field or collection shows up below as an",
  "-- independent remove + add — review before running, and fold any such",
  "-- pair into a manual `alter ... rename to ...` if that's what happened.",
  "-- Statements starting with `--` are informational only (commented out)",
  "-- and are never executed automatically; they flag destructive changes",
  "-- (dropped tables/columns) for manual opt-in."
].join("\n");

/** Diff two schema snapshots into migration SQL. Pure — no fs/console access. */
export function diffSnapshots(previous: SchemaSnapshot, next: SchemaSnapshot): SchemaDiffResult {
  const statements: string[] = [];

  const previousTableNames = Object.keys(previous.tables);
  const nextTableNames = Object.keys(next.tables);

  for (const tableName of nextTableNames) {
    if (!(tableName in previous.tables)) {
      statements.push(fullCreateSqlForTable(tableName, next.tables[tableName]));
    }
  }

  for (const tableName of previousTableNames) {
    if (!(tableName in next.tables)) {
      statements.push(
        [
          `-- WARNING: "${tableName}" was removed from the registry. Dropping it is`,
          "-- destructive (data loss) and left commented out — uncomment only if",
          "-- you're sure the table (and its data) should go away:",
          `-- drop table if exists ${quoteIdent(tableName)};`
        ].join("\n")
      );
    }
  }

  for (const tableName of nextTableNames) {
    const previousTable = previous.tables[tableName];
    const nextTable = next.tables[tableName];
    if (!previousTable) continue;

    const table = quoteIdent(tableName);
    const previousColumns = previousTable.columns;
    const nextColumns = nextTable.columns;
    const allColumnNames = new Set([...Object.keys(previousColumns), ...Object.keys(nextColumns)]);

    for (const column of allColumnNames) {
      const prevDef = previousColumns[column];
      const nextDef = nextColumns[column];
      const col = quoteIdent(column);

      if (!prevDef && nextDef) {
        // Added column.
        statements.push(`alter table ${table} add column if not exists ${columnDefinitionLine(column, nextDef)};`);
        if (nextDef.kind === "field" && nextDef.fieldType === "select") {
          statements.push(selectCheckConstraintSql(tableName, column, nextDef.selectOptions ?? []));
        }
        if (nextDef.kind === "field" && nextDef.unique) {
          statements.push(uniqueIndexSql(tableName, column));
        }
        continue;
      }

      if (prevDef && !nextDef) {
        // Removed column.
        statements.push(
          [
            `-- WARNING: "${tableName}"."${column}" was removed from the registry.`,
            "-- Dropping it is destructive (data loss) and left commented out:",
            `-- alter table ${table} drop column if exists ${col};`
          ].join("\n")
        );
        continue;
      }

      if (!prevDef || !nextDef) continue; // unreachable, satisfies strict narrowing

      if (prevDef.type !== nextDef.type) {
        statements.push(
          [
            `-- WARNING: changing "${tableName}"."${column}" from ${prevDef.type} to ${nextDef.type}`,
            "-- may fail if existing data can't be cast automatically.",
            `alter table ${table} alter column ${col} type ${nextDef.type} using ${col}::${nextDef.type};`
          ].join("\n")
        );
      }

      if (nextDef.kind === "field" && nextDef.fieldType === "select") {
        const prevOptions = prevDef.kind === "field" ? (prevDef.selectOptions ?? []) : [];
        const nextOptions = nextDef.selectOptions ?? [];
        if (!sameStringSet(prevOptions, nextOptions)) {
          statements.push(selectCheckConstraintSql(tableName, column, nextOptions));
        }
      }

      const wasUnique = prevDef.kind === "field" && Boolean(prevDef.unique);
      const isUnique = nextDef.kind === "field" && Boolean(nextDef.unique);
      if (wasUnique !== isUnique) {
        statements.push(isUnique ? uniqueIndexSql(tableName, column) : dropUniqueIndexSql(tableName, column));
      }
    }

    if (!sameStringSet(previousTable.publishStatuses, nextTable.publishStatuses)) {
      const publishStatusColumn = findColumn(nextTable, "publishStatus") ?? "publish_status";
      statements.push(publishStatusCheckSql(tableName, publishStatusColumn, nextTable.publishStatuses));
    }
  }

  if (statements.length === 0) {
    return { sql: "", hasChanges: false };
  }

  return { sql: `${renameCaveat}\n\n${statements.join("\n\n")}`, hasChanges: true };
}
