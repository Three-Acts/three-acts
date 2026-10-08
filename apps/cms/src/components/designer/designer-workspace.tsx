import {readSourcePreview,writeSourcePreview,sourcePreviewKey} from "./source-preview";
import { readSourceReference, sourceId, validateSourceContent } from '@three-acts/editor-source';
import { CanvasSizeControls } from "./canvas-size-controls";
import { CanvasViewport } from "./canvas-viewport";
import { clampViewportWidth, viewportBreakpoint, viewportPresets, type CanvasZoom } from "./viewport-model";
import { isCmsPreviewTemplateCollection, type CmsSource } from "@three-acts/cms-schema";
import { useCmsDraftPreview } from "./use-cms-draft-preview";
import { resolveCmsDraftRoute } from "./cms-draft-preview";
import { CmsSourceInspector } from "./cms-source-inspector";
import { isCanvasSelection, readCanvasNodes, readCanvasTreeStatus } from "./canvas-contract";
import { additionLocation, insertAddition, moveAddition, removeAddition, componentDefinitions, emptyDesign, validateDesign, type Breakpoint, type DesignDocument, type StyleChange } from "@three-acts/design";
import { historyShortcut, type HistoryCommand } from "@three-acts/utils";
import { useDraftHistory } from "./use-draft-history";
import type { HistoryEdit } from "./history";
import { ComponentInspector } from "./component-inspector";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, CheckCircle2, Eye, File, GitBranch, Globe, Info, Layers, MousePointer2, RefreshCw, Settings, SlidersHorizontal, Type, Undo2, Redo2, RotateCcw, X } from "lucide-react";
import { contentFields, validateContent, defaultLayout, duplicateSection, insertSection, moveSection, homeSections, layoutLimits, layoutSources, readLayoutSource, validateLayout, type HomeCopy, type HomeSectionType, type LayoutDocument, type ContentField, type ContentObject, type EditorChange, type EditorDocument, type EditorPushResult, type EditorWorkspace } from "@three-acts/static-content";
import { AddedElementActions, InsertElement, SectionActions } from "./composition-controls";
import { copiedSectionSourceEdits, copySectionDesign } from "./composition-model";
import { reconcilePublication, type PublicationSource } from "./publication-source";
import type { PublicationStatus } from "../../hooks/use-publication";
import type { AuthUser } from "@three-acts/auth";
import { Button, ConfirmDialog, IconButton, PanelHeader, SearchInput, Tooltip, type ToastOptions } from "../atoms";
import { popupClass } from "../atoms/styles";
import { editDesignerSource, loadDesignerWorkspace, pushDesignerChanges } from "./client";
import { draftKey, readDrafts, sameContent, updateField, type Drafts } from "./drafts";
import { Inspector } from "./inspector";
import { Review } from "./review";
import { useCmsPagePreviews } from "./use-cms-page-previews";
import { PagePicker } from "./page-picker";
import { PageIcon } from "./page-icon";
import { Navigator } from "./navigator";
import { StyleInspector } from "./style-inspector";
import type { CanvasNode, CanvasSelection, CanvasTreeStatus } from "./canvas-types";
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

