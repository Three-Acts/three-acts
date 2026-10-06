import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, Check, FileText, Globe, Layers, Monitor, RefreshCw, Settings2, Smartphone, Tablet, Undo2 } from "lucide-react";
import { contentFields, validateContent, type ContentField, type ContentObject, type EditorChange, type EditorDocument, type EditorPushResult, type EditorWorkspace } from "@three-acts/static-content";
import type { AuthUser } from "@three-acts/auth";
import { Button, ConfirmDialog, IconButton, PanelHeader, SearchInput } from "../atoms";
import { loadDesignerWorkspace, pushDesignerChanges } from "./client";
import { draftKey, fieldLabel, readDrafts, sameContent, updateField, type Drafts } from "./drafts";
import { Inspector } from "./inspector";
import { Review } from "./review";
import { useCmsPagePreviews } from "./use-cms-page-previews";
import { PagePicker } from "./page-picker";
import { FieldPanel, type FieldPanelSelection } from "./field-panel";

export type TemplateDetailsChange = { document: EditorDocument; content: ContentObject; onChange: (path: string[], value: string | number | boolean) => void } | null;

function siteUrl(): URL | null {
  try {
    const url = new URL(import.meta.env.VITE_SITE_URL || "http://localhost:4321");
    return /^https?:$/.test(url.protocol) ? url : null;
  } catch { return null; }
}

const publicSite = siteUrl();
const widths = { desktop: "100%", tablet: "768px", mobile: "390px" };

