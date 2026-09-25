import { CheckSquare, Download, Plus, Trash2, Upload, X } from "lucide-react";
import { Toolbar } from "@base-ui-components/react/toolbar";
import type { PublishStatus } from "../../cms/types";
import { Button, MenuButton, PanelHeader, SearchInput } from "../atoms";

type RecordsToolbarProps = {
  /** At least one selected record isn't already queued — enables "Queue to publish". */
  canQueueSelected: boolean;
  /** Editors may create or import records in this collection — false hides New/Import (e.g. records come from the site). */
  canCreate: boolean;
  /** At least one selected record is published — enables "Unpublish". */
  canUnpublishSelected: boolean;
  /** Only editorial collections offer the bulk "Update items" status menu. */
  hasPublishWorkflow: boolean;
  newLabel: string;
  onCreate: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  onImport: () => void;
  onSearchChange: (value: string) => void;
  onToggleSelectionMode: () => void;
  onUpdateSelectedStatus: (status: Exclude<PublishStatus, "published">) => void;
  search: string;
  selectedCount: number;
  selectionMode: boolean;
  title: string;
};

// Base UI Toolbar: one tab stop for the whole strip, with arrow keys moving
// between the search field and the record actions.
export function RecordsToolbar({
  canQueueSelected,
  canCreate,
  canUnpublishSelected,
  hasPublishWorkflow,
  newLabel,
  onCreate,
  onDeleteSelected,
  onExportSelected,
  onImport,
  onSearchChange,
  onToggleSelectionMode,
  onUpdateSelectedStatus,
  search,
  selectedCount,
  selectionMode,
  title
}: RecordsToolbarProps) {
  return (
    <PanelHeader className="gap-1.5" render={<Toolbar.Root aria-label={`${title} actions`} />}>
      {selectionMode ? (
        <>
          <span className="mr-1 shrink-0 truncate text-ui-lg font-semibold text-cms-text">
            {selectedCount > 0 ? `${selectedCount} ${title} selected` : `Select ${title}`}
          </span>
          <Toolbar.Group className="ml-auto flex items-center gap-1.5">
            {selectedCount > 0 ? (
              <>
                <Button onClick={onExportSelected} render={<Toolbar.Button />}>
                  <Download size={13} />
                  Export
                </Button>
                <Button onClick={onDeleteSelected} render={<Toolbar.Button />}>
                  <Trash2 size={13} />
                  Delete
                </Button>
                {hasPublishWorkflow ? (
                  <MenuButton
                    label="Update items"
                    options={[
                      {
                        disabled: !canQueueSelected,
                        label: "Queue to publish",
                        onSelect: () => onUpdateSelectedStatus("queued_to_publish")
                      },
                      { label: "Save as draft", onSelect: () => onUpdateSelectedStatus("not_published") },
                      {
                        disabled: !canUnpublishSelected,
                        label: "Unpublish",
                        onSelect: () => onUpdateSelectedStatus("not_published")
                      }
                    ]}
                    render={<Toolbar.Button />}
                  />
                ) : null}
                <Toolbar.Separator className="mx-0.5 h-4 w-px shrink-0 bg-cms-line-strong" />
              </>
            ) : null}
            <Button onClick={onToggleSelectionMode} render={<Toolbar.Button />}>
              <X size={13} />
              Cancel
            </Button>
          </Toolbar.Group>
        </>
      ) : (
        <>
          <h1 className="mr-1 shrink-0 truncate text-ui-lg font-semibold text-cms-text">{title}</h1>
          <Toolbar.Group className="ml-auto flex items-center gap-1.5">
            <SearchInput
              className="w-55 max-w-full"
              inputRender={<Toolbar.Input />}
              onChange={onSearchChange}
              placeholder={`Search ${title.toLowerCase()}…`}
              value={search}
            />
            <Button onClick={onToggleSelectionMode} render={<Toolbar.Button />}>
              <CheckSquare size={13} />
              Select
            </Button>
            {canCreate ? (
              <>
                <Button onClick={onImport} render={<Toolbar.Button />}>
                  <Upload size={13} />
                  Import
                </Button>
                <Button onClick={onCreate} render={<Toolbar.Button />} variant="primary">
                  <Plus size={13} />
                  New {newLabel}
                </Button>
              </>
            ) : null}
          </Toolbar.Group>
        </>
      )}
    </PanelHeader>
  );
}
