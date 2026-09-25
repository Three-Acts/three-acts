import { Check } from "lucide-react";
import { cn } from "@three-acts/utils";
import type { CmsCollectionSummary, CmsRecord } from "../../cms/types";
import { formatDateTime } from "../../lib/format";
import { getRecordTitle, sourceDescription } from "../../lib/records";
import { Checkbox, columnHeaderClass, focusRing, ScrollArea, StatusPill } from "../atoms";

type RecordTableProps = {
  collection: CmsCollectionSummary;
  /** Whether `records` is already filtered by a search query — changes the empty-state copy. */
  hasSearch?: boolean;
  isLoading: boolean;
  onSelectRecord: (recordId: string) => void;
  onToggleSelectAll: (selected: boolean) => void;
  onToggleSelected: (recordId: string) => void;
  records: CmsRecord[];
  selectedIds: Set<string>;
  selectionMode: boolean;
};

export function RecordTable({
  collection,
  hasSearch,
  isLoading,
  onSelectRecord,
  onToggleSelectAll,
  onToggleSelected,
  records,
  selectedIds,
  selectionMode
}: RecordTableProps) {
  const columns = collection.listColumns;
  const columnTemplate = columns.map((column) => column.width ?? "minmax(var(--spacing-col-min), 1fr)").join(" ");
  const gridTemplateColumns = selectionMode ? `var(--spacing-select-col) ${columnTemplate}` : columnTemplate;
  const allSelected = records.length > 0 && records.every((record) => selectedIds.has(record.id));
  const someSelected = records.some((record) => selectedIds.has(record.id));

  if (isLoading) {
    return <div className="flex-1 p-4 text-ui text-cms-subtle">Loading records…</div>;
  }

  if (records.length === 0) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        {hasSearch ? (
          <p className="m-0 text-ui text-cms-subtle">No records match this search.</p>
        ) : (
          <div className="grid gap-1">
            <p className="m-0 text-ui text-cms-subtle">No records yet.</p>
            <p className="m-0 text-micro text-cms-subtle">{sourceDescription(collection) ?? "Create one or import a CSV."}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="min-w-245" role="grid" aria-label={`${collection.label} table`} aria-rowcount={records.length + 1}>
        <div
          className={cn(columnHeaderClass, "sticky top-0 z-10 grid bg-cms-bg")}
          role="row"
          style={{ gridTemplateColumns }}
        >
          {selectionMode ? (
            <div className="flex items-center justify-center" role="columnheader">
              <Checkbox ariaLabel="Select all" checked={allSelected} indeterminate={someSelected && !allSelected} onChange={onToggleSelectAll} />
            </div>
          ) : null}
          {columns.map((column) => (
            <div className="min-w-0 truncate px-3" key={column.key} role="columnheader">
              {column.label}
            </div>
          ))}
        </div>
        {records.map((record) => {
          const selected = selectedIds.has(record.id);

          function activate() {
            if (selectionMode) {
              onToggleSelected(record.id);
            } else {
              onSelectRecord(record.id);
            }
          }

          return (
            <div
              aria-selected={selectionMode ? selected : undefined}
              className={cn(
                "grid h-8 w-full cursor-pointer items-center border-b border-cms-line text-left text-ui text-cms-muted transition-colors",
                "hover:bg-cms-surface hover:text-cms-text",
                selected && "bg-cms-raised text-cms-text",
                focusRing
              )}
              key={record.id}
              onClick={activate}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  activate();
                }
              }}
              role="row"
              style={{ gridTemplateColumns }}
              tabIndex={0}
            >
              {selectionMode ? (
                <span className="flex items-center justify-center" role="gridcell">
                  {/* Presentational mirror of the Checkbox atom — a real checkbox
                      cannot nest inside the focusable row. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-4 place-items-center rounded-cms-sm border",
                      selected ? "border-cms-accent bg-cms-accent text-cms-accent-ink" : "border-cms-track text-transparent"
                    )}
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                </span>
              ) : null}
              {columns.map((column) => (
                <span className={cn("min-w-0 truncate px-3", isDataColumn(column.valueType) && "tabular-nums")} key={column.key} role="gridcell">
                  {renderColumnValue(collection, record, column.key, column.valueType)}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function isDataColumn(valueType?: string) {
  // ListColumn.valueType has no "number" — every numeric list value is
  // rendered through the "datetime" branch or as plain text.
  return valueType === "datetime";
}

function renderColumnValue(collection: CmsCollectionSummary, record: CmsRecord, key: string, valueType?: string) {
  if (key === "publishStatus" || valueType === "status") {
    return <StatusPill status={record.publishStatus} />;
  }

  const value = key === "createdAt" || key === "modifiedAt" ? record[key] : record.values[key];

  if (valueType === "datetime") {
    return formatDateTime(String(value ?? ""));
  }

  if (valueType === "boolean") {
    return value ? "Yes" : "No";
  }

  if (key === collection.titleField) {
    // The title is the handle you scan the table by, so it gets full contrast.
    const title = getRecordTitle(collection, record);
    const isPlaceholder = !value;
    return <span className={cn("font-medium", isPlaceholder ? "text-cms-subtle italic" : "text-cms-text")}>{title}</span>;
  }

  return String(value ?? "");
}
