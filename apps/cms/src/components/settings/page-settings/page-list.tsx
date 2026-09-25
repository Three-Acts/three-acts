import { Plus } from "lucide-react";
import { cn } from "@three-acts/utils";
import type { CmsRecord } from "../../../cms/types";
import { BareIconButton, columnHeaderClass, focusRing, PanelHeader, ScrollArea, StatusDot, Tooltip } from "../../atoms";
import { text } from "./seo";

type PageListProps = {
  canCreate: boolean;
  isLoading: boolean;
  onCreate: () => void;
  onSelect: (pageId: string) => void;
  pages: CmsRecord[];
  selectedId: string | null;
  showStatus: boolean;
  title: string;
};

/** Left pane: every static page, named and addressed by path, like a site's page tree. */
export function PageList({ canCreate, isLoading, onCreate, onSelect, pages, selectedId, showStatus, title }: PageListProps) {
  return (
    <section aria-label={title} className="flex min-h-0 w-pane shrink-0 flex-col border-r border-cms-line-strong">
      <PanelHeader className="justify-between">
        <h1 className="min-w-0 flex-1 truncate text-ui-lg font-semibold text-cms-text">{title}</h1>
        {canCreate ? (
          <Tooltip content="Add page">
            <BareIconButton aria-label="Add page" onClick={onCreate}>
              <Plus size={15} />
            </BareIconButton>
          </Tooltip>
        ) : null}
      </PanelHeader>
      <div className={cn(columnHeaderClass, "flex px-3")}>Static pages</div>
      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? <p className="m-0 px-3 py-3 text-ui text-cms-subtle">Loading pages…</p> : null}
        {!isLoading && pages.length === 0 ? (
          <p className="m-0 px-3 py-3 text-ui leading-5 text-cms-subtle">No pages yet. Add one for each static route the site renders.</p>
        ) : null}
        {pages.map((page) => {
          const selected = page.id === selectedId;
          const name = text(page.values, "pageName") || "Untitled page";
          const path = text(page.values, "pagePath") || "—";

          return (
            <button
              aria-current={selected ? "true" : undefined}
              className={cn(
                "grid h-12 w-full grid-cols-fill-auto items-center gap-2 border-b border-cms-line px-3 text-left transition-colors",
                selected ? "bg-cms-raised" : "hover:bg-cms-surface",
                focusRing
              )}
              key={page.id}
              onClick={() => onSelect(page.id)}
              type="button"
            >
              <span className="grid min-w-0 gap-0.5">
                <span className={cn("truncate text-ui", selected ? "font-medium text-cms-text" : "text-cms-muted")}>{name}</span>
                <span className="truncate font-mono text-micro text-cms-subtle">{path}</span>
              </span>
              {showStatus ? (
                <span className="grid size-4 place-items-center">
                  <StatusDot status={page.publishStatus} />
                  <span className="sr-only">{statusLabel(page.publishStatus)}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </ScrollArea>
    </section>
  );
}

function statusLabel(status: CmsRecord["publishStatus"]): string {
  return status === "published" ? "Published" : status === "queued_to_publish" ? "Queued to publish" : "Not published";
}
