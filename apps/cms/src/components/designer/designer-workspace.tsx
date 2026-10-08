import { isCanvasSelection, readCanvasNodes } from "./canvas-contract";
import { componentDefinitions, emptyDesign, validateDesign, type Breakpoint, type DesignDocument, type StyleChange } from "@three-acts/design";
import { ComponentInspector } from "./component-inspector";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, CheckCircle2, Eye, File, GitBranch, Globe, Info, Layers, Monitor, MousePointer2, RefreshCw, Settings, SlidersHorizontal, Smartphone, Tablet, Type, Undo2, X } from "lucide-react";
import { contentFields, validateContent, type ContentField, type ContentObject, type EditorChange, type EditorDocument, type EditorPushResult, type EditorWorkspace } from "@three-acts/static-content";
import type { AuthUser } from "@three-acts/auth";
import { Button, ConfirmDialog, IconButton, PanelHeader, SearchInput, Tooltip, type ToastOptions } from "../atoms";
import { popupClass } from "../atoms/styles";
import { loadDesignerWorkspace, pushDesignerChanges } from "./client";
import { draftKey, readDrafts, sameContent, updateField, type Drafts } from "./drafts";
import { Inspector } from "./inspector";
import { Review } from "./review";
import { useCmsPagePreviews } from "./use-cms-page-previews";
import { PagePicker } from "./page-picker";
import { PageIcon } from "./page-icon";
import { Navigator } from "./navigator";
import { StyleInspector } from "./style-inspector";
import type { CanvasNode, CanvasSelection } from "./canvas-types";
import { getElementPresentation } from "./element-presentation";
import { CanvasBreadcrumb } from "./canvas-breadcrumb";
import { GitHubConnection } from "./github-connection";
import { getPagePresentation } from "./page-state";
import type { PublishStatus } from "../../cms/types";

export type TemplateDetailsChange = { document: EditorDocument; content: ContentObject; onChange: (path: string[], value: string | number | boolean) => void } | null;

function siteUrl(): URL | null {
  try {
    const url = new URL(import.meta.env.VITE_SITE_URL || "http://localhost:4321");
    return /^https?:$/.test(url.protocol) ? url : null;
  } catch { return null; }
}

const publicSite = siteUrl();
const widths = { desktop: "1280px", tablet: "1024px", landscape: "768px", mobile: "390px" };

