import { useMemo, useRef, useState } from "react";
import { ChevronDown, FileText, Layers, Settings2 } from "lucide-react";
import { Popover } from "@base-ui-components/react/popover";
import type { EditorDocument } from "@three-acts/static-content";
import { IconButton, SearchInput } from "../atoms";
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
  const hasResults = staticPages.length > 0 || cmsPages.length > 0 || visiblePreviewItems.length > 0;
  const currentIsTemplate = Boolean(current?.collectionId);
  const showPageLists = bodyMode === "pages" || Boolean(query.trim());
  const showPreviewItems = currentIsTemplate && (bodyMode === "items" || Boolean(query.trim()));

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
        {currentIsTemplate ? <Layers aria-hidden="true" className="shrink-0 text-cms-muted" size={14} /> : <FileText aria-hidden="true" className="shrink-0 text-cms-muted" size={14} />}
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
            <section aria-label="Current page" className="shrink-0 border-b border-cms-line p-1">
                <p className="px-2 pb-1 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">Current page</p>
                {current ? (
                  <>
                    <div className="flex h-6 items-center rounded-cms bg-cms-raised pr-1">
                      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1">
                        {currentIsTemplate ? <Layers aria-hidden="true" className="shrink-0 text-cms-muted" size={14} /> : <FileText aria-hidden="true" className="shrink-0 text-cms-muted" size={14} />}
                        <span className="min-w-0 flex-1 truncate text-ui font-medium" title={current.label}>{current.label}</span>
                      </div>
                      {current.id !== "shared" && <IconButton
                        aria-label="Current page details"
                        title="Current page details"
                        className="size-6 shrink-0 p-0"
                        disabled={disabled}
                        onClick={() => openDetails(current)}
                      >
                        <Settings2 aria-hidden="true" size={13} />
                      </IconButton>}
                    </div>
                    {currentIsTemplate && chosenPreview && <div className="flex h-6 items-center gap-2 px-2 text-ui text-cms-muted" title={chosenPreview.label}><span aria-hidden="true" className="w-3 shrink-0 text-center">↳</span><span className="truncate">{chosenPreview.label}</span></div>}
                    {currentIsTemplate && <button
                      type="button"
                      aria-label="Browse collection items"
                      disabled={disabled}
                      onClick={() => { setQuery(""); setBodyMode("items"); searchRef.current?.focus(); }}
                      className="flex h-6 w-full items-center rounded-cms px-2 pl-7 text-left text-ui text-cms-accent hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >View items in this collection →</button>}
                  </>
                ) : <p className="px-2 py-1 text-ui text-cms-muted">No page selected.</p>}
            </section>
            <div className="shrink-0 border-b border-cms-line p-2">
              <SearchInput ariaLabel="Search picker pages" inputRender={<input ref={searchRef} />} placeholder="Search pages and items…" value={query} onChange={setQuery} />
            </div>
            <div className="min-h-0 overflow-y-auto p-1">
              {bodyMode === "items" && <button
                type="button"
                aria-label="Back to pages"
                onClick={() => { setQuery(""); setBodyMode("pages"); searchRef.current?.focus(); }}
                className="mb-1 flex h-6 w-full items-center rounded-cms px-2 text-left text-ui text-cms-muted hover:bg-cms-raised hover:text-cms-text focus-visible:outline-1 focus-visible:outline-cms-accent"
              >← Back to pages</button>}
              {showPreviewItems && (
                <section aria-label="CMS preview items" className="border-l border-cms-line-strong pl-2">
                    <p className="px-2 pb-1 pt-1 text-ui font-medium text-cms-muted">Preview items</p>
                    {previewsLoading ? <p role="status" className="px-2 py-1 text-ui text-cms-muted">Loading items…</p> : previewsError ? <p role="alert" className="px-2 py-1 text-ui text-cms-danger">{previewsError}</p> : visiblePreviewItems.length ? (
                      <ul aria-label="CMS preview items" className="space-y-px">
                        {visiblePreviewItems.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              aria-label={`Preview item ${item.label}`}
                              aria-current={chosenPreview?.id === item.id ? "true" : undefined}
                              title={`${item.label} · ${item.route}`}
                              disabled={disabled}
                              onClick={() => selectPreview(item.id)}
                              className={`flex h-6 w-full min-w-0 items-center rounded-cms px-2 text-left text-ui transition-colors hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent disabled:cursor-not-allowed disabled:opacity-50 ${chosenPreview?.id === item.id ? "text-cms-text" : "text-cms-muted"}`}
                            >
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              <span className="ml-2 max-w-28 truncate text-cms-subtle">{item.route}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="px-2 py-1 text-ui text-cms-muted">{query ? "No items match your search." : "No published items."}</p>}
                </section>
              )}

              {showPageLists && <section aria-label="Static pages" className="mt-2">
                <p className="px-2 pb-1 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">Static pages</p>
                {staticPages.length ? <ul className="space-y-px">
                  {staticPages.map((document) => (
                    <li key={document.id}>
                      <button type="button" aria-label={`Open page ${document.label}`} aria-current={current?.id === document.id ? "page" : undefined} title={`${document.label} · ${document.route}`} disabled={disabled} onClick={() => selectPage(document)} className={`flex h-6 w-full min-w-0 items-center gap-2 rounded-cms px-2 text-left text-ui transition-colors hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent disabled:cursor-not-allowed disabled:opacity-50 ${current?.id === document.id ? "bg-cms-raised text-cms-text" : "text-cms-muted"}`}>
                        <FileText aria-hidden="true" className="shrink-0" size={14} /><span className="min-w-0 flex-1 truncate">{document.label}</span><span className="max-w-28 truncate text-cms-subtle">{document.route}</span>
                      </button>
                    </li>
                  ))}
                </ul> : <p className="px-2 py-1 text-ui text-cms-muted">No static pages match.</p>}
              </section>}

              {showPageLists && <section aria-label="CMS pages" className="mt-2">
                <p className="px-2 pb-1 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">CMS pages</p>
                {cmsPages.length ? <ul className="space-y-px">
                  {cmsPages.map((document) => (
                    <li key={document.id}>
                      <button type="button" aria-label={`Open page ${document.label}`} aria-current={current?.id === document.id ? "page" : undefined} title={`${document.label} · ${document.route}`} disabled={disabled} onClick={() => selectPage(document)} className={`flex h-6 w-full min-w-0 items-center gap-2 rounded-cms px-2 text-left text-ui transition-colors hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent disabled:cursor-not-allowed disabled:opacity-50 ${current?.id === document.id ? "bg-cms-raised text-cms-text" : "text-cms-muted"}`}>
                        <Layers aria-hidden="true" className="shrink-0" size={14} /><span className="min-w-0 flex-1 truncate">{document.label}</span><span className="max-w-28 truncate text-cms-subtle">{document.route}</span>
                      </button>
                    </li>
                  ))}
                </ul> : <p className="px-2 py-1 text-ui text-cms-muted">No CMS pages match.</p>}
              </section>}
              {!hasResults && <p className="px-2 py-2 text-ui text-cms-muted">No pages or items match your search.</p>}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
