import { useMemo, useRef, useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { Popover } from "@base-ui-components/react/popover";
import type { EditorDocument } from "@three-acts/static-content";
import { IconButton, SearchInput } from "../atoms";
import { PageIcon } from "./page-icon";
import type { CmsPagePreview } from "./use-cms-page-previews";

type PagePickerProps = {
  documents: EditorDocument[];
  current: EditorDocument | undefined;
  previewItems: CmsPagePreview[];
  chosenPreview: CmsPagePreview | null;
  previewsLoading: boolean;
  previewsError: string | null;
  disabled: boolean;
  onSelectPage: (document: EditorDocument) => void;
  onSelectPreview: (id: string) => void;
  onOpenDetails: (document: EditorDocument) => void;
};

function matches(query: string, ...values: (string | undefined)[]) {
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || values.some((value) => value?.toLocaleLowerCase().includes(normalized));
}

export function PagePicker({
  documents,
  current,
  previewItems,
  chosenPreview,
  previewsLoading,
  previewsError,
  disabled,
  onSelectPage,
  onSelectPreview,
  onOpenDetails,
}: PagePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [bodyMode, setBodyMode] = useState<"pages" | "items">("pages");
  const searchRef = useRef<HTMLInputElement>(null);
  const staticPages = useMemo(() => documents.filter((document) => document.id !== "shared" && !document.collectionId && matches(query, document.label, document.route)), [documents, query]);
  const cmsPages = useMemo(() => documents.filter((document) => document.id !== "shared" && Boolean(document.collectionId) && matches(query, document.label, document.route)), [documents, query]);
  const visiblePreviewItems = useMemo(() => previewItems.filter((item) => matches(query, item.label, item.route)), [previewItems, query]);
  const currentIsTemplate = Boolean(current?.collectionId);
  const searching = Boolean(query.trim());
  const showPageLists = searching || bodyMode === "pages";
  const showPreviewItems = currentIsTemplate && (searching || bodyMode === "items");
  const hasResults = (showPageLists && (staticPages.length > 0 || cmsPages.length > 0))
    || (showPreviewItems && (previewsLoading || Boolean(previewsError) || visiblePreviewItems.length > 0));

  function closeAndClear() {
    setOpen(false);
    setQuery("");
    setBodyMode("pages");
  }

  function selectPage(document: EditorDocument) {
    closeAndClear();
    onSelectPage(document);
  }

  function selectPreview(id: string) {
    closeAndClear();
    onSelectPreview(id);
  }

  function openDetails(document: EditorDocument) {
    closeAndClear();
    onOpenDetails(document);
  }

  function changeMode(mode: "pages" | "items") {
    setQuery("");
    setBodyMode(mode);
    searchRef.current?.focus();
  }

  return (
    <Popover.Root open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setQuery("");
        setBodyMode("pages");
      }
    }}>
      <Popover.Trigger
        aria-label="Choose page"
        className="flex h-7 max-w-64 min-w-0 items-center gap-1.5 rounded-cms border border-transparent px-2 text-ui text-cms-text transition-colors hover:border-cms-line hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
      >
        {current && <PageIcon route={current.route} collectionId={current.collectionId} className="shrink-0" size={14} />}
        <span className="min-w-0 truncate font-medium">{currentIsTemplate && chosenPreview ? chosenPreview.label : current?.label ?? "Choose page"}</span>
        <ChevronDown aria-hidden="true" className="shrink-0 text-cms-muted" size={13} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
          <Popover.Popup
            aria-label="Page picker"
            role="dialog"
            initialFocus={searchRef}
            className="flex max-h-[min(70vh,560px)] w-[320px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-cms border border-cms-line-strong bg-cms-surface text-cms-text shadow-[0_8px_24px_rgba(0,0,0,0.24)] outline-none"
          >
            {current && current.id !== "shared" && <div className="group/current flex min-h-8 shrink-0 items-center gap-2 border-b border-cms-line px-3 py-1.5">
              <PageIcon route={current.route} collectionId={current.collectionId} className="shrink-0" size={14} />
              <span className="min-w-0 flex-1 truncate text-ui font-medium" title={current.label}>{current.label}</span>
              <IconButton
                aria-label="Current page details"
                title="Current page details"
                className="pointer-events-none size-6 shrink-0 border-transparent bg-transparent p-0 opacity-0 shadow-none transition-opacity group-hover/current:pointer-events-auto group-hover/current:opacity-100 group-focus-within/current:pointer-events-auto group-focus-within/current:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100 focus-visible:outline-1 focus-visible:outline-cms-accent"
                disabled={disabled}
                onClick={() => openDetails(current)}
              >
                <Settings aria-hidden="true" size={13} />
              </IconButton>
            </div>}
            {currentIsTemplate && <div aria-label="Page picker sections" className="flex shrink-0 gap-1 border-b border-cms-line px-2 py-1.5">
              <button
                type="button"
                aria-label="Back to pages"
                aria-pressed={bodyMode === "pages"}
                onClick={() => changeMode("pages")}
                className={`h-6 flex-1 rounded-cms px-2 text-ui focus-visible:outline-1 focus-visible:outline-cms-accent ${bodyMode === "pages" ? "bg-cms-raised text-cms-text" : "text-cms-muted hover:bg-cms-raised hover:text-cms-text"}`}
              >Pages</button>
              <button
                type="button"
                aria-label="Browse collection items"
                aria-pressed={bodyMode === "items"}
                onClick={() => changeMode("items")}
                className={`h-6 flex-1 rounded-cms px-2 text-ui focus-visible:outline-1 focus-visible:outline-cms-accent ${bodyMode === "items" ? "bg-cms-raised text-cms-text" : "text-cms-muted hover:bg-cms-raised hover:text-cms-text"}`}
              >Items</button>
            </div>}
            <div className="shrink-0 border-b border-cms-line p-2">
              <SearchInput ariaLabel="Search picker pages" inputRender={<input ref={searchRef} />} placeholder="Search pages and items…" value={query} onChange={setQuery} />
            </div>
            <div className="min-h-0 overflow-y-auto p-1">
              {showPreviewItems && (!searching || visiblePreviewItems.length > 0 || previewsLoading || previewsError) && <section aria-label="CMS preview items">
                {previewsLoading ? <p role="status" className="px-2 py-2 text-ui text-cms-muted">Loading items…</p> : previewsError ? <p role="alert" className="px-2 py-2 text-ui text-cms-danger">{previewsError}</p> : visiblePreviewItems.length ? (
                  <ul className="space-y-px">
                    {visiblePreviewItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-label={`Preview item ${item.label}`}
                          aria-current={chosenPreview?.id === item.id ? "true" : undefined}
                          title={`${item.label} · ${item.route}`}
                          disabled={disabled}
                          onClick={() => selectPreview(item.id)}
                          className={`flex h-7 w-full min-w-0 items-center gap-2 rounded-cms px-2 text-left text-ui transition-colors hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent disabled:cursor-not-allowed disabled:opacity-50 ${chosenPreview?.id === item.id ? "text-cms-text" : "text-cms-muted"}`}
                        >
                          <PageIcon route={current?.route} collectionId={current?.collectionId} className="shrink-0" size={14} />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          <span className="max-w-28 truncate text-cms-subtle">{item.route}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="px-2 py-2 text-ui text-cms-muted">{searching ? "No items match your search." : "No published items."}</p>}
              </section>}

              {showPageLists && <>
                {staticPages.length > 0 && <section aria-label="Static pages" className={searching && showPreviewItems ? "mt-2 border-t border-cms-line pt-1" : ""}>
                  <p className="px-2 pb-1 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">Static pages</p>
                  <ul className="space-y-px">
                    {staticPages.map((document) => <li key={document.id}>
                      <button type="button" aria-label={`Open page ${document.label}`} aria-current={current?.id === document.id ? "page" : undefined} title={`${document.label} · ${document.route}`} disabled={disabled} onClick={() => selectPage(document)} className={`flex h-7 w-full min-w-0 items-center gap-2 rounded-cms px-2 text-left text-ui transition-colors hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent disabled:cursor-not-allowed disabled:opacity-50 ${current?.id === document.id ? "bg-cms-raised text-cms-text" : "text-cms-muted"}`}>
                        <PageIcon route={document.route} className="shrink-0" size={14} /><span className="min-w-0 flex-1 truncate">{document.label}</span><span className="max-w-28 truncate text-cms-subtle">{document.route}</span>
                      </button>
                    </li>)}
                  </ul>
                </section>}
                {cmsPages.length > 0 && <section aria-label="CMS pages" className="mt-2">
                  <p className="px-2 pb-1 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">CMS pages</p>
                  <ul className="space-y-px">
                    {cmsPages.map((document) => <li key={document.id}>
                      <button type="button" aria-label={`Open page ${document.label}`} aria-current={current?.id === document.id ? "page" : undefined} title={`${document.label} · ${document.route}`} disabled={disabled} onClick={() => selectPage(document)} className={`flex h-7 w-full min-w-0 items-center gap-2 rounded-cms px-2 text-left text-ui transition-colors hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent disabled:cursor-not-allowed disabled:opacity-50 ${current?.id === document.id ? "bg-cms-raised text-cms-text" : "text-cms-muted"}`}>
                        <PageIcon route={document.route} collectionId={document.collectionId} className="shrink-0" size={14} /><span className="min-w-0 flex-1 truncate">{document.label}</span><span className="max-w-28 truncate text-cms-subtle">{document.route}</span>
                      </button>
                    </li>)}
                  </ul>
                </section>}
              </>}
              {!hasResults && (searching || !showPreviewItems) && <p className="px-2 py-2 text-ui text-cms-muted">{searching ? "No pages or items match your search." : "No pages available."}</p>}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
