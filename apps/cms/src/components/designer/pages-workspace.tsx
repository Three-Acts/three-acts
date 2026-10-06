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
};

type PendingDetailsAction = {
  route: string | null;
  action: () => void;
};

/** Keeps the designer mounted while page details are shown in its docked side panel. */
export function PagesWorkspace({ collection, user, onDirtyChange, onSaved, onBusyChange }: PagesWorkspaceProps) {
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
    <aside aria-label="Page details" className="flex min-h-0 w-72 max-w-[40vw] shrink-0 overflow-hidden border-r border-cms-line-strong bg-cms-bg">
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
        pageDetailsPanel={detailsPanel}
        pageDetailsPath={detailsPath}
        user={user}
      />

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