export function DesignerWorkspace({ user, onPagePathChange, onBusyChange, onUnsavedChange, onOpenPageDetails, onSelectPage, pageDetailsPath, pageDetailsPanel, onTemplateDetailsChange }: {
  user: AuthUser;
  onPagePathChange?: (path: string) => void;
  onBusyChange?: (busy: boolean) => void;
  onUnsavedChange?: (unsafe: boolean) => void;
  onOpenPageDetails?: (route: string, select: () => void) => void;
  onSelectPage?: (route: string | null, select: () => void) => void;
  pageDetailsPath?: string | null;
  pageDetailsPanel?: ReactNode;
  onTemplateDetailsChange?: (details: TemplateDetailsChange) => void;
}) {
  const [workspace, setWorkspace] = useState<EditorWorkspace | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [recovery, setRecovery] = useState<string | null>(null);
  const [page, setPage] = useState("home");
  const [canvasRoute, setCanvasRoute] = useState("/");
  const [query, setQuery] = useState("");
  const [fieldQuery, setFieldQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [canvasSelection, setCanvasSelection] = useState<FieldPanelSelection | null>(null);
  const [device, setDevice] = useState<keyof typeof widths>("desktop");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [message, setMessage] = useState("Update website content");
  const [previewReady, setPreviewReady] = useState(false);
  const [commit, setCommit] = useState<string | null>(null);
  const [previewIds, setPreviewIds] = useState<Record<string, string>>({});
  const frame = useRef<HTMLIFrameElement>(null);
  const unsavedStorageDrafts = useRef<Drafts | null>(null);
  const key = workspace ? draftKey(workspace, user.email) : null;
  const current = workspace?.documents.find((document) => document.id === page);
  const content = current ? drafts[page]?.content ?? current.content : null;
  const currentTemplate = current?.collectionId ? current : null;
  const previews = useCmsPagePreviews(currentTemplate?.collectionId, currentTemplate?.route);
  const chosenPreview = previews.items.find((item) => item.id === previewIds[page]) ?? previews.items[0] ?? null;
  const templateContent = currentTemplate ? drafts[currentTemplate.id]?.content ?? currentTemplate.content : null;
  const changedCount = Object.keys(drafts).length;
  const stale = workspace?.documents.filter((document) => drafts[document.id] && drafts[document.id].sha !== document.sha) ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await loadDesignerWorkspace();
      setWorkspace(next);
      const saved = readDrafts(draftKey(next, user.email));
      setDrafts(unsavedStorageDrafts.current ?? saved.drafts);
      setRecovery(saved.recovery);
      const firstPage = next.documents.find((document) => document.id !== "shared");
      setPage(firstPage?.id ?? "shared");
      setCanvasRoute(firstPage?.route ?? "/");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load content.");
    } finally { setLoading(false); }
  }, [user.email]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => { onPagePathChange?.(canvasRoute); }, [canvasRoute, onPagePathChange]);
  useEffect(() => {
    if (!currentTemplate || !chosenPreview) return;
    // Loading a different template's records is external async state; synchronize its selected live URL into the canvas route.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canvasRoute !== chosenPreview.route) { setPreviewReady(false); setCanvasRoute(chosenPreview.route); }
  }, [currentTemplate, chosenPreview, canvasRoute]);
  const onTemplateFieldChange = useCallback((path: string[], value: string | number | boolean) => {
    if (!currentTemplate || !templateContent) return;
    const field = contentFields(templateContent).find((item) => item.path.join(".") === path.join("."));
    if (field) changeField(field, value, currentTemplate.id);
  // `changeField` intentionally reads the current shared draft state from this render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTemplate, templateContent, drafts, busy, key]);
  useEffect(() => {
    onTemplateDetailsChange?.(currentTemplate && templateContent ? { document: currentTemplate, content: templateContent, onChange: onTemplateFieldChange } : null);
  }, [currentTemplate, templateContent, onTemplateFieldChange, onTemplateDetailsChange]);
  useEffect(() => {
    onUnsavedChange?.(storageUnavailable && changedCount > 0);
    return () => onUnsavedChange?.(false);
  }, [storageUnavailable, changedCount, onUnsavedChange]);
  useEffect(() => {
    if (!changedCount) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changedCount]);

  function persist(next: Drafts) {
    setDrafts(next);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(next));
      unsavedStorageDrafts.current = null;
      setStorageUnavailable(false);
      setNotice("Draft saved in this browser");
    } catch {
      unsavedStorageDrafts.current = next;
      setStorageUnavailable(true);
      setError("Browser storage is unavailable. Keep this tab open until you push your changes.");
    }
  }

  function changeField(field: ContentField, value: string | number | boolean, id = page) {
    const document = workspace?.documents.find((item) => item.id === id);
    const targetContent = drafts[id]?.content ?? document?.content;
    if (!document || !targetContent || busy) return;
    const updated = updateField(targetContent, field.path, value);
    const next = { ...drafts };
    const original = next[id]?.original ?? document.content;
    if (sameContent(updated, original)) delete next[id];
    else next[id] = { content: updated, sha: next[id]?.sha ?? document.sha, original };
    persist(next);
  }

  function openCanvasSelection(action: () => void) {
    if (onSelectPage) onSelectPage(null, action);
    else action();
  }

  const sendPreview = useCallback(() => {
    // A newly mounted iframe starts at about:blank on the CMS origin. Wait
    // for the origin-checked ready message before sending site content.
    if (!workspace || !publicSite || !previewReady) return;
    frame.current?.contentWindow?.postMessage({
      type: "three-acts:preview",
      documents: workspace.documents.map((doc) => ({ id: doc.id, content: drafts[doc.id]?.content ?? doc.content }))
    }, publicSite.origin);
  }, [workspace, drafts, previewReady]);

  useEffect(() => { sendPreview(); }, [sendPreview, previewReady]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!publicSite || event.origin !== publicSite.origin || event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "three-acts:ready") { setPreviewReady(true); sendPreview(); }
      if (event.data.type === "three-acts:select" && !busy) {
        const doc = workspace?.documents.find((item) => item.id === event.data.id);
        const path = event.data.path;
        if (!doc || typeof path !== "string" || !contentFields(drafts[doc.id]?.content ?? doc.content).some((field) => field.path.join(".") === path)) return;
        const activeContent = drafts[doc.id]?.content ?? doc.content;
        const field = contentFields(activeContent).find((item) => item.path.join(".") === path);
        if (!field) return;
        openCanvasSelection(() => {
          setPage(doc.id);
          if (!doc.collectionId && doc.id !== "shared" && doc.route !== canvasRoute) {
            setPreviewReady(false);
            setCanvasRoute(doc.route);
          }
          setSelected(path);
          setFieldQuery("");
          setCanvasSelection({
            kind: event.data.category === "component" ? "component" : "element",
            label: typeof event.data.label === "string" ? event.data.label.slice(0, 100) : fieldLabel(field.path),
            value: String(field.value),
            valueType: typeof field.value === "boolean" ? "boolean" : typeof field.value === "number" ? "number" : "string",
            id: doc.id,
            path,
          });
        });
      }
      if (event.data.type === "three-acts:select-cms" && !busy) {
        const binding = event.data.binding;
        if (!binding || typeof binding !== "object") return;
        const collectionId = binding.collectionId;
        const field = binding.field;
        const label = event.data.label;
        const value = event.data.value;
        if (typeof collectionId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(collectionId)
          || typeof field !== "string" || field.length > 160
          || typeof label !== "string" || label.length > 120
          || typeof value !== "string" || value.length > 4000) return;
        openCanvasSelection(() => {
          setSelected(null);
          setCanvasSelection({ kind: "cms", label, value, collectionId, field });
        });
      }
      if (event.data.type === "three-acts:select-element" && !busy) {
        const kind = event.data.category;
        const label = event.data.label;
        const details = event.data.element;
        if ((kind !== "component" && kind !== "element") || typeof label !== "string" || label.length > 100
          || !details || typeof details !== "object" || typeof details.text !== "string" || details.text.length > 4000
          || typeof details.tag !== "string" || !/^[a-z][a-z0-9-]{0,20}$/.test(details.tag)) return;
        openCanvasSelection(() => {
          setSelected(null);
          setCanvasSelection({
            kind,
            label,
            value: details.text,
            readonlyMessage: "This text is not set up for editing yet. Ask your site owner to make it editable.",
          });
        });
      }
      if (event.data.type === "three-acts:edit" && !busy && typeof event.data.id === "string" && typeof event.data.path === "string" && typeof event.data.value === "string") {
        const doc = workspace?.documents.find((item) => item.id === event.data.id);
        if (!doc) return;
        const field = contentFields(drafts[doc.id]?.content ?? doc.content).find((item) => item.path.join(".") === event.data.path);
        if (field && typeof field.value === "string") changeField(field, event.data.value, doc.id);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
    // The handler must read the current draft, not a captured earlier version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, drafts, page, content, busy, sendPreview, onSelectPage]);

  function downloadRecovery() {
    if (!recovery) return;
    const url = URL.createObjectURL(new Blob([recovery], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "three-acts-recovered-drafts.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function selectField(field: ContentField) {
    const path = field.path.join(".");
    const activeDocument = workspace?.documents.find((document) => document.id === page);
    openCanvasSelection(() => {
      setSelected(path);
      setCanvasSelection({ kind: "component", label: fieldLabel(field.path), value: String(field.value), valueType: typeof field.value === "boolean" ? "boolean" : typeof field.value === "number" ? "number" : "string", id: page, path });
      if (publicSite && previewReady) frame.current?.contentWindow?.postMessage({ type: "three-acts:focus", id: activeDocument?.id ?? page, path }, publicSite.origin);
    });
  }

  function selectPage(id: string) {
    if (busy) return;
    const next = workspace?.documents.find((doc) => doc.id === id);
    if (next && !next.collectionId && id !== "shared" && next.route !== canvasRoute) { setPreviewReady(false); setCanvasRoute(next.route); }
    setPage(id);
    setSelected(null);
    setCanvasSelection(null);
    setFieldQuery("");
  }

  function choosePage(document: EditorDocument) {
    const select = () => selectPage(document.id);
    if (onSelectPage) onSelectPage(document.route, select);
    else select();
  }

  function choosePreview(id: string) {
    if (busy || !currentTemplate) return;
    const item = previews.items.find((preview) => preview.id === id);
    if (!item) return;
    setPreviewIds((previous) => ({ ...previous, [currentTemplate.id]: id }));
    if (canvasRoute !== item.route) { setPreviewReady(false); setCanvasRoute(item.route); }
  }

  async function push() {
    setError("");
    let changes: EditorChange[];
    try {
      changes = Object.entries(drafts).map(([id, draft]) => {
        validateContent(id, draft.content);
        return { id, sha: draft.sha, content: draft.content };
      });
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Invalid content.");
      return;
    }
    setBusy(true);
    try {
      const result: EditorPushResult = await pushDesignerChanges(changes, message);
      const replacements = new Map(result.documents.map((doc) => [doc.id, doc]));
      setWorkspace((previous) => previous ? { ...previous, documents: previous.documents.map((doc) => replacements.get(doc.id) ?? doc) } : previous);
      persist({});
      setReviewing(false);
      setCommit(result.url);
      setNotice("Pushed to GitHub. Your hosting service can now rebuild the site.");
    } catch (pushError) {
      setError(pushError instanceof Error ? pushError.message : "Push failed. Your drafts are still saved.");
    } finally { setBusy(false); }
  }

  const frameUrl = publicSite && current && (!currentTemplate || (chosenPreview && canvasRoute === chosenPreview.route)) ? new URL(canvasRoute, publicSite).toString() : null;
  return <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-cms-bg text-cms-text">
    <aside className="flex min-h-0 w-60 shrink-0 flex-col border-r border-cms-line-strong bg-cms-surface max-sm:w-44" aria-label="Pages">
      <PanelHeader className="h-8 min-h-8 gap-2 px-2"><FileText size={14}/><strong className="font-semibold">Pages</strong></PanelHeader>
      <div className="border-b border-cms-line p-1"><SearchInput ariaLabel="Search pages" placeholder="Find a page…" value={query} onChange={setQuery}/></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      <p className="px-2 pb-0 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">Static pages</p>
      <nav aria-label="Static pages">
        {workspace?.documents.filter((doc) => doc.id !== "shared" && !doc.collectionId && `${doc.label} ${doc.route}`.toLowerCase().includes(query.toLowerCase())).map((doc) =>
          <div key={doc.id} className={`flex h-6 w-full items-center pr-0.5 transition-colors hover:bg-cms-raised ${page === doc.id ? "bg-cms-raised text-cms-text" : "text-cms-muted"}`}>
            <button title={`${doc.label} · ${doc.route}`} className="flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left text-ui disabled:opacity-50" aria-pressed={page === doc.id} onClick={() => {
              const select = () => selectPage(doc.id);
              if (onSelectPage) onSelectPage(doc.route, select);
              else select();
            }} disabled={busy}>
              <FileText size={13} className="shrink-0"/><span className="min-w-0 flex-1 truncate">{doc.label}</span>{drafts[doc.id] && <i className="size-2 shrink-0 rounded-full bg-cms-accent" aria-label="Changed"/>}
            </button>
            <IconButton className="size-6 shrink-0 p-0" aria-label={`Page details for ${doc.label}`} title="Page details" aria-pressed={pageDetailsPath === doc.route} onClick={() => onOpenPageDetails?.(doc.route, () => selectPage(doc.id))} disabled={busy}>
              <Settings2 size={12}/>
            </IconButton>
          </div>)}
        {workspace && !workspace.documents.some((doc) => doc.id !== "shared" && !doc.collectionId && `${doc.label} ${doc.route}`.toLowerCase().includes(query.toLowerCase())) && <p className="px-2 py-2 text-ui text-cms-muted">No pages match your search.</p>}
      </nav>
      <p className="px-2 pb-0 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">CMS pages</p>
      <nav aria-label="CMS pages">
        {workspace?.documents.filter((doc) => Boolean(doc.collectionId) && `${doc.label} ${doc.route}`.toLowerCase().includes(query.toLowerCase())).map((doc) =>
          <div key={doc.id} className={`flex h-6 w-full items-center pr-0.5 transition-colors hover:bg-cms-raised ${page === doc.id ? "bg-cms-raised text-cms-text" : "text-cms-muted"}`}>
            <button title={`${doc.label} · ${doc.route}`} className="flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left text-ui disabled:opacity-50" aria-pressed={page === doc.id} onClick={() => {
              const select = () => selectPage(doc.id);
              if (onSelectPage) onSelectPage(doc.route, select);
              else select();
            }} disabled={busy}>
              <Layers size={13} className="shrink-0"/><span className="min-w-0 flex-1 truncate">{doc.label}</span>{drafts[doc.id] && <i className="size-2 shrink-0 rounded-full bg-cms-accent" aria-label="Changed"/>}
            </button>
            <IconButton className="size-6 shrink-0 p-0" aria-label={`Page details for ${doc.label}`} title="Page details" aria-pressed={pageDetailsPath === doc.route} onClick={() => onOpenPageDetails?.(doc.route, () => selectPage(doc.id))} disabled={busy}>
              <Settings2 size={12}/>
            </IconButton>
          </div>)}
        {workspace && !workspace.documents.some((doc) => Boolean(doc.collectionId) && `${doc.label} ${doc.route}`.toLowerCase().includes(query.toLowerCase())) && <p className="px-2 py-2 text-ui text-cms-muted">No templates match your search.</p>}
      </nav>
      </div>
      <p className="px-2 pb-0 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">Global content</p>
      <button title="Used across every page" className={`flex h-6 w-full items-center gap-2 px-2 text-left text-ui hover:bg-cms-raised disabled:opacity-50 ${page === "shared" ? "bg-cms-raised" : "text-cms-muted"}`} aria-pressed={page === "shared"} onClick={() => {
        const select = () => selectPage("shared");
        if (onSelectPage) onSelectPage(null, select);
        else select();
      }} disabled={busy || !workspace}><Globe size={13}/><span className="min-w-0 flex-1 truncate">Site & navigation</span>{drafts.shared && <i className="size-2 rounded-full bg-cms-accent" aria-label="Changed"/>}</button>
      <div className="mt-auto border-t border-cms-line p-1 text-ui text-cms-muted"><p className="truncate px-1 pb-1" title={workspace?.connected ? "Connected to GitHub" : "GitHub not connected"}>{workspace?.connected ? "Connected to GitHub" : "GitHub not connected"}</p><Button variant="ghost" className="h-6 w-full justify-start px-1" onClick={() => void load()} disabled={busy || loading}><RefreshCw size={13}/>{loading ? "Loading…" : "Reload from source"}</Button></div>
    </aside>

    {canvasSelection ? (() => {
      const selectedDocument = canvasSelection.id ? workspace?.documents.find((document) => document.id === canvasSelection.id) : null;
      const selectedContent = selectedDocument ? drafts[selectedDocument.id]?.content ?? selectedDocument.content : null;
      const selectedField = selectedContent && canvasSelection.path
        ? contentFields(selectedContent).find((field) => field.path.join(".") === canvasSelection.path)
        : null;
      const selection = selectedField ? { ...canvasSelection, value: String(selectedField.value), label: canvasSelection.label || fieldLabel(selectedField.path) } : canvasSelection;
      return <FieldPanel
        selection={selection}
        editable={Boolean(selectedDocument && selectedField && canvasSelection.kind !== "cms")}
        disabled={busy}
        onClose={() => setCanvasSelection(null)}
        onChange={(value) => {
          if (!selectedDocument || !selectedField || canvasSelection.kind === "cms") return;
          const nextValue = typeof selectedField.value === "boolean" ? value === true : typeof selectedField.value === "number" ? Number(value) : value;
          changeField(selectedField, nextValue, selectedDocument.id);
        }}
      />;
    })() : pageDetailsPath ? pageDetailsPanel : null}

    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PanelHeader className="h-8 min-h-8 gap-1.5 px-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-ui">
          <PagePicker documents={workspace?.documents ?? []} current={current} previewItems={previews.items} chosenPreview={chosenPreview} previewsLoading={previews.loading} previewsError={previews.error} disabled={busy || loading || !workspace} onSelectPage={choosePage} onSelectPreview={choosePreview} onOpenDetails={(document) => onOpenPageDetails?.(document.route, () => selectPage(document.id))}/>
          <span className="hidden min-w-0 truncate text-cms-muted md:inline" title={canvasRoute}>{canvasRoute}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5" aria-label="Canvas width">{([{ id: "desktop", Icon: Monitor }, { id: "tablet", Icon: Tablet }, { id: "mobile", Icon: Smartphone }] as const).map(({ id, Icon }) => <IconButton key={id} className={`size-6 ${device === id ? "text-cms-accent" : ""}`} aria-label={`${id} preview`} aria-pressed={device === id} onClick={() => setDevice(id)}><Icon size={14}/></IconButton>)}</div>
        <Button variant="primary" disabled={!changedCount || busy || loading} onClick={() => { setReviewing(true); setError(""); }}><span className="hidden sm:inline">Review & push</span><span className="sm:hidden" aria-hidden="true">Review</span><span className="sr-only sm:hidden">Review & push</span><ArrowUpRight size={13}/></Button>
        {frameUrl && <a className="grid size-6 shrink-0 place-items-center rounded-cms text-cms-accent hover:bg-cms-raised" href={frameUrl} target="_blank" rel="noopener noreferrer" aria-label="View site" title="View site"><ArrowUpRight size={15}/></a>}
      </PanelHeader>
      <div className="flex min-h-0 flex-1 flex-col">
        {error && !reviewing && <div className="flex shrink-0 items-center gap-2 border-b border-cms-danger/40 bg-cms-danger/10 px-3 py-2 text-ui text-cms-danger" role="alert">{error}<Button variant="ghost" className="ml-auto" onClick={() => void load()} disabled={busy}>Retry</Button></div>}
        {recovery && <div className="flex shrink-0 items-center gap-2 border-b border-cms-pending/40 bg-cms-pending/10 px-3 py-2 text-ui text-cms-text" role="alert">Some saved drafts use older or invalid fields. Compatible drafts are restored, and a backup is kept in this browser.<Button variant="ghost" onClick={downloadRecovery}>Download draft backup</Button></div>}
        {stale.length > 0 && <div className="shrink-0 border-b border-cms-pending/40 bg-cms-pending/10 px-3 py-2 text-ui text-cms-text" role="alert">{stale.map((doc) => doc.label).join(", ")} changed on GitHub. Your drafts are preserved. Discard the affected drafts and reapply your edits before pushing.</div>}
        {!workspace ? <div className="grid min-h-0 flex-1 place-items-center p-6 text-center"><div className="max-w-sm"><Layers size={28} className="mx-auto text-cms-muted"/><h2 className="mt-3 text-ui-lg font-semibold">{loading ? "Opening your workspace…" : "Your content couldn't be loaded"}</h2><p className="my-2 text-ui text-cms-muted">The designer connects through the Three Acts API.</p><Button onClick={() => void load()} disabled={loading}>Try again</Button></div></div> : <>
          <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-cms-bg">
            <div className="h-full min-h-80 shrink-0 overflow-hidden border border-cms-line-strong bg-cms-surface" style={{ width: `min(${widths[device]}, 100%)` }}>
              {frameUrl ? <iframe ref={frame} title="Website canvas" src={frameUrl} sandbox="allow-scripts allow-same-origin" onLoad={sendPreview} className="h-full w-full border-0 bg-white"/> : <div className="grid h-full place-items-center p-6 text-center"><div>
                {currentTemplate && (!chosenPreview || canvasRoute !== chosenPreview.route) ? <>
                  <Layers size={28} className="mx-auto text-cms-muted"/>
                  <h2 className="mt-3 text-ui-lg font-semibold">{previews.loading || (chosenPreview && canvasRoute !== chosenPreview.route) ? "Loading preview…" : previews.error ? "Preview items couldn't be loaded" : "No published items to preview"}</h2>
                  <p className="mt-2 max-w-md text-ui text-cms-muted">{previews.error ?? (previews.loading ? "Loading published items from this collection." : "Publish an item in this collection to preview its page." )}</p>
                </> : <><Globe size={28} className="mx-auto text-cms-muted"/><h2 className="mt-3 text-ui-lg font-semibold">Connect your website</h2><p className="mt-2 max-w-md text-ui text-cms-muted">Set VITE_SITE_URL to your public website. Enable PUBLIC_EDITOR_PREVIEW and PUBLIC_EDITOR_ORIGIN on the web app for canvas editing.</p></>}
              </div></div>}
            </div>
          </div>
          <footer className="flex h-7 shrink-0 items-center gap-2 border-t border-cms-line px-2 text-ui text-cms-muted"><span className="flex min-w-0 flex-1 items-center gap-1.5"><Check size={13} className="shrink-0 text-cms-success"/><span className="truncate">{notice || "Select a page and make it yours"}{commit && <> · <a className="text-cms-accent hover:underline" href={commit} target="_blank" rel="noopener noreferrer">View commit</a></>}</span></span><Button variant="ghost" className="h-6 shrink-0 px-1" disabled={!drafts[page] || busy} onClick={() => setDiscarding(true)}><Undo2 size={13}/><span className="hidden sm:inline">Discard page draft</span><span className="sr-only sm:hidden">Discard page draft</span></Button></footer>
        </>}
      </div>
    </main>

    {content ? <div className="flex min-h-0 min-w-0 flex-col"><p className={`m-0 border-l border-cms-line-strong bg-cms-bg px-2 py-1 text-ui text-cms-subtle ${currentTemplate ? "" : "hidden"}`}>Collection fields are managed in CMS.</p><Inspector content={content} selected={selected} query={fieldQuery} onQuery={setFieldQuery} onSelect={selectField} disabled={busy}/></div> : <aside className="hidden w-60 shrink-0 border-l border-cms-line-strong bg-cms-surface lg:block" aria-label="Content inspector"/>}
    {reviewing && workspace && <Review drafts={drafts} workspace={workspace} message={message} onMessage={setMessage} busy={busy} error={error} onClose={() => { setReviewing(false); setError(""); }} onPush={() => void push()}/>}
    <ConfirmDialog open={discarding} onOpenChange={setDiscarding} title="Discard this page’s draft?" description="The page will return to the latest loaded source. Your other drafts will stay saved." confirmLabel="Discard draft" onConfirm={() => { const next = { ...drafts }; delete next[page]; persist(next); setNotice("Page draft discarded"); }}/>
  </div>;
}