export function DesignerWorkspace({ user, onPagePathChange, onBusyChange, onUnsavedChange, onOpenPageDetails, onSelectPage, pageDetailsPath, pageDetailsDirty = false, pagePublishStatuses, onTemplateDetailsChange, toolbarHost, onClosePublish, onViewSiteUrlChange }: {
  user: AuthUser;
  onPagePathChange?: (path: string) => void;
  onBusyChange?: (busy: boolean) => void;
  onUnsavedChange?: (unsafe: boolean) => void;
  onOpenPageDetails?: (route: string, select: () => void) => void;
  onSelectPage?: (route: string | null, select: () => void) => void;
  pageDetailsPath?: string | null;
  pageDetailsDirty?: boolean;
  pagePublishStatuses: Record<string, PublishStatus>;
  onTemplateDetailsChange?: (details: TemplateDetailsChange) => void;
  toolbarHost?: HTMLDivElement | null;
  onClosePublish?: () => void;
  onViewSiteUrlChange?: (url: string | null) => void;
}) {
  const [workspace, setWorkspace] = useState<EditorWorkspace | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [recovery, setRecovery] = useState<string | null>(null);
  const [page, setPage] = useState("home");
  const [canvasRoute, setCanvasRoute] = useState("/");
  const [query, setQuery] = useState("");
  const [canvasSelection, setCanvasSelection] = useState<CanvasSelection | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [leftPanel, setLeftPanel] = useState<"pages" | "navigator">("navigator");
  const [rightPanel, setRightPanel] = useState<"content" | "style">("style");
  const [canvasMode, setCanvasMode] = useState<"design" | "preview">("design");
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [device, setDevice] = useState<keyof typeof widths>("desktop");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [message, setMessage] = useState("Update website content");
  const [previewReady, setPreviewReady] = useState(false);
  const [frameRevision, setFrameRevision] = useState(0);
  const [commit, setCommit] = useState<string | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [notification, setNotification] = useState<ToastOptions | null>(null);
  const [previewIds, setPreviewIds] = useState<Record<string, string>>({});
  const frame = useRef<HTMLIFrameElement>(null);
  const unsavedStorageDrafts = useRef<Drafts | null>(null);
  const notificationTimer = useRef<number | null>(null);
  const notify = useCallback((options: ToastOptions) => {
    if (notificationTimer.current !== null) window.clearTimeout(notificationTimer.current);
    setNotification(options);
    notificationTimer.current = window.setTimeout(() => setNotification(null), options.duration ?? 5000);
  }, []);
  useEffect(() => () => {
    if (notificationTimer.current !== null) window.clearTimeout(notificationTimer.current);
  }, []);
  const key = workspace ? draftKey(workspace, user.email) : null;
  const current = workspace?.documents.find((document) => document.id === page);
  const pageStates = Object.fromEntries((workspace?.documents ?? []).map((document) => [document.id,
    getPagePresentation(pagePublishStatuses[document.route], Boolean(drafts[document.id]) || (pageDetailsDirty && pageDetailsPath === document.route))
  ]));
  const contentDocument = workspace?.documents.find((document) => document.id === (canvasSelection?.textField?.id ?? canvasSelection?.binding?.id)) ?? current;
  const content = contentDocument ? drafts[contentDocument.id]?.content ?? contentDocument.content : null;
  const currentTemplate = current?.collectionId ? current : null;
  const previews = useCmsPagePreviews(currentTemplate?.collectionId, currentTemplate?.route);
  const chosenPreview = previews.items.find((item) => item.id === previewIds[page]) ?? previews.items[0] ?? null;
  const templateContent = currentTemplate ? drafts[currentTemplate.id]?.content ?? currentTemplate.content : null;
  const changedCount = Object.keys(drafts).length;
  const designDocument = workspace?.documents.find(document => document.id === "design");
  const design = (drafts.design?.content ?? designDocument?.content ?? emptyDesign()) as unknown as DesignDocument;
  const isComponentSelection = Boolean((canvasSelection?.component || canvasSelection?.category === "component") && !canvasSelection?.editingComponent);
  function updateDesign(change: (design: DesignDocument) => void) {
    if (!designDocument || busy || loading || reviewing) return;
    const next = structuredClone(design);
    change(next);
    const validated = validateDesign(next) as unknown as ContentObject;
    const nextDrafts = { ...drafts };
    const original = nextDrafts.design?.original ?? designDocument.content;
    if (sameContent(validated, original)) delete nextDrafts.design;
    else nextDrafts.design = { content: validated, sha: nextDrafts.design?.sha ?? designDocument.sha, original };
    persist(nextDrafts);
  }
  function writeSelectedStyle(next: DesignDocument, style: StyleChange) {
    const target = canvasSelection?.designTarget;
    if (target?.kind === "element") {
      if (!style.utilities.length && !style.customClasses.length) delete next.elements[target.id];
      else next.elements[target.id] = style;
    } else if (target?.kind === "component") {
      const entry = next.components[target.component] ?? { parts: {} };
      if (!style.utilities.length && !style.customClasses.length) delete entry.parts[target.part];
      else entry.parts[target.part] = style;
      if (Object.keys(entry.parts).length) next.components[target.component] = entry;
      else delete next.components[target.component];
    }
  }
  function changeBreakpoint(value: Breakpoint) {
    setBreakpoint(value);
    setDevice(value === "base" ? "mobile" : value);
  }
  function resolveSelectedField(binding: { id: string; path: string }) {
    const document = workspace?.documents.find(document => document.id === binding.id);
    const saved = document ? drafts[document.id]?.content ?? document.content : null;
    return saved ? contentFields(saved).find(field => field.path.join(".") === binding.path) : undefined;
  }
  const stale = workspace?.documents.filter((document) => drafts[document.id] && drafts[document.id].sha !== document.sha) ?? [];

  function postCanvas(data: Record<string, unknown>) {
    if (publicSite && previewReady) frame.current?.contentWindow?.postMessage(data, publicSite.origin);
  }

  function resetCanvasState() {
    setCanvasSelection(null);
    setCanvasNodes([]);
    setEditingComponent(null);
  }

  const load = useCallback(async (preferredPage?: string, preferredRoute?: string) => {
    setLoading(true);
    setError("");
    setConnectionError("");
    try {
      const next = await loadDesignerWorkspace();
      setPreviewReady(false);
      setFrameRevision((revision) => revision + 1);
      resetCanvasState();
      setWorkspace(next);
      setLastSynced(new Date());
      const saved = readDrafts(draftKey(next, user.email));
      setDrafts(unsavedStorageDrafts.current ?? saved.drafts);
      setRecovery(saved.recovery);
      const firstPage = next.documents.find((document) => document.id === preferredPage && document.kind !== "design" && document.id !== "shared") ?? next.documents.find((document) => document.kind !== "design" && document.id !== "shared");
      setPage(firstPage?.id ?? "shared");
      setCanvasRoute(firstPage?.collectionId && preferredRoute ? preferredRoute : firstPage?.route ?? "/");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Could not load content.";
      setError(message);
      setConnectionError(message);
    } finally { setLoading(false); }
  }, [user.email]);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);
  useEffect(() => { onBusyChange?.(busy || loading || reviewing); }, [busy, loading, reviewing, onBusyChange]);
  useEffect(() => { onPagePathChange?.(canvasRoute); }, [canvasRoute, onPagePathChange]);
  useEffect(() => {
    if (!currentTemplate || !chosenPreview) return;
    // Loading a different template's records is external async state; synchronize its selected live URL into the canvas route.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canvasRoute !== chosenPreview.route) { setPreviewReady(false); setCanvasRoute(chosenPreview.route); resetCanvasState(); }
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
    if (!publicSite || !previewReady) return;
    frame.current?.contentWindow?.postMessage({ type: "three-acts:mode", mode: busy || loading || reviewing ? "locked" : canvasMode }, publicSite.origin);
  }, [busy, loading, reviewing, canvasMode, previewReady]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!publicSite || event.origin !== publicSite.origin || event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "three-acts:ready") { setPreviewReady(true); sendPreview(); }
      if (event.data.type === "three-acts:navigate" && canvasMode === "preview" && !busy && !reviewing && typeof event.data.href === "string") {
        try {
          const url = new URL(event.data.href);
          if (url.origin !== publicSite.origin) { notify({ title: "Open external links with View site", duration: 4500 }); return; }
          const route = url.pathname.replace(/\/$/, "") || "/";
          const document = workspace?.documents.find((doc) => !doc.collectionId && doc.kind !== "design" && doc.id !== "shared" && doc.route === route);
          const preview = previews.items.find((item) => item.route === route);
          if (document) choosePage(document);
          else if (preview) choosePreview(preview.id);
          else notify({ title: "Choose this preview from the page picker", duration: 4500 });
        } catch { /* Ignore malformed navigation requests. */ }
      }
      if (event.data.type === "three-acts:canvas-tree" && Array.isArray(event.data.nodes)) {
        setCanvasNodes(readCanvasNodes(event.data.nodes));
      }
      if (event.data.type === "three-acts:clear-selection" || (event.data.type === "three-acts:selection" && event.data.selection === null)) setCanvasSelection(null);
      if (event.data.type === "three-acts:selection" && !busy && !reviewing && canvasMode === "design" && isCanvasSelection(event.data)) {
        setCanvasSelection(event.data);
        setEditingComponent(event.data.editingComponent ?? null);
        setSelectionVersion((version) => version + 1);
        const doc = workspace?.documents.find((item) => item.id === event.data.binding?.id);
        const path = event.data.binding?.path;
        const editableField = doc && typeof path === "string" && contentFields(drafts[doc.id]?.content ?? doc.content).some((field) => field.path.join(".") === path);
        if (editableField && doc.kind !== "design" && doc.id !== "shared") setPage(doc.id);
      }
      if (event.data.type === "three-acts:select" && !busy && !reviewing && canvasMode === "design") {
        const doc = workspace?.documents.find((item) => item.id === event.data.id);
        const path = event.data.path;
        if (!doc || typeof path !== "string" || !contentFields(drafts[doc.id]?.content ?? doc.content).some((field) => field.path.join(".") === path)) return;
        if (doc.kind !== "design" && doc.id !== "shared") setPage(doc.id);
        // Shared fields select their content document while keeping the current canvas page.
      }
      if (event.data.type === "three-acts:edit" && !busy && !reviewing && typeof event.data.id === "string" && typeof event.data.path === "string" && typeof event.data.value === "string") {
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
  }, [workspace, drafts, page, content, busy, reviewing, canvasMode, previews.items, sendPreview, notify]);

  function downloadRecovery() {
    if (!recovery) return;
    const url = URL.createObjectURL(new Blob([recovery], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "three-acts-recovered-drafts.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function selectPage(id: string) {
    if (busy) return;
    const next = workspace?.documents.find((doc) => doc.id === id);
    postCanvas({ type: "three-acts:clear-selection" });
    if (next && !next.collectionId && id !== "shared" && next.route !== canvasRoute) { setPreviewReady(false); setCanvasRoute(next.route); resetCanvasState(); }
    setCanvasSelection(null);
    setEditingComponent(null);
    setPage(id);
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
    if (canvasRoute !== item.route) { setPreviewReady(false); setCanvasRoute(item.route); resetCanvasState(); }
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
      setWorkspace((previous) => previous ? { ...previous, headSha: result.sha, documents: previous.documents.map((doc) => replacements.get(doc.id) ?? doc) } : previous);
      persist({});
      setReviewing(false);
      setCommit(result.url);
      setLastSynced(new Date());
      notify({ tone: "success", title: "Pushed to GitHub", description: "Your hosting service can now rebuild the site. View the commit in GitHub connection details.", duration: 7000 });
    } catch (pushError) {
      setError(pushError instanceof Error ? pushError.message : "Push failed. Your drafts are still saved.");
    } finally { setBusy(false); }
  }

  const frameUrl = publicSite && current && (!currentTemplate || (chosenPreview && canvasRoute === chosenPreview.route)) ? new URL(canvasRoute, publicSite).toString() : null;
  useEffect(() => {
    onViewSiteUrlChange?.(frameUrl);
    return () => onViewSiteUrlChange?.(null);
  }, [frameUrl, onViewSiteUrlChange]);
  const elementPresentation = getElementPresentation(canvasSelection?.tag ?? "div", canvasSelection?.category ?? "element");
  const controlsDisabled = busy || loading || reviewing;
  const connectionStatus = loading ? "Checking GitHub" : connectionError ? "Connection check failed" : workspace?.connected ? "Connected to GitHub" : "GitHub not connected";
  const reload = () => void load(page, canvasRoute);
  const toolbarActions = <section aria-label="GitHub source" className="grid gap-3 p-3">
    <div className="flex items-center gap-1.5 text-ui"><GitBranch size={14} className={workspace?.connected ? "text-cms-success" : "text-cms-muted"}/><strong className="flex-1 font-medium">GitHub source</strong><span className={connectionError ? "text-cms-danger" : "text-cms-subtle"}>{connectionStatus}</span></div>
    <dl className="m-0 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-ui">
      <dt className="text-cms-muted">Repository</dt><dd className="m-0 truncate" title={workspace?.repository ?? undefined}>{workspace?.repository ?? "Bundled demo content"}</dd>
      <dt className="text-cms-muted">Branch</dt><dd className="m-0 truncate">{workspace?.branch ?? "Not connected"}</dd>
    </dl>
    <div className="flex items-center gap-1.5">
      <Button aria-label="GitHub connection" variant="ghost" onClick={() => { onClosePublish?.(); setConnectionOpen(true); }} disabled={busy || reviewing} className="flex-1 justify-start px-0 text-cms-accent shadow-none">Connection details<ArrowUpRight size={12}/></Button>
      <Button aria-label="Reload from source" onClick={() => { onClosePublish?.(); reload(); }} disabled={controlsDisabled}><RefreshCw size={12} className={loading ? "animate-spin" : undefined}/>Reload from source</Button>
    </div>
    <p className="m-0 text-ui leading-4 text-cms-subtle">{workspace?.connected ? "Reload reads the latest branch content and keeps your browser drafts." : "Demo drafts stay in this browser. Connect a repository to push them."}</p>
    <div className="flex items-center justify-between gap-2 border-t border-cms-line pt-3">
      <span className="text-ui text-cms-muted">{changedCount} changed document{changedCount === 1 ? "" : "s"}</span>
      <Button aria-label="Review & push" disabled={!changedCount || controlsDisabled} onClick={() => { onClosePublish?.(); setReviewing(true); setError(""); }}><span>Review &amp; push</span><ArrowUpRight size={13}/></Button>
    </div>
  </section>;
  return <div className="designer-workspace flex min-h-0 min-w-0 flex-1 overflow-hidden bg-cms-bg text-cms-text">
    {toolbarHost && createPortal(toolbarActions, toolbarHost)}
    {notification && <div role="status" className={`${popupClass} fixed bottom-3.5 right-3.5 z-100 flex w-80 max-w-viewport-tight items-start gap-2.5 bg-cms-surface px-3 py-2.5 text-ui`}>
      {notification.tone === "success" ? <CheckCircle2 size={14} className="mt-px shrink-0 text-cms-success"/> : <Info size={14} className="mt-px shrink-0 text-cms-muted"/>}
      <div className="min-w-0 flex-1"><p className="m-0 font-semibold">{notification.title}</p>{notification.description && <p className="mb-0 mt-0.5 text-cms-muted">{notification.description}</p>}</div>
      <IconButton aria-label="Dismiss notification" className="size-5 border-transparent bg-transparent p-0 shadow-none" onClick={() => { if (notificationTimer.current !== null) window.clearTimeout(notificationTimer.current); setNotification(null); }}><X size={13}/></IconButton>
    </div>}
    <div className="flex min-h-0 w-56 shrink-0 flex-col border-r border-cms-line-strong bg-cms-bg max-sm:w-44">
      <div className="flex h-8 shrink-0 items-stretch border-b border-cms-line px-2" aria-label="Left panel">
        <button type="button" className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-1 text-ui focus-visible:outline-1 focus-visible:outline-cms-accent ${leftPanel === "pages" ? "border-cms-text text-cms-text" : "border-transparent text-cms-muted hover:text-cms-text"}`} aria-label="Pages panel" aria-pressed={leftPanel === "pages"} onClick={() => setLeftPanel("pages")}><File size={13}/>Pages</button>
        <button type="button" className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-1 text-ui focus-visible:outline-1 focus-visible:outline-cms-accent ${leftPanel === "navigator" ? "border-cms-text text-cms-text" : "border-transparent text-cms-muted hover:text-cms-text"}`} aria-label="Navigator panel" aria-pressed={leftPanel === "navigator"} onClick={() => setLeftPanel("navigator")}><Layers size={13}/>Navigator</button>
      </div>
      {leftPanel === "navigator" ? <Navigator nodes={canvasNodes} selected={canvasSelection?.selector ?? null} selectionVersion={selectionVersion} onSelect={(selector) => postCanvas({ type: "three-acts:select-node", selector })} disabled={busy || canvasMode === "preview" || !previewReady}/> : <aside className="flex min-h-0 flex-1 flex-col" aria-label="Pages">
      <PanelHeader className="h-8 min-h-8 gap-2 px-2"><File size={14}/><strong className="font-semibold">Pages</strong></PanelHeader>
      <div className="border-b border-cms-line px-2 py-1"><SearchInput ariaLabel="Search pages" placeholder="Find a page…" value={query} onChange={setQuery}/></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      <p className="px-2 pb-0 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">Static pages</p>
      <nav aria-label="Static pages">
        {workspace?.documents.filter((doc) => doc.kind !== "design" && doc.id !== "shared" && !doc.collectionId && `${doc.label} ${doc.route}`.toLowerCase().includes(query.toLowerCase())).map((doc) =>
          <div key={doc.id} className={`group flex h-[26px] w-full items-center pr-0.5 transition-colors hover:bg-cms-raised ${page === doc.id ? "bg-cms-raised" : ""}`}>
            <button title={`${doc.label} · ${doc.route}`} className={`flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left text-ui disabled:opacity-50 ${pageStates[doc.id].color}`} data-page-state={pageStates[doc.id].state} aria-description={pageStates[doc.id].label} aria-pressed={page === doc.id} onClick={() => {
              const select = () => selectPage(doc.id);
              if (onSelectPage) onSelectPage(doc.route, select);
              else select();
            }} disabled={busy}>
              <PageIcon route={doc.route} collectionId={doc.collectionId} size={13}/><span className="min-w-0 flex-1 truncate">{doc.label}</span>
            </button>
            <IconButton className="pointer-events-none size-6 shrink-0 border-transparent bg-transparent p-0 opacity-0 shadow-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100" aria-label={`Page details for ${doc.label}`} title="Page details" aria-pressed={pageDetailsPath === doc.route} onClick={() => onOpenPageDetails?.(doc.route, () => selectPage(doc.id))} disabled={busy}>
              <Settings size={12}/>
            </IconButton>
          </div>)}
        {workspace && !workspace.documents.some((doc) => doc.kind !== "design" && doc.id !== "shared" && !doc.collectionId && `${doc.label} ${doc.route}`.toLowerCase().includes(query.toLowerCase())) && <p className="px-2 py-2 text-ui text-cms-muted">No pages match your search.</p>}
      </nav>
      <p className="px-2 pb-0 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">CMS pages</p>
      <nav aria-label="CMS pages">
        {workspace?.documents.filter((doc) => Boolean(doc.collectionId) && `${doc.label} ${doc.route}`.toLowerCase().includes(query.toLowerCase())).map((doc) =>
          <div key={doc.id} className={`group flex h-[26px] w-full items-center pr-0.5 transition-colors hover:bg-cms-raised ${page === doc.id ? "bg-cms-raised" : ""}`}>
            <button title={`${doc.label} · ${doc.route}`} className={`flex h-full min-w-0 flex-1 items-center gap-2 px-2 text-left text-ui disabled:opacity-50 ${pageStates[doc.id].state === "saved" ? "text-violet-400" : pageStates[doc.id].color}`} data-page-state={pageStates[doc.id].state} aria-description={pageStates[doc.id].label} aria-pressed={page === doc.id} onClick={() => {
              const select = () => selectPage(doc.id);
              if (onSelectPage) onSelectPage(doc.route, select);
              else select();
            }} disabled={busy}>
              <PageIcon route={doc.route} collectionId={doc.collectionId} size={13}/><span className="min-w-0 flex-1 truncate">{doc.label}</span>
            </button>
            <IconButton className="pointer-events-none size-6 shrink-0 border-transparent bg-transparent p-0 opacity-0 shadow-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100" aria-label={`Page details for ${doc.label}`} title="Page details" aria-pressed={pageDetailsPath === doc.route} onClick={() => onOpenPageDetails?.(doc.route, () => selectPage(doc.id))} disabled={busy}>
              <Settings size={12}/>
            </IconButton>
          </div>)}
        {workspace && !workspace.documents.some((doc) => Boolean(doc.collectionId) && `${doc.label} ${doc.route}`.toLowerCase().includes(query.toLowerCase())) && <p className="px-2 py-2 text-ui text-cms-muted">No templates match your search.</p>}
      </nav>
      </div>
    </aside>}
    </div>

    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PanelHeader className="h-8 min-h-8 gap-1.5 px-2" render={<header aria-label="Canvas toolbar"/>}>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-ui">
          <PagePicker pageStates={pageStates} documents={workspace?.documents ?? []} current={current} previewItems={previews.items} chosenPreview={chosenPreview} previewsLoading={previews.loading} previewsError={previews.error} disabled={busy || loading || !workspace} onSelectPage={choosePage} onSelectPreview={choosePreview} onOpenDetails={(document) => onOpenPageDetails?.(document.route, () => selectPage(document.id))}/>
          <span className="hidden min-w-0 truncate text-cms-muted md:inline" title={canvasRoute}>{canvasRoute}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5" aria-label="Canvas mode">
          <IconButton className={`size-6 border-transparent bg-transparent shadow-none ${canvasMode === "design" ? "text-cms-accent" : ""}`} aria-label="Design mode" title="Design mode" aria-pressed={canvasMode === "design"} disabled={controlsDisabled} onClick={() => setCanvasMode("design")}><MousePointer2 size={14}/></IconButton>
          <IconButton className={`size-6 border-transparent bg-transparent shadow-none ${canvasMode === "preview" ? "text-cms-accent" : ""}`} aria-label="Preview mode" title="Preview mode" aria-pressed={canvasMode === "preview"} disabled={controlsDisabled} onClick={() => setCanvasMode("preview")}><Eye size={14}/></IconButton>
        </div>
        <span className="mx-0.5 h-4 shrink-0 border-r border-cms-line" aria-hidden="true"/>
        <div className="flex shrink-0 items-center gap-0.5" aria-label="Canvas width">{([{ id: "desktop", Icon: Monitor }, { id: "tablet", Icon: Tablet }, { id: "landscape", Icon: Tablet }, { id: "mobile", Icon: Smartphone }] as const).map(({ id, Icon }) => <IconButton key={id} className={`size-6 border-transparent bg-transparent shadow-none ${device === id ? "text-cms-accent" : ""}`} aria-label={`${id} preview`} title={`${id[0].toUpperCase()}${id.slice(1)} preview`} aria-pressed={device === id} onClick={() => { setDevice(id); setBreakpoint(id === "mobile" ? "base" : id); }}><Icon size={14}/></IconButton>)}</div>
        <span className="mx-0.5 h-4 shrink-0 border-r border-cms-line" aria-hidden="true"/>
        <IconButton aria-label="Discard drafts" title={`Discard all ${changedCount} content drafts`} className="size-6 border-transparent bg-transparent p-1 shadow-none" disabled={!changedCount || controlsDisabled} onClick={() => setDiscarding(true)}><Undo2 size={14}/></IconButton>
      </PanelHeader>
      <div className="flex min-h-0 flex-1 flex-col">
        {error && !reviewing && <div className="flex shrink-0 items-center gap-2 border-b border-cms-danger/40 bg-cms-danger/10 px-3 py-2 text-ui text-cms-danger" role="alert">{error}<Button variant="ghost" className="ml-auto" onClick={() => void load()} disabled={busy}>Retry</Button></div>}
        {recovery && <div className="flex shrink-0 items-center gap-2 border-b border-cms-pending/40 bg-cms-pending/10 px-3 py-2 text-ui text-cms-text" role="alert">Some saved drafts use older or invalid fields. Compatible drafts are restored, and a backup is kept in this browser.<Button variant="ghost" onClick={downloadRecovery}>Download draft backup</Button></div>}
        {stale.length > 0 && <div className="shrink-0 border-b border-cms-pending/40 bg-cms-pending/10 px-3 py-2 text-ui text-cms-text" role="alert">{stale.map((doc) => doc.label).join(", ")} changed on GitHub. Your drafts are preserved. Discard the affected drafts and reapply your edits before pushing.</div>}
        {!workspace ? <div className="grid min-h-0 flex-1 place-items-center p-6 text-center"><div className="max-w-sm"><Layers size={28} className="mx-auto text-cms-muted"/><h2 className="mt-3 text-ui-lg font-semibold">{loading ? "Opening your workspace…" : "Your content couldn't be loaded"}</h2><p className="my-2 text-ui text-cms-muted">The designer connects through the Three Acts API.</p><Button onClick={() => void load()} disabled={loading}>Try again</Button></div></div> : <>
          <div className="flex min-h-0 flex-1 overflow-auto bg-cms-bg">
            <div className="h-full min-h-80 shrink-0 overflow-hidden border border-cms-line-strong bg-cms-surface" style={{ width: widths[device] }}>
              {frameUrl ? <iframe key={frameRevision} ref={frame} title="Website canvas" src={frameUrl} sandbox="allow-scripts allow-same-origin" onLoad={sendPreview} className="h-full w-full border-0 bg-white"/> : <div className="grid h-full place-items-center p-6 text-center"><div>
                {currentTemplate && (!chosenPreview || canvasRoute !== chosenPreview.route) ? <>
                  <Layers size={28} className="mx-auto text-cms-muted"/>
                  <h2 className="mt-3 text-ui-lg font-semibold">{previews.loading || (chosenPreview && canvasRoute !== chosenPreview.route) ? "Loading preview…" : previews.error ? "Preview items couldn't be loaded" : "No published items to preview"}</h2>
                  <p className="mt-2 max-w-md text-ui text-cms-muted">{previews.error ?? (previews.loading ? "Loading published items from this collection." : "Publish an item in this collection to preview its page." )}</p>
                </> : <><Globe size={28} className="mx-auto text-cms-muted"/><h2 className="mt-3 text-ui-lg font-semibold">Connect your website</h2><p className="mt-2 max-w-md text-ui text-cms-muted">Set VITE_SITE_URL to your public website. Enable PUBLIC_EDITOR_PREVIEW and PUBLIC_EDITOR_ORIGIN on the web app for canvas editing.</p></>}
              </div></div>}
            </div>
          </div>
          {canvasSelection && <CanvasBreadcrumb selection={canvasSelection} disabled={busy || canvasMode === "preview"} onSelect={(selector) => postCanvas({ type: "three-acts:select-node", selector })}/>}
        </>}
      </div>
    </main>

    <div className="flex min-h-0 w-64 shrink-0 flex-col border-l border-cms-line-strong bg-cms-bg max-sm:w-60">
      <div className="flex h-8 shrink-0 items-stretch gap-4 border-b border-cms-line px-2" aria-label="Right panel">
        {isComponentSelection ? <span className="flex items-center border-b-2 border-cms-text px-0.5 text-ui text-cms-text">Properties</span> : <>
          <button type="button" className={`flex items-center gap-1.5 border-b-2 px-0.5 text-ui focus-visible:outline-1 focus-visible:outline-cms-accent ${rightPanel === "style" ? "border-cms-text text-cms-text" : "border-transparent text-cms-muted hover:text-cms-text"}`} aria-label="Style panel" aria-pressed={rightPanel === "style"} onClick={() => setRightPanel("style")}><SlidersHorizontal size={12}/>Style</button>
          <button type="button" className={`flex items-center gap-1.5 border-b-2 px-0.5 text-ui focus-visible:outline-1 focus-visible:outline-cms-accent ${rightPanel === "content" ? "border-cms-text text-cms-text" : "border-transparent text-cms-muted hover:text-cms-text"}`} aria-label="Content panel" aria-pressed={rightPanel === "content"} onClick={() => setRightPanel("content")}><Type size={12}/>Content</button>
        </>}
      </div>
      {editingComponent && <div aria-label="Main component editing" className="grid gap-1 border-b border-cms-line bg-cms-success/10 px-2 py-2 text-ui"><div className="flex items-center justify-between gap-2"><strong className="min-w-0 truncate font-medium">Editing {componentDefinitions[editingComponent]?.label ?? editingComponent}</strong><Tooltip content="Exit main component editing"><IconButton aria-label="Done editing component" className="size-5 shrink-0 border-transparent bg-transparent p-0 shadow-none" disabled={controlsDisabled} onClick={() => postCanvas({ type: "three-acts:exit-component" })}><X size={12}/></IconButton></Tooltip></div><span className="text-cms-muted">Changes apply to all instances</span></div>}
      <div aria-label="Selected element" className="flex h-8 shrink-0 items-center gap-1.5 border-b border-cms-line px-2 text-ui">
        <elementPresentation.Icon aria-hidden="true" size={13} className={`shrink-0 ${elementPresentation.color}`}/>
        <span className="min-w-0 flex-1 truncate" title={canvasSelection?.label}>{canvasSelection?.label ?? "No selection"}</span>
        {canvasSelection && <span className="shrink-0 font-mono text-[10px] text-cms-subtle">{canvasSelection.tag}</span>}
      </div>
      {isComponentSelection && canvasSelection ? <ComponentInspector templateInstance={Boolean(currentTemplate)} selection={canvasSelection} onResetProperty={key => updateDesign(next => {
        const id = canvasSelection.component?.instanceId;
        if (!id || !next.instances[id]) return;
        delete next.instances[id].props[key];
        if (!Object.keys(next.instances[id].props).length) delete next.instances[id];
      })} resolveSourceField={binding => {
        const document = workspace?.documents.find(document => document.id === binding.id);
        return document ? contentFields(document.content).find(field => field.path.join(".") === binding.path) : undefined;
      }} disabled={controlsDisabled || canvasMode === "preview"} resolveField={resolveSelectedField} onField={(field, value, id) => changeField(field, value, id)} onProperty={(key, value) => {
        const component = canvasSelection.component;
        if (!component?.instanceId) return;
        updateDesign(next => {
          const stored = next.instances[component.instanceId!];
          const entry = stored?.component === component.name ? stored : { component: component.name, props: {} };
          const sourceValue = component.sourceProps?.[key] ?? componentDefinitions[component.name].defaultVariants[key];
          if (value === sourceValue) delete entry.props[key];
          else entry.props[key] = value;
          if (Object.keys(entry.props).length) next.instances[component.instanceId!] = entry;
          else delete next.instances[component.instanceId!];
        });
      }} onEnter={() => { setRightPanel("style"); postCanvas({ type: "three-acts:enter-component", selector: canvasSelection.selector }); }}/> : rightPanel === "style" ? <StyleInspector key={canvasSelection?.selector ?? "empty"} selection={canvasSelection} design={design} breakpoint={breakpoint} onBreakpointChange={changeBreakpoint} onChange={style => updateDesign(next => writeSelectedStyle(next, style))} onCustomCss={(selector, declarations, style) => updateDesign(next => { next.customCss[selector] = declarations; writeSelectedStyle(next, style); })} disabled={controlsDisabled || canvasMode === "preview"}/> : <Inspector content={content} canvasSelection={canvasSelection} resolveField={resolveSelectedField} onChange={(field, value, documentId) => changeField(field, value, documentId ?? contentDocument?.id ?? page)} disabled={controlsDisabled || canvasMode === "preview"}/>}
    </div>
    {reviewing && workspace && <Review drafts={drafts} workspace={workspace} message={message} onMessage={setMessage} busy={busy} error={error} onClose={() => { setReviewing(false); setError(""); }} onPush={() => void push()}/>}
    {connectionOpen && <GitHubConnection workspace={workspace} loading={loading} error={connectionError} lastSynced={lastSynced} lastCommit={commit} onReload={reload} onClose={() => setConnectionOpen(false)}/>}
    <ConfirmDialog open={discarding} onOpenChange={setDiscarding} title="Discard drafts?" description={`Discard all ${changedCount} content drafts and return to the latest loaded source? This includes shared content and drafts on other pages.`} confirmLabel="Discard drafts" onConfirm={() => { persist({}); notify({ title: "Drafts discarded", duration: 4500 }); }}/>
  </div>;
}
