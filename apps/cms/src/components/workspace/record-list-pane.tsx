import { ChevronRight, Plus } from "lucide-react";
import { cn } from "@three-acts/utils";
import type { CmsCollectionSummary, CmsRecord } from "../../cms/types";
import { singularize } from "../../lib/format";
import { canCreate, getRecordTitle } from "../../lib/records";
import { BareIconButton, columnHeaderClass, focusRing, PanelHeader, ScrollArea, Tooltip } from "../atoms";

type RecordListPaneProps = {
  collection: CmsCollectionSummary;
  onCreate: () => void;
  onSelectRecord: (recordId: string) => void;
  records: CmsRecord[];
  selectedRecordId: string;
};

// The narrow list pane a record's editor opens beside: the table "collapses"
// to its first column, so the header (40px) and column-header (32px) bands
// must land at the same heights as the full table view — see PanelHeader and
// columnHeaderClass.
export function RecordListPane({ collection, onCreate, onSelectRecord, records, selectedRecordId }: RecordListPaneProps) {
  const columnLabel = collection.listColumns[0]?.label ?? "Name";
  const newLabel = `New ${singularize(collection.label)}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader className="justify-between">
        <h1 className="min-w-0 flex-1 truncate text-ui-lg font-semibold text-cms-text">{collection.label}</h1>
        {canCreate(collection) ? (
          <Tooltip content={newLabel}>
            <BareIconButton aria-label={newLabel} onClick={onCreate}>
              <Plus size={15} />
            </BareIconButton>
          </Tooltip>
        ) : null}
      </PanelHeader>
      <div className={cn(columnHeaderClass, "flex px-3")}>{columnLabel}</div>
      <ScrollArea className="min-h-0 flex-1">
        {records.map((record) => {
          const selected = record.id === selectedRecordId;

          return (
            <button
              aria-current={selected ? "true" : undefined}
              className={cn(
                "group grid h-8 w-full grid-cols-fill-auto items-center gap-2 border-b border-cms-line px-3 text-left text-ui transition-colors",
                selected ? "bg-cms-raised font-medium text-cms-text" : "text-cms-muted hover:bg-cms-surface hover:text-cms-text",
                focusRing
              )}
              key={record.id}
              onClick={() => onSelectRecord(record.id)}
              type="button"
            >
              <span className="truncate">{getRecordTitle(collection, record)}</span>
              <ChevronRight className={cn("text-cms-subtle", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} size={13} />
            </button>
          );
        })}
      </ScrollArea>
    </div>
  );
}