export function DesignerWorkspace({ active = true, onOpenCmsRecord, user, onPagePathChange, onBusyChange, onUnsavedChange, onOpenPageDetails, onSelectPage, pageDetailsPath, pageDetailsDirty = false, pagePublishStatuses, onTemplateDetailsChange, toolbarHost, onClosePublish, onViewSiteUrlChange, onPublicationSourceChange, publicationLocked = false, publicationStatus }: {
  user: AuthUser;
  active?: boolean;
  onOpenCmsRecord?: (source: CmsSource) => void;
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
  onPublicationSourceChange?: (source: PublicationSource | null) => void;
  publicationLocked?: boolean;
  publicationStatus?: PublicationStatus | null;
}) {
  const [workspace, setWorkspace] = useState<EditorWorkspace | null>(null);
  const history = useDraftHistory();
  const drafts = history.drafts;
  const { reset: resetHistory, endGroup, undo: undoDrafts, redo: redoDrafts } = history;
  const root = useRef<HTMLDivElement>(null);
  const [recovery, setRecovery] = useState<string | null>(null);
  const [page, setPage] = useState("home");
  const [canvasRoute, setCanvasRoute] = useState("/");
  const [query, setQuery] = useState("");
  const [canvasSelection, setCanvasSelection] = useState<CanvasSelection | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [sourceReferences,setSourceReferences]=useState<Array<{section: import("@three-acts/static-content").LayoutSource;source:import("@three-acts/editor-source").SourceReference}>>([]);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [treeStatus, setTreeStatus] = useState<CanvasTreeStatus | null>(null);
  const [leftPanel, setLeftPanel] = useState<"pages" | "navigator">("navigator");
  const inspectorKey = `three-acts:editor:inspector:v1:${user.id}`;
  const [rightPanel, setRightPanel] = useState<"content" | "style">(() => {
    try { return localStorage.getItem(inspectorKey) === "content" ? "content" : "style"; } catch { return "style"; }
  });
  function chooseRightPanel(panel: "content" | "style") {
    setRightPanel(panel);
    try { localStorage.setItem(inspectorKey, panel); } catch { /* The current tab still retains the preference. */ }
  }
  const [canvasMode, setCanvasMode] = useState<"design" | "preview">("design");
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(viewportPresets.desktop);
  const [canvasZoom, setCanvasZoom] = useState<CanvasZoom>("fit");
  const [resolvedZoom, setResolvedZoom] = useState(1);
  const [error, setError] = useState("");
  const [sourceBusy, setBusy] = useState(false);
  const busy = sourceBusy || publicationLocked;
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
  const [previewVersion, setPreviewVersion] = useState<"published" | "draft">("published");
  const [cmsReadySession, setCmsReadySession] = useState<string | null>(null);
  const [previewIds, setPreviewIds] = useState<Record<string, string>>({});
  const frame = useRef<HTMLIFrameElement>(null);
  const pendingSectionSelection = useRef<string | null>(null);
  const [renderedLayout, setRenderedLayout] = useState("");
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
  const previews = useCmsPagePreviews(currentTemplate?.collectionId, currentTemplate?.route, previewVersion, active);
  const chosenPreview = useMemo(() => previews.items.find((item) => item.id === previewIds[page]) ?? (previewIds[page] && currentTemplate ? {
    id: previewIds[page], label: "Unavailable CMS item", route: currentTemplate.route,
    publishStatus: "not_published" as const, liveRoute: null, draftRoute: null,
  } : previews.items[0] ?? null), [previews.items, previewIds, page, currentTemplate]);
  const isCmsDraft = Boolean(currentTemplate && chosenPreview && (previewVersion === "draft" || !chosenPreview.liveRoute));
  const rawCollection = currentTemplate?.collectionId;
  const draftCollection = isCmsPreviewTemplateCollection(rawCollection) ? rawCollection : null;
  const frameTarget = `${draftCollection}:${chosenPreview?.id}:${isCmsDraft}:${frameRevision}`;
  const cmsSession = useMemo(() => ({ target: frameTarget, id: crypto.randomUUID() }), [frameTarget]).id;
  const cmsDraft = useCmsDraftPreview(active && isCmsDraft, cmsSession, draftCollection, chosenPreview?.id ?? null);
  const templateContent = currentTemplate ? drafts[currentTemplate.id]?.content ?? currentTemplate.content : null;
  const changedCount = Object.keys(drafts).length;
  const designDocument = workspace?.documents.find(document => document.id === "design");
  const savedDesign = (drafts.design?.content ?? designDocument?.content ?? emptyDesign()) as unknown as DesignDocument;
  // Source class drafts are a canvas preview only; their durable changes are
  // authored Astro/TSX files, not entries in the design document.
  const design = useMemo(() => {
    const preview=structuredClone(savedDesign);
    for(const [id,draft] of Object.entries(drafts)) if(id.startsWith('source:')) {
      for(const edit of validateSourceContent(draft.content).edits) {
        if(edit.target.startsWith('component:')) {
          const [,name,part]=edit.target.split(':');
          (preview.components[name]??={parts:{}}).parts[part]=edit.style;
        } else preview.elements[edit.target]=edit.style;
      }
    }
    return preview;
  }, [savedDesign,drafts]);
  const previewDesign=useMemo(()=>{
    const preview=structuredClone(design);
    for(const doc of workspace?.documents??[]) if(doc.kind==='source') {
      for(const edit of validateSourceContent(doc.content).edits) {
        if(drafts[doc.id]) continue;
        if(edit.target.startsWith('component:')) {
          const [,name,part]=edit.target.split(':');
          (preview.components[name]??={parts:{}}).parts[part]=edit.style;
        } else preview.elements[edit.target]=edit.style;
      }
    }
    return preview;
  },[design,workspace,drafts]);
  const layoutDocument = workspace?.documents.find(document => document.id === "layout");
  const layout = (drafts.layout?.content ?? layoutDocument?.content ?? defaultLayout()) as unknown as LayoutDocument;
  const selectedSection = canvasSelection?.section && layout.pages.home.sections[canvasSelection.section.id]?.type === canvasSelection.section.type ? canvasSelection.section.id : null;
  const layoutSignature = JSON.stringify(layoutSources(layout));
  const compositionEnabled = page === "home" && Boolean(layoutDocument) && active && !busy && !loading && !reviewing && canvasMode === "design" && previewReady && renderedLayout === layoutSignature;
  function persistLayout(next: LayoutDocument, label: string, nextDesign?: DesignDocument, sourceDrafts?: Drafts) {
    const updates = { layout: validateLayout(next) as unknown as ContentObject, ...(nextDesign ? { design: validateDesign(nextDesign) as unknown as ContentObject } : {}) };
    const nextDrafts = { ...drafts, ...sourceDrafts };
    for (const [id, content] of Object.entries(updates)) {
      const document = workspace?.documents.find(doc => doc.id === id);
      if (!document) throw new Error("Composition source is unavailable. Reload the workspace.");
      const original = nextDrafts[id]?.original ?? document.content;
      if (sameContent(content, original)) delete nextDrafts[id];
      else nextDrafts[id] = { content, original, sha: nextDrafts[id]?.sha ?? document.sha };
    }
    persist(nextDrafts, { label });
  }
  function compose(action: () => void) {
    if (!compositionEnabled) return;
    try { endGroup(); action(); setError(""); }
    catch (error) { setError(error instanceof Error ? error.message : "Section change couldn't be saved."); }
  }
  function insert(type: HomeSectionType) {
    compose(() => {
      const home = drafts.home?.content ?? workspace?.documents.find(doc => doc.id === "home")?.content;
      if (!home) throw new Error("Home source is unavailable.");
      const id = `section-${crypto.randomUUID()}`;
      persistLayout(insertSection(layout, type, id, home as HomeCopy, selectedSection ?? undefined), "insert section");
      pendingSectionSelection.current = id;
    });
  }
  async function duplicate() {
    if(!compositionEnabled||!selectedSection||!workspace)return;
    endGroup();setError('');setBusy(true);
    try {
      const home=drafts.home?.content??workspace.documents.find(doc=>doc.id==='home')?.content;
      if(!home)throw new Error('Home source is unavailable.');
      const id=`section-${crypto.randomUUID()}`,type=layout.pages.home.sections[selectedSection].type;
      const copiedSources:Drafts={};
      const documents=new Map(workspace.documents.filter(doc=>doc.kind==='source').map(doc=>[doc.id,doc]));
      for(const ref of sourceReferences.filter(ref=>ref.section.id===selectedSection)) {
        const key=sourceId(ref.source.path);if(documents.get(key)?.sourceStyles!==undefined)continue;
        const result=await editDesignerSource(ref.source,[]);documents.set(key,result.document);
      }
      setWorkspace(previous=>previous?{...previous,documents:[...previous.documents.filter(doc=>!documents.has(doc.id)),...documents.values()]}:previous);
      for(const document of documents.values()) {
        const draft=drafts[document.id],edits=draft?validateSourceContent(draft.content).edits:[];
        const copies=copiedSectionSourceEdits(type,selectedSection,id,document.sourceStyles??[],edits);
        if(!copies.length)continue;
        const result=await editDesignerSource({path:document.sourcePath!,start:copies[0].start,sha:draft?.sha??document.sha},[...edits,...copies]);
        copiedSources[document.id]={content:result.content,original:draft?.original??result.document.content,sha:draft?.sha??result.document.sha};
      }
      const nextDesign=copySectionDesign(savedDesign,type,selectedSection,id);
      persistLayout(duplicateSection(layout,selectedSection,id,home as HomeCopy),'duplicate section',nextDesign,copiedSources);
      pendingSectionSelection.current=id;
    } catch(error){setError(error instanceof Error?error.message:'Section could not be duplicated.');}
    finally{setBusy(false);}
  }
  function move(id: string, delta: number) {
    compose(() => { const index = layout.pages.home.order.indexOf(id); const target = index + delta; if (index >= 0 && target >= 0 && target < layout.pages.home.order.length) persistLayout(moveSection(layout, id, target), "reorder section"); });
  }
  function reorder(id: string, targetId: string) {
    compose(() => { const target = layout.pages.home.order.indexOf(targetId); if (target >= 0 && id !== targetId) persistLayout(moveSection(layout, id, target), "reorder section"); });
  }
  function toggleSection() {
    compose(() => { if (!selectedSection) return; const next = structuredClone(layout); next.pages.home.sections[selectedSection].hidden = !next.pages.home.sections[selectedSection].hidden; persistLayout(next, "section visibility"); });
  }
  function resolveSourceField(binding: { id: string; path: string }): ContentField | undefined {
    const document = workspace?.documents.find(doc => doc.id === binding.id);
    const field = document ? contentFields(document.content).find(field => field.path.join(".") === binding.path) : undefined;
    if (field || binding.id !== "layout") return field;
    const parts = binding.path.split(".");
    const section = parts[0] === "pages" && parts[1] === "home" && parts[2] === "sections" && parts[4] === "content" ? layout.pages.home.sections[parts[3]] : null;
    const home = workspace?.documents.find(doc => doc.id === "home");
    if (!section || !home) return undefined;
    const sourcePath = [homeSections[section.type].group, ...parts.slice(5)].join(".");
    const source = contentFields(home.content).find(field => field.path.join(".") === sourcePath);
    return source ? { path: parts, value: source.value } : undefined;
  }
  const isComponentSelection = Boolean((canvasSelection?.component || canvasSelection?.category === "component") && !canvasSelection?.editingComponent);
  function updateDesign(change: (design: DesignDocument) => void) {
    if (!designDocument || busy || loading || reviewing) return;
    const next = structuredClone(savedDesign);
    change(next);
    const validated = validateDesign(next) as unknown as ContentObject;
    const nextDrafts = { ...drafts };
    const original = nextDrafts.design?.original ?? designDocument.content;
    if (sameContent(validated, original)) delete nextDrafts.design;
    else nextDrafts.design = { content: validated, sha: nextDrafts.design?.sha ?? designDocument.sha, original };
    persist(nextDrafts, { label: "design change" });
  }
  async function changeElementStyle(style: StyleChange) {
    const selection=canvasSelection;
    if (!selection?.source || !selection.designTarget) {
      updateDesign(next=>writeSelectedStyle(next,style)); return;
    }
    if (busy || loading || reviewing) return;
    const source=selection.source, id=sourceId(source.path), existing=drafts[id];
    const selectedTarget=selection.designTarget.kind==='element'?selection.designTarget.id:`component:${selection.designTarget.component}:${selection.designTarget.part}`;
    const edits=existing ? validateSourceContent(existing.content).edits : [];
    const nextEdits=edits.filter(edit=>edit.start!==source.start || edit.target!==selectedTarget);
    if(style.utilities.length || style.customClasses.length) nextEdits.push({start:source.start,target:selectedTarget,style});
    setBusy(true);setError('');
    try {
      const result=await editDesignerSource(source,nextEdits);
      const nextDrafts={...drafts};
      if(nextEdits.length) nextDrafts[id]={content:result.content,original:existing?.original ?? result.document.content,sha:existing?.sha ?? result.document.sha};
      else delete nextDrafts[id];
      // Migrate an existing legacy style into the source edit atomically.
      if(designDocument && (selection.designTarget.kind==='component' || savedDesign.elements[selectedTarget])) {
        const next=structuredClone(savedDesign);
        if(selection.designTarget.kind==='element')delete next.elements[selectedTarget];
        else if(next.components[selection.designTarget.component]) delete next.components[selection.designTarget.component].parts[selection.designTarget.part];
        const original=nextDrafts.design?.original ?? designDocument.content;
        const content=next as unknown as ContentObject;
        if(sameContent(content,original))delete nextDrafts.design;
        else nextDrafts.design={content,original,sha:nextDrafts.design?.sha ?? designDocument.sha};
      }
      setWorkspace(previous=>previous ? {...previous,documents:previous.documents.some(doc=>doc.id===id) ? previous.documents : [...previous.documents,result.document]} : previous);
      persist(nextDrafts,{label:'style change'});
    } catch(error) {setError(error instanceof Error?error.message:'Could not edit element source.');}
    finally {setBusy(false);}
  }
  const insertionAnchor = canvasSelection?.designTarget?.kind === "element" ? canvasSelection.designTarget.id : canvasSelection?.component?.instanceId;
  const insertionEnabled = Boolean(insertionAnchor && designDocument && active && !busy && !loading && !reviewing && !cmsDraft.loading && previewReady && canvasMode === "design" && !editingComponent);
  const selectedAddition = insertionAnchor ? additionLocation(design.additions ?? {}, insertionAnchor) : null;
  const additionPeers = selectedAddition ? (design.additions?.[selectedAddition.anchor] ?? []).filter(node => node.position === selectedAddition.node.position) : [];
  function additionAction(action: "up" | "down" | "duplicate" | "remove") {
    if (!selectedAddition || !insertionEnabled) return;
    updateDesign(next => {
      const additions = next.additions!;
      const id = selectedAddition.node.id;
      if (action === "up" || action === "down") moveAddition(additions, id, action === "up" ? -1 : 1);
      else if (action === "remove") {
        for (const removed of removeAddition(additions, id)) { delete next.elements[removed]; delete next.instances[removed]; }
        if (!Object.keys(additions).length) delete next.additions;
      } else {
        const clone = (sourceId: string): string => {
          const location = additionLocation(additions, sourceId)!;
          const copyId = `added-${crypto.randomUUID()}`;
          const children = structuredClone(additions[sourceId] ?? []);
          insertAddition(additions, sourceId, {...structuredClone(location.node), id:copyId, position:"after"});
          if (next.elements[sourceId]) next.elements[copyId] = structuredClone(next.elements[sourceId]);
          if (next.instances[sourceId]) next.instances[copyId] = structuredClone(next.instances[sourceId]);
          for (const child of children) {
            const childId = clone(child.id);
            const cloned = additionLocation(additions, childId)!;
            additions[cloned.anchor].splice(cloned.index,1);
            (additions[copyId] ??= []).push({...cloned.node,position:child.position});
          }
          return copyId;
        };
        clone(id);
      }
    });
  }
  function addElement(type: string) {
    if (!insertionEnabled || !insertionAnchor || !canvasSelection) return;
    const inside = (["div", "section", "main", "header", "footer", "nav", "article", "aside", "li"].includes(canvasSelection.tag) || canvasSelection.tag === "ul" && type === "li") && (!canvasSelection.component || ["Grid.Root", "Section.Root", "Section.Container"].includes(canvasSelection.component.name));
    const id = `added-${crypto.randomUUID()}`;
    updateDesign(next => {
      next.additions ??= {};
      insertAddition(next.additions, insertionAnchor, { id, type, position: inside ? "inside" : "after", text: ["div", "section", "ul", "img", "Grid.Root", "Section.Root", "Section.Container"].includes(type) ? "" : type === "p" ? "New paragraph" : type === "a" || type.startsWith("Button.") ? "New link" : "New heading", attributes: type === "img" ? { src: "/og-default.png", alt: "" } : type === "a" || type === "Button.Link" ? { href: "/" } : {} });
    });
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
    setViewportWidth(viewportPresets[value === "base" ? "mobile" : value]);
  }
  function resolveSelectedField(binding: { id: string; path: string }) {
    const document = workspace?.documents.find(document => document.id === binding.id);
    const saved = document ? drafts[document.id]?.content ?? document.content : null;
    return saved ? contentFields(saved).find(field => field.path.join(".") === binding.path) : undefined;
  }
  const stale = workspace?.documents.filter((document) => drafts[document.id] && drafts[document.id].sha !== document.sha) ?? [];

  function postCanvas(data: Record<string, unknown>) {
    if (publicSite && previewReady) frame.current?.contentWindow?.postMessage({ ...data, ...(isCmsDraft ? { session: cmsSession } : {}) }, publicSite.origin);
  }

  function resetCanvasState() {
    setSourceReferences([]);
    pendingSectionSelection.current = null;
    setRenderedLayout("");
    setCanvasSelection(null);
    setCanvasNodes([]);
    setTreeStatus(null);
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
      const cached=readSourcePreview(sourcePreviewKey(next,user.email));
      const verified=(await Promise.all(cached.map(async (doc):Promise<EditorDocument|null>=>{
        try {const result=await editDesignerSource({path:doc.sourcePath!,start:0,sha:doc.sha},[]);return {...result.document,content:{...result.document.content,edits:doc.content.edits}};}
        catch{return null;}
      }))).filter((doc):doc is EditorDocument=>doc!==null);
      setWorkspace({...next,documents:[...next.documents,...verified]});
      setCommit(null);
      setLastSynced(new Date());
      const saved = readDrafts(draftKey(next, user.email));
      const restored=unsavedStorageDrafts.current ?? saved.drafts;
      const sourceDocuments=Object.entries(restored).filter(([id])=>id.startsWith('source:')).map(([id,draft])=>({id,label:id.split('/').at(-1)!,route:'/',kind:'source' as const,sourcePath:id.slice(7),content:draft.original,sha:draft.sha}));
      if(sourceDocuments.length)setWorkspace({...next,documents:[...next.documents,...verified.filter(doc=>!sourceDocuments.some(source=>source.id===doc.id)),...sourceDocuments]});
      resetHistory(restored);
      setRecovery(saved.recovery);
      const firstPage = next.documents.find((document) => document.id === preferredPage && !document.kind && document.id !== "shared") ?? next.documents.find((document) => !document.kind && document.id !== "shared");
      setPage(firstPage?.id ?? "shared");
      setCanvasRoute(firstPage?.collectionId && preferredRoute ? preferredRoute : firstPage?.route ?? "/");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Could not load content.";
      setError(message);
      setConnectionError(message);
    } finally { setLoading(false); }
  }, [user.email, resetHistory]);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);
  useEffect(() => { onBusyChange?.(active && (busy || loading || reviewing)); }, [active, busy, loading, reviewing, onBusyChange]);
  useEffect(() => { onPagePathChange?.(canvasRoute); }, [canvasRoute, onPagePathChange]);
  useEffect(() => {
    if (!currentTemplate || !chosenPreview) return;
    // Loading a different template's records is external async state; synchronize its selected live URL into the canvas route.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canvasRoute !== chosenPreview.route) { setCanvasRoute(chosenPreview.route); if (!isCmsDraft) { setPreviewReady(false); resetCanvasState(); } }
  }, [currentTemplate, chosenPreview, canvasRoute, isCmsDraft]);
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
    onUnsavedChange?.(active && storageUnavailable && changedCount > 0);
    return () => onUnsavedChange?.(false);
  }, [active, storageUnavailable, changedCount, onUnsavedChange]);
  useEffect(() => {
    if (!changedCount) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changedCount]);

  const saveDrafts = useCallback((next: Drafts) => {
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
  }, [key]);

  const publicationLatest = useRef({ workspace, drafts });
  useEffect(() => { publicationLatest.current = { workspace, drafts }; }, [workspace, drafts]);
  const acknowledgePublication = useCallback((result: EditorPushResult, reviewed: EditorChange[], repository: string, branch: string, baseRevision: string) => {
    const latest = publicationLatest.current;
    if (!latest.workspace || latest.workspace.repository !== repository || latest.workspace.branch !== branch) return;
    const reconciled = reconcilePublication(latest.workspace, latest.drafts, result, reviewed, baseRevision);
    if (!reconciled) return; // Status polls must not reset newer edit history.
    writeSourcePreview(sourcePreviewKey(latest.workspace,user.email),result.documents);
    publicationLatest.current = reconciled;
    setWorkspace(reconciled.workspace);
    resetHistory(reconciled.drafts);
    saveDrafts(reconciled.drafts);
    setCommit(result.url);
    setLastSynced(new Date());
  }, [resetHistory, saveDrafts, user.email]);
  const publicationSource = useMemo<PublicationSource>(() => ({ workspace, drafts, busy: sourceBusy || loading || reviewing, storageUnavailable, acknowledge: acknowledgePublication }), [workspace, drafts, sourceBusy, loading, reviewing, storageUnavailable, acknowledgePublication]);
  useEffect(() => { onPublicationSourceChange?.(publicationSource); }, [onPublicationSourceChange, publicationSource]);
  useEffect(() => () => onPublicationSourceChange?.(null), [onPublicationSourceChange]);

  function persist(next: Drafts, edit: HistoryEdit | null) {
    if (edit) history.record(next, edit);
    else resetHistory(next);
    saveDrafts(next);
  }
  const runHistory = useCallback((command: HistoryCommand) => {
    if (!active || busy || loading || reviewing || canvasMode !== "design") return;
    saveDrafts(command === "undo" ? undoDrafts() : redoDrafts());
  }, [active, busy, loading, reviewing, canvasMode, saveDrafts, undoDrafts, redoDrafts]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const command = historyShortcut(event);
      const target = event.target;
      if (event.defaultPrevented || !(target instanceof Element) || target.closest("input,textarea,select,[role=combobox],[contenteditable],[role=dialog],[role=alertdialog]")) return;
      if (!root.current?.contains(target) && target !== document.body) return;
      if (!active || busy || loading || reviewing || canvasMode !== "design" || document.querySelector("[role=dialog],[role=alertdialog]")) return;
      if (event.key === "Escape" && canvasSelection && publicSite && previewReady) {
        event.preventDefault();
        endGroup();
        frame.current?.contentWindow?.postMessage({ type: "three-acts:clear-selection", ...(isCmsDraft ? { session: cmsSession } : {}) }, publicSite.origin);
        return;
      }
      if (!command) return;
      event.preventDefault();
      runHistory(command);
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [active, runHistory, busy, loading, reviewing, canvasMode, canvasSelection, previewReady, endGroup, isCmsDraft, cmsSession]);

  function changeField(field: ContentField, value: string | number | boolean, id = page, typing = true) {
    const document = workspace?.documents.find((item) => item.id === id);
    const targetContent = drafts[id]?.content ?? document?.content;
    if (!document || !targetContent || busy) return;
    const updated = updateField(targetContent, field.path, value);
    const next = { ...drafts };
    const original = next[id]?.original ?? document.content;
    if (sameContent(updated, original)) delete next[id];
    else next[id] = { content: updated, sha: next[id]?.sha ?? document.sha, original };
    persist(next, { label: "content change", ...(typing && typeof value === "string" ? { group: `${id}:${field.path.join(".")}` } : {}) });
  }

  const sendPreview = useCallback(() => {
    // A newly mounted iframe starts at about:blank on the CMS origin. Wait
    // for the origin-checked ready message before sending site content.
    if (!workspace || !publicSite || !previewReady) return;
    frame.current?.contentWindow?.postMessage({
      type: "three-acts:preview",
      ...(isCmsDraft ? { session: cmsSession } : {}),
      documents: workspace.documents.filter(doc=>doc.kind!=="source").map((doc) => ({ id: doc.id, content: doc.id === "design" ? previewDesign : drafts[doc.id]?.content ?? doc.content }))
    }, publicSite.origin);
  }, [workspace, drafts, previewReady, isCmsDraft, cmsSession, previewDesign]);

  useEffect(() => { sendPreview(); }, [sendPreview, previewReady]);
  useEffect(() => {
    if (!publicSite || !previewReady) return;
    frame.current?.contentWindow?.postMessage({ type: "three-acts:mode", mode: !active || busy || loading || reviewing || cmsDraft.loading ? "locked" : canvasMode, ...(isCmsDraft ? { session: cmsSession } : {}) }, publicSite.origin);
  }, [active, busy, loading, reviewing, canvasMode, previewReady, cmsDraft.loading, isCmsDraft, cmsSession]);
  useEffect(() => {
    if (!active || !isCmsDraft || !publicSite || cmsReadySession !== cmsSession || cmsDraft.loading) return;
    if (cmsDraft.preview) frame.current?.contentWindow?.postMessage({ type: "three-acts:cms-preview", preview: cmsDraft.preview }, publicSite.origin);
    else if (cmsDraft.error) frame.current?.contentWindow?.postMessage({ type: "three-acts:cms-preview-error", session: cmsSession, sequence: cmsDraft.sequence, message: cmsDraft.error.slice(0, 300) }, publicSite.origin);
  }, [active, isCmsDraft, cmsReadySession, cmsSession, cmsDraft.loading, cmsDraft.preview, cmsDraft.error, cmsDraft.sequence]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!publicSite || event.origin !== publicSite.origin || event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== "object") return;
      if (isCmsDraft ? event.data.session !== cmsSession : event.data.session !== undefined) return;
      if (event.data.type === "three-acts:cms-preview-ready" && event.data.collectionId === draftCollection && event.data.recordId === chosenPreview?.id) setCmsReadySession(cmsSession);
      if (event.data.type === "three-acts:cms-preview-retry" && active && !busy && !reviewing) { cmsDraft.refresh(); previews.refresh(); }
      if (event.data.type === "three-acts:history" && ["undo", "redo"].includes(event.data.command)) runHistory(event.data.command);
      if (event.data.type === "three-acts:ready") { setPreviewReady(true); sendPreview(); }
      if (event.data.type === "three-acts:composition-ready") sendPreview();
      if (event.data.type === "three-acts:composition-rendered" && Array.isArray(event.data.sections) && event.data.sections.length <= layoutLimits.sections && event.data.sections.every((source: unknown) => readLayoutSource(source))) {
        const signature = JSON.stringify(event.data.sections.map((source: unknown) => readLayoutSource(source)));
        setRenderedLayout(signature);
        if (active && canvasMode === "design" && pendingSectionSelection.current && signature === layoutSignature) {
          postCanvas({ type: "three-acts:select-node", selector: `[data-layout-section="${pendingSectionSelection.current}"]` });
          pendingSectionSelection.current = null;
        }
      }
      if (!active) return;
      if (event.data.type === "three-acts:design-error" && typeof event.data.message === "string") setError(event.data.message.slice(0,300));
      if (event.data.type === "three-acts:navigate" && canvasMode === "preview" && !busy && !reviewing && typeof event.data.href === "string") {
        try {
          const url = new URL(event.data.href);
          if (url.origin !== publicSite.origin) { notify({ title: "Open external links with View site", duration: 4500 }); return; }
          const route = url.pathname.replace(/\/$/, "") || "/";
          const document = workspace?.documents.find((doc) => !doc.collectionId && !doc.kind && doc.id !== "shared" && doc.route === route);
          const preview = previews.items.find((item) => item.route === route);
          const draftTarget = isCmsDraft && cmsDraft.preview && workspace ? resolveCmsDraftRoute(cmsDraft.preview, route, workspace.documents) : null;
          if (document) choosePage(document);
          else if (draftTarget) {
            const target = workspace?.documents.find(doc => doc.id === draftTarget.templateId);
            if (target) {
              const select = () => {
                selectPage(target.id);
                setPreviewVersion("draft");
                setPreviewIds(previous => ({ ...previous, [target.id]: draftTarget.recordId }));
                setPreviewReady(false); resetCanvasState(); setCanvasRoute(route);
              };
              if (onSelectPage) onSelectPage(target.route, select);
              else select();
            }
          } else if (preview) choosePreview(preview.id);
          else notify({ title: "Choose this preview from the page picker", duration: 4500 });
        } catch { /* Ignore malformed navigation requests. */ }
      }
      if (event.data.type === "three-acts:canvas-tree" && Array.isArray(event.data.nodes)) {
        if(Array.isArray(event.data.sources)&&event.data.sources.length<=200) {
          const sources=event.data.sources.flatMap((entry:{section?:unknown;source?:unknown})=>{const section=readLayoutSource(entry?.section),source=readSourceReference(entry?.source);return section&&source?[{section,source}]:[];});
          setSourceReferences(sources);
        }
        const nodes = readCanvasNodes(event.data.nodes);
        const status = readCanvasTreeStatus(event.data.treeStatus);
        if (event.data.treeStatus !== undefined && (!status || status.loaded !== nodes.length)) return;
        setCanvasNodes(nodes);
        setTreeStatus(status);
      }
      if (event.data.type === "three-acts:clear-selection" || (event.data.type === "three-acts:selection" && event.data.selection === null)) setCanvasSelection(null);
      if (event.data.type === "three-acts:selection" && !busy && !reviewing && canvasMode === "design" && isCanvasSelection(event.data)) {
        // Once the rebuilt canvas contains the committed file, its authored
        // class baseline replaces the temporary post-commit preview classes.
        if(event.data.source) {
          const id=sourceId(event.data.source.path),sha=event.data.source.sha;
          const doc=workspace?.documents.find(doc=>doc.id===id);
          if(!drafts[id] && workspace && doc?.sha===sha && Array.isArray(doc.content.edits) && doc.content.edits.length) {
            const updated={...doc,content:{...doc.content,edits:[]}};
            writeSourcePreview(sourcePreviewKey(workspace,user.email),[updated]);
            setWorkspace(previous=>previous ? {...previous,documents:previous.documents.map(item=>item.id===id?updated:item)} : previous);
          }
        }
        if (canvasSelection?.selector !== event.data.selector) {
          endGroup();
          if (event.data.editingComponent) setRightPanel("style");
        }
        setCanvasSelection(event.data);
        setEditingComponent(event.data.editingComponent ?? null);
        setSelectionVersion((version) => version + 1);
        const doc = event.data.category !== "cms" ? workspace?.documents.find((item) => item.id === event.data.binding?.id) : undefined;
        const path = event.data.binding?.path;
        const editableField = doc && typeof path === "string" && contentFields(drafts[doc.id]?.content ?? doc.content).some((field) => field.path.join(".") === path);
        if (editableField && !doc.kind && doc.id !== "shared") setPage(doc.id);
      }
      if (event.data.type === "three-acts:select" && !busy && !reviewing && canvasMode === "design") {
        const doc = workspace?.documents.find((item) => item.id === event.data.id);
        const path = event.data.path;
        if (!doc || typeof path !== "string" || !contentFields(drafts[doc.id]?.content ?? doc.content).some((field) => field.path.join(".") === path)) return;
        if (!doc.kind && doc.id !== "shared") setPage(doc.id);
        // Shared fields select their content document while keeping the current canvas page.
      }
      if (event.data.type === "three-acts:edit" && !busy && !reviewing && typeof event.data.id === "string" && typeof event.data.path === "string" && typeof event.data.value === "string") {
        const doc = workspace?.documents.find((item) => item.id === event.data.id);
        if (!doc) return;
        const field = contentFields(drafts[doc.id]?.content ?? doc.content).find((item) => item.path.join(".") === event.data.path);
        if (field && typeof field.value === "string") changeField(field, event.data.value, doc.id, false);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
    // The handler must read the current draft, not a captured earlier version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, workspace, drafts, page, content, busy, reviewing, canvasMode, previews.items, previews.refresh, sendPreview, notify, canvasSelection?.selector, endGroup, runHistory, isCmsDraft, cmsSession, draftCollection, chosenPreview?.id, cmsDraft.refresh, cmsDraft.preview, layoutSignature]);

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
    endGroup();
    const next = workspace?.documents.find((doc) => doc.id === id);
    if (id === page && (next?.collectionId || next?.route === canvasRoute)) return;
    postCanvas({ type: "three-acts:clear-selection" });
    if (next && !next.collectionId && id !== "shared" && next.route !== canvasRoute) { setPreviewReady(false); setCanvasRoute(next.route); resetCanvasState(); }
    setPreviewReady(false); resetCanvasState();
    setPage(id);
  }

  function choosePage(document: EditorDocument) {
    const select = () => selectPage(document.id);
    if (onSelectPage) onSelectPage(document.route, select);
    else select();
  }

  function choosePreview(id: string) {
    if (!active || busy || loading || reviewing || !currentTemplate) return;
    endGroup();
    const item = previews.items.find((preview) => preview.id === id);
    if (!item) return;
    if (!item.liveRoute) setPreviewVersion("draft");
    setPreviewIds((previous) => ({ ...previous, [currentTemplate.id]: id }));
    if (chosenPreview?.id !== id || canvasRoute !== item.route) { setPreviewReady(false); setCanvasRoute(item.route); resetCanvasState(); }
  }

  function changePreviewVersion(version: "published" | "draft") {
    if (!active || busy || loading || reviewing || version === "published" && !chosenPreview?.liveRoute) return;
    endGroup(); setPreviewVersion(version); setPreviewReady(false); resetCanvasState();
    setCanvasSelection(null); setEditingComponent(null);
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
      if(workspace)writeSourcePreview(sourcePreviewKey(workspace,user.email),result.documents);
      const replacements = new Map(result.documents.map((doc) => [doc.id, doc]));
      setWorkspace((previous) => previous ? { ...previous, headSha: result.sha, documents: previous.documents.map((doc) => replacements.get(doc.id) ?? doc) } : previous);
      persist({}, null);
      setReviewing(false);
      setCommit(result.url);
      setLastSynced(new Date());
      notify({ tone: "success", title: "Pushed to GitHub", description: "Your hosting service can now rebuild the site. View the commit in GitHub connection details.", duration: 7000 });
    } catch (pushError) {
      setError(pushError instanceof Error ? pushError.message : "Push failed. Your drafts are still saved.");
    } finally { setBusy(false); }
  }

  const publicFrameUrl = publicSite && current ? currentTemplate ? chosenPreview?.liveRoute ? new URL(chosenPreview.liveRoute, publicSite).toString() : null : new URL(canvasRoute, publicSite).toString() : null;
  const privateFrameUrl = publicSite && draftCollection && chosenPreview ? `${new URL("/editor-preview/cms/", publicSite)}?${new URLSearchParams({ collection: draftCollection, record: chosenPreview.id, session: cmsSession })}` : null;
  const frameUrl = isCmsDraft ? privateFrameUrl : publicSite && current && (!currentTemplate || (chosenPreview && canvasRoute === chosenPreview.route)) ? new URL(canvasRoute, publicSite).toString() : null;
  useEffect(() => { onViewSiteUrlChange?.(publicFrameUrl); return () => onViewSiteUrlChange?.(null); }, [publicFrameUrl, onViewSiteUrlChange]);
  const elementPresentation = getElementPresentation(canvasSelection?.tag ?? "div", canvasSelection?.category ?? "element");
  const controlsDisabled = !active || busy || loading || reviewing || cmsDraft.loading;
  function changeViewportWidth(width: number) {
    if (controlsDisabled) return;
    const next = clampViewportWidth(width);
    setViewportWidth(next);
    setBreakpoint(viewportBreakpoint(next));
  }
  function changeCanvasZoom(zoom: CanvasZoom) { if (!controlsDisabled) setCanvasZoom(zoom); }

  const publicationLabel = publicationStatus?.revision && publicationStatus.revision === workspace?.headSha ? `${publicationStatus.state === "live" ? "Live" : publicationStatus.state === "deploying" ? "Deploying" : publicationStatus.state === "verifying" ? "Verifying live" : "Committed"} · ${publicationStatus.revision.slice(0, 8)}` : null;
  const saveState = storageUnavailable ? "Not saved in this browser" : loading ? "Loading source…" : !workspace ? "Source unavailable" : changedCount ? "Saved in this browser · Awaiting push" : publicationLabel ?? (commit ? "Committed to GitHub" : "Source loaded");
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
  return <div ref={root} onBlurCapture={endGroup} className="designer-workspace flex min-h-0 min-w-0 flex-1 overflow-hidden bg-cms-bg text-cms-text">
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
      {leftPanel === "navigator" ? <Navigator actions={<InsertElement disabled={!insertionEnabled && !compositionEnabled} elementsDisabled={!insertionEnabled} onInsert={addElement} onSection={compositionEnabled && layout.pages.home.order.length < layoutLimits.sections ? insert : undefined}/> } onMoveSection={compositionEnabled ? move : undefined} onReorderSection={compositionEnabled ? reorder : undefined} nodes={canvasNodes} treeStatus={treeStatus} onLoadMore={limit => postCanvas({ type: "three-acts:tree-limit", limit })} selected={canvasSelection?.selector ?? null} selectionVersion={selectionVersion} onSelect={(selector) => postCanvas({ type: "three-acts:select-node", selector })} disabled={busy || canvasMode === "preview" || !previewReady}/> : <aside className="flex min-h-0 flex-1 flex-col" aria-label="Pages">
      <PanelHeader className="h-8 min-h-8 gap-2 px-2"><File size={14}/><strong className="font-semibold">Pages</strong></PanelHeader>
      <div className="border-b border-cms-line px-2 py-1"><SearchInput ariaLabel="Search pages" placeholder="Find a page…" value={query} onChange={setQuery}/></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      <p className="px-2 pb-0 pt-1 text-ui font-medium uppercase tracking-label text-cms-muted">Static pages</p>
      <nav aria-label="Static pages">
        {workspace?.documents.filter((doc) => !doc.kind && doc.id !== "shared" && !doc.collectionId && `${doc.label} ${doc.route}`.toLowerCase().includes(query.toLowerCase())).map((doc) =>
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
        {workspace && !workspace.documents.some((doc) => !doc.kind && doc.id !== "shared" && !doc.collectionId && `${doc.label} ${doc.route}`.toLowerCase().includes(query.toLowerCase())) && <p className="px-2 py-2 text-ui text-cms-muted">No pages match your search.</p>}
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

    <main className="@container/canvas flex min-h-0 min-w-0 flex-1 flex-col">
      <PanelHeader className="h-8 min-h-8 gap-1.5 px-2 @max-[650px]/canvas:h-auto @max-[650px]/canvas:flex-wrap @max-[650px]/canvas:gap-x-0 @max-[650px]/canvas:gap-y-0" render={<header aria-label="Canvas toolbar"/>}>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-ui @max-[650px]/canvas:w-full @max-[650px]/canvas:flex-none @max-[650px]/canvas:min-h-8">
          <PagePicker pageStates={pageStates} documents={workspace?.documents ?? []} current={current} previewItems={previews.items} chosenPreview={chosenPreview} previewsLoading={previews.loading} previewsError={previews.error} disabled={busy || loading || !workspace} onSelectPage={choosePage} onSelectPreview={choosePreview} previewVersion={isCmsDraft ? "draft" : "published"} onPreviewVersion={changePreviewVersion} onRetryPreviews={() => { previews.refresh(); cmsDraft.refresh(); }} onOpenDetails={(document) => onOpenPageDetails?.(document.route, () => selectPage(document.id))}/>
          <span className="hidden min-w-0 truncate text-cms-muted lg:inline" title={canvasRoute}>{canvasRoute}</span>
          {currentTemplate && chosenPreview && <span aria-label="CMS preview snapshot" title="CMS values only; browser template and design drafts are also shown." className="shrink-0 text-[10px] text-cms-subtle">{isCmsDraft ? cmsDraft.loading ? "Loading CMS draft…" : "Saved CMS draft" : "Published CMS"}</span>}
          <span aria-label="Draft save state" aria-live="polite" className={`inline-flex shrink-0 items-center gap-1 text-[10px] ${storageUnavailable ? "text-cms-danger" : changedCount ? "text-cms-accent" : "text-cms-subtle"}`} title={storageUnavailable ? "Keep this tab open until you push. Browser storage is unavailable." : changedCount ? `${changedCount} document${changedCount === 1 ? "" : "s"} awaiting push; these changes are not live.` : "The loaded source is separate from your hosting deployment."}>{storageUnavailable ? <Info size={12} aria-hidden="true"/> : <CheckCircle2 size={12} aria-hidden="true"/>}<span className="sr-only md:not-sr-only">{saveState}</span></span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 [scrollbar-width:none] @max-[650px]/canvas:min-h-8 @max-[650px]/canvas:max-w-full @max-[650px]/canvas:overflow-x-auto">
          <div className="flex shrink-0 items-center gap-0.5" aria-label="Canvas mode">
            <IconButton className={`size-6 border-transparent bg-transparent shadow-none ${canvasMode === "design" ? "text-cms-accent" : ""}`} aria-label="Design mode" title="Design mode" aria-pressed={canvasMode === "design"} disabled={controlsDisabled} onClick={() => setCanvasMode("design")}><MousePointer2 size={14}/></IconButton>
            <IconButton className={`size-6 border-transparent bg-transparent shadow-none ${canvasMode === "preview" ? "text-cms-accent" : ""}`} aria-label="Preview mode" title="Preview mode" aria-pressed={canvasMode === "preview"} disabled={controlsDisabled} onClick={() => setCanvasMode("preview")}><Eye size={14}/></IconButton>
          </div>
          <span className="mx-0.5 h-4 shrink-0 border-r border-cms-line" aria-hidden="true"/>
          <CanvasSizeControls width={viewportWidth} zoom={canvasZoom} scale={resolvedZoom} disabled={controlsDisabled} onWidth={changeViewportWidth} onZoom={changeCanvasZoom}/>
          <span className="mx-0.5 h-4 shrink-0 border-r border-cms-line" aria-hidden="true"/>
          <div className="flex shrink-0 items-center gap-0.5" aria-label="Edit history">
            <Tooltip content={history.undoLabel ? `Undo ${history.undoLabel} (⌘/Ctrl+Z)` : "Nothing to undo"}><IconButton aria-label="Undo edit" className="size-6 border-transparent bg-transparent p-1 shadow-none" disabled={!history.undoLabel || controlsDisabled || canvasMode === "preview"} onClick={() => runHistory("undo")}><Undo2 size={14}/></IconButton></Tooltip>
            <Tooltip content={history.redoLabel ? `Redo ${history.redoLabel} (Shift+⌘/Ctrl+Z)` : "Nothing to redo"}><IconButton aria-label="Redo edit" className="size-6 border-transparent bg-transparent p-1 shadow-none" disabled={!history.redoLabel || controlsDisabled || canvasMode === "preview"} onClick={() => runHistory("redo")}><Redo2 size={14}/></IconButton></Tooltip>
            <Tooltip content={`Discard all ${changedCount} browser drafts`}><IconButton aria-label="Discard drafts" className="size-6 border-transparent bg-transparent p-1 shadow-none" disabled={!changedCount || controlsDisabled} onClick={() => setDiscarding(true)}><RotateCcw size={14}/></IconButton></Tooltip>
          </div>
        </div>
      </PanelHeader>
      <div className="flex min-h-0 flex-1 flex-col">
        {error && !reviewing && <div className="flex shrink-0 items-center gap-2 border-b border-cms-danger/40 bg-cms-danger/10 px-3 py-2 text-ui text-cms-danger" role="alert">{error}<Button variant="ghost" className="ml-auto" onClick={() => void load()} disabled={busy}>Retry</Button></div>}
        {recovery && <div className="flex shrink-0 items-center gap-2 border-b border-cms-pending/40 bg-cms-pending/10 px-3 py-2 text-ui text-cms-text" role="alert">Some saved drafts use older or invalid fields. Compatible drafts are restored, and a backup is kept in this browser.<Button variant="ghost" onClick={downloadRecovery}>Download draft backup</Button></div>}
        {stale.length > 0 && <div className="shrink-0 border-b border-cms-pending/40 bg-cms-pending/10 px-3 py-2 text-ui text-cms-text" role="alert">{stale.map((doc) => doc.label).join(", ")} changed on GitHub. Your drafts are preserved. Discard the affected drafts and reapply your edits before pushing.</div>}
        {!workspace ? <div className="grid min-h-0 flex-1 place-items-center p-6 text-center"><div className="max-w-sm"><Layers size={28} className="mx-auto text-cms-muted"/><h2 className="mt-3 text-ui-lg font-semibold">{loading ? "Opening your workspace…" : "Your content couldn't be loaded"}</h2><p className="my-2 text-ui text-cms-muted">The designer connects through the Three Acts API.</p><Button onClick={() => void load()} disabled={loading}>Try again</Button></div></div> : <>
          <CanvasViewport width={viewportWidth} zoom={canvasZoom} disabled={controlsDisabled} unavailable={!frameUrl} onWidth={changeViewportWidth} onZoom={changeCanvasZoom} onScale={setResolvedZoom}>
              {frameUrl ? <iframe key={frameRevision} ref={frame} title="Website canvas" src={frameUrl} style={{pointerEvents:previewReady ? undefined : "none"}} sandbox="allow-scripts allow-same-origin" onLoad={sendPreview} className="h-full w-full border-0 bg-white"/> : <div className="grid h-full place-items-center p-6 text-center"><div>
                {currentTemplate && (!chosenPreview || canvasRoute !== chosenPreview.route) ? <>
                  <Layers size={28} className="mx-auto text-cms-muted"/>
                  <h2 className="mt-3 text-ui-lg font-semibold">{previews.loading || (chosenPreview && canvasRoute !== chosenPreview.route) ? "Loading preview…" : previews.error ? "Preview items couldn't be loaded" : "No CMS items to preview"}</h2>
                  <p className="mt-2 max-w-md text-ui text-cms-muted">{previews.error ?? (previews.loading ? "Loading items from this collection." : "Create an item in this collection to preview its page." )}</p>
                </> : <><Globe size={28} className="mx-auto text-cms-muted"/><h2 className="mt-3 text-ui-lg font-semibold">Connect your website</h2><p className="mt-2 max-w-md text-ui text-cms-muted">Set VITE_SITE_URL to your public website. Enable PUBLIC_EDITOR_PREVIEW and PUBLIC_EDITOR_ORIGIN on the web app for canvas editing.</p></>}
              </div></div>}
          </CanvasViewport>
          {canvasSelection && <CanvasBreadcrumb selection={canvasSelection} disabled={busy || canvasMode === "preview"} onSelect={(selector) => postCanvas({ type: "three-acts:select-node", selector })}/>}
        </>}
      </div>
    </main>

    <div className="flex min-h-0 w-64 shrink-0 flex-col border-l border-cms-line-strong bg-cms-bg max-sm:w-60">
      <div className="flex h-8 shrink-0 items-stretch gap-4 border-b border-cms-line px-2" aria-label="Right panel">
        {isComponentSelection ? <span className="flex items-center border-b-2 border-cms-text px-0.5 text-ui text-cms-text">Properties</span> : <>
          <button type="button" className={`flex items-center gap-1.5 border-b-2 px-0.5 text-ui focus-visible:outline-1 focus-visible:outline-cms-accent ${rightPanel === "style" ? "border-cms-text text-cms-text" : "border-transparent text-cms-muted hover:text-cms-text"}`} aria-label="Style panel" aria-pressed={rightPanel === "style"} onClick={() => chooseRightPanel("style")}><SlidersHorizontal size={12}/>Style</button>
          <button type="button" className={`flex items-center gap-1.5 border-b-2 px-0.5 text-ui focus-visible:outline-1 focus-visible:outline-cms-accent ${rightPanel === "content" ? "border-cms-text text-cms-text" : "border-transparent text-cms-muted hover:text-cms-text"}`} aria-label="Content panel" aria-pressed={rightPanel === "content"} onClick={() => chooseRightPanel("content")}><Type size={12}/>Content</button>
        </>}
      </div>
      {editingComponent && <div aria-label="Main component editing" className="grid gap-1 border-b border-cms-line bg-cms-success/10 px-2 py-2 text-ui"><div className="flex items-center justify-between gap-2"><strong className="min-w-0 truncate font-medium">Editing {componentDefinitions[editingComponent]?.label ?? editingComponent}</strong><Tooltip content="Exit main component editing"><IconButton aria-label="Done editing component" className="size-5 shrink-0 border-transparent bg-transparent p-0 shadow-none" disabled={controlsDisabled} onClick={() => postCanvas({ type: "three-acts:exit-component" })}><X size={12}/></IconButton></Tooltip></div><span className="text-cms-muted">Changes apply to all instances</span></div>}
      <div aria-label="Selected element" className="flex h-8 shrink-0 items-center gap-1.5 border-b border-cms-line px-2 text-ui">
        <elementPresentation.Icon aria-hidden="true" size={13} className={`shrink-0 ${elementPresentation.color}`}/>
        <span className="min-w-0 flex-1 truncate" title={canvasSelection?.label}>{canvasSelection?.label ?? "No selection"}</span>
        {canvasSelection && <span className="shrink-0 font-mono text-[10px] text-cms-subtle">{canvasSelection.tag}</span>}
        {selectedAddition && <AddedElementActions disabled={!insertionEnabled} first={additionPeers[0]?.id === selectedAddition.node.id} last={additionPeers.at(-1)?.id === selectedAddition.node.id} onAction={additionAction}/>}
        {selectedSection && canvasSelection?.component?.name.startsWith("Layout.") && <SectionActions disabled={!compositionEnabled} hidden={layout.pages.home.sections[selectedSection].hidden} first={layout.pages.home.order[0] === selectedSection} last={layout.pages.home.order.at(-1) === selectedSection} onMove={delta => move(selectedSection, delta)} onDuplicate={() => void duplicate()} onToggle={toggleSection}/>}
      </div>
      {canvasSelection?.visibility && canvasSelection.visibility.state !== "visible" && <p role="status" aria-label="Selection visibility" className="m-0 border-b border-cms-line px-2 py-2 text-[10px] leading-4 text-cms-muted">{canvasSelection.visibility.reason}. {canvasSelection.section?.hidden ? canvasSelection.component?.name.startsWith("Layout.") ? "Use Section actions to show it." : "Select its section in Navigator to show it." : canvasSelection.visibility.state === "revealed" ? "Preview restores the disclosure state." : "Select another width or change its source styling to make it visible."}</p>}
      {(canvasSelection?.category === "cms" || canvasSelection?.cmsSource) && <CmsSourceInspector source={canvasSelection.cmsSource} disabled={controlsDisabled || canvasMode === "preview"} onOpen={onOpenCmsRecord}/>}
      {canvasSelection && !isComponentSelection && rightPanel === "content" && <p aria-label="Editing scope" className="m-0 border-b border-cms-line px-2 py-2 text-[10px] text-cms-muted">{canvasSelection.category === "cms" ? "CMS record content" : contentDocument?.id === "design" ? "Shared source element" : contentDocument?.id === "layout" ? "This section instance" : contentDocument?.id === "shared" ? "Shared across the site" : contentDocument?.collectionId ? `All pages using ${contentDocument.label}` : "This page"}</p>}
      {isComponentSelection && canvasSelection ? <ComponentInspector contentScope={canvasSelection.component?.fields.some(field => field.id === "layout") ? "Content applies to this section instance." : canvasSelection.component?.fields.some(field => field.id === "shared") ? "Content is shared across the site." : currentTemplate ? `Content applies to all pages using ${currentTemplate.label}.` : null} templateInstance={Boolean(currentTemplate)} selection={canvasSelection} onResetProperty={key => updateDesign(next => {
        const id = canvasSelection.component?.instanceId;
        if (!id || !next.instances[id]) return;
        delete next.instances[id].props[key];
        if (!Object.keys(next.instances[id].props).length) delete next.instances[id];
      })} resolveSourceField={resolveSourceField} disabled={controlsDisabled || canvasMode === "preview"} resolveField={resolveSelectedField} onField={(field, value, id, typing) => changeField(field, value, id, typing)} onProperty={(key, value) => {
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
      }} onEnter={() => { setRightPanel("style"); postCanvas({ type: "three-acts:enter-component", selector: canvasSelection.selector }); }}/> : rightPanel === "style" ? <StyleInspector key={canvasSelection?.selector ?? "empty"} selection={canvasSelection} design={design} breakpoint={breakpoint} onBreakpointChange={changeBreakpoint} onChange={style => void changeElementStyle(style)} disabled={controlsDisabled || canvasMode === "preview"}/> : <Inspector content={content} canvasSelection={canvasSelection} resolveField={resolveSelectedField} onChange={(field, value, documentId) => changeField(field, value, documentId ?? contentDocument?.id ?? page)} disabled={controlsDisabled || canvasMode === "preview"}/>}
    </div>
    {reviewing && workspace && <Review drafts={drafts} workspace={workspace} message={message} onMessage={setMessage} busy={busy} error={error} onClose={() => { setReviewing(false); setError(""); }} onPush={() => void push()}/>}
    {connectionOpen && <GitHubConnection workspace={workspace} loading={loading} error={connectionError} lastSynced={lastSynced} lastCommit={commit} onReload={reload} onClose={() => setConnectionOpen(false)}/>}
    <ConfirmDialog open={discarding} onOpenChange={setDiscarding} title="Discard drafts?" description={`Discard all ${changedCount} content drafts and return to the latest loaded source? This includes shared content and drafts on other pages.`} confirmLabel="Discard drafts" onConfirm={() => { persist({}, null); notify({ title: "Drafts discarded", duration: 4500 }); }}/>
  </div>;
}
