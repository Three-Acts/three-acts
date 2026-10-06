import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "@three-acts/auth";
import { contentDefinitions } from "@three-acts/static-content";
import type { CmsCollectionSummary } from "../../cms/types";
import { Button, ConfirmDialog } from "../atoms";
import { PageSettingsView } from "../settings/page-settings-view";
import { DesignerWorkspace } from "./designer-workspace";
import { TemplateDetailsPanel, type TemplateDetails } from "./template-details-panel";

type PagesWorkspaceProps = {
  collection: CmsCollectionSummary;
  user: AuthUser;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => void;
  onBusyChange?: (busy: boolean) => void;
  toolbarHost?: HTMLDivElement | null;
  onClosePublish?: () => void;
  onViewSiteUrlChange?: (url: string | null) => void;
};

type PendingDetailsAction = {
  route: string | null;
  action: () => void;
};

/** Keeps the designer mounted while page details are shown in a side panel. */
export function PagesWorkspace({ collection, user, onDirtyChange, onSaved, onBusyChange, toolbarHost, onClosePublish, onViewSiteUrlChange }: PagesWorkspaceProps) {
  const [detailsPath, setDetailsPath] = useState<string | null>(null);
  const [templateDetails, setTemplateDetails] = useState<TemplateDetails | null>(null);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [designerUnsaved, setDesignerUnsaved] = useState(false);
  const [designerBusy, setDesignerBusy] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [pendingDetailsAction, setPendingDetailsAction] = useState<PendingDetailsAction | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const reportBusy = useCallback((busy: boolean) => {
    setDetailsBusy(busy);
  }, []);

  const reportDesignerBusy = useCallback((busy: boolean) => {
    setDesignerBusy(busy);
  }, []);

  const reportDirty = useCallback((dirty: boolean) => {
    setDetailsDirty(dirty);
  }, []);

  const reportDesignerUnsaved = useCallback((unsafe: boolean) => {
    setDesignerUnsaved(unsafe);
  }, []);

  const busy = designerBusy || detailsBusy;
  const hostDirty = detailsDirty || designerUnsaved;

  useEffect(() => {
    onDirtyChange(hostDirty);
  }, [hostDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  const runDetailsAction = useCallback((route: string | null, action: () => void) => {
    if (busy) return;
    const apply = () => {
      action();
      setDetailsPath(route);
    };
    if (detailsDirty && route !== detailsPath) {
      setPendingDetailsAction({ route, action: apply });
      setConfirmDiscard(true);
      return;
    }
    apply();
  }, [busy, detailsDirty, detailsPath]);

  const openPageDetails = useCallback((route: string, select: () => void) => {
    runDetailsAction(route, select);
  }, [runDetailsAction]);

  const selectPage = useCallback((route: string | null, select: () => void) => {
    if (busy) return;
    if (detailsPath === null) {
      select();
      return;
    }
    runDetailsAction(route, select);
  }, [busy, detailsPath, runDetailsAction]);

  const requestCloseDetails = useCallback(() => {
    runDetailsAction(null, () => {});
  }, [runDetailsAction]);

  const discardAndContinue = useCallback(() => {
    setConfirmDiscard(false);
    const pending = pendingDetailsAction;
    setPendingDetailsAction(null);
    pending?.action();
  }, [pendingDetailsAction]);

  const isTemplate = contentDefinitions.some((document) => document.collectionId && document.route === detailsPath);
  const detailsPanel: ReactNode = detailsPath ? (
    <aside aria-label="Page details" className="absolute bottom-2 left-[calc(14rem_+_0.5rem)] top-10 z-20 flex w-96 max-w-[calc(100vw_-_15rem)] overflow-hidden rounded-cms-lg border border-cms-line-strong bg-cms-bg shadow-xl max-sm:left-[calc(11rem_+_0.5rem)] max-sm:max-w-[calc(100vw_-_12rem)]">
      {isTemplate ? templateDetails?.document.route === detailsPath ? <TemplateDetailsPanel details={templateDetails} disabled={busy} onClose={requestCloseDetails}/> : <div className="p-3 text-ui text-cms-muted"><p>Select a CMS template to edit its details.</p><Button aria-label="Close page details" disabled={busy} onClick={requestCloseDetails}>Close</Button></div> : <PageSettingsView
        collection={collection}
        initialPagePath={detailsPath}
        key={detailsPath}
        layout="panel"
        onBusyChange={reportBusy}
        onClose={requestCloseDetails}
        onDirtyChange={reportDirty}
        onSaved={onSaved}
      />}
    </aside>
  ) : null;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 bg-cms-bg">
      <DesignerWorkspace
        onBusyChange={reportDesignerBusy}
        onOpenPageDetails={openPageDetails}
        onSelectPage={selectPage}
        onTemplateDetailsChange={setTemplateDetails}
        onUnsavedChange={reportDesignerUnsaved}
        pageDetailsPath={detailsPath}
        user={user}
        toolbarHost={toolbarHost}
        onClosePublish={onClosePublish}
        onViewSiteUrlChange={onViewSiteUrlChange}
      />
      {detailsPanel}

      <ConfirmDialog
        confirmLabel="Discard"
        description="You have unsaved changes to this page. Discard them?"
        onConfirm={discardAndContinue}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDiscard(false);
            setPendingDetailsAction(null);
          }
        }}
        open={confirmDiscard}
        title="Discard unsaved changes?"
      />
    </div>
  );
}
