import { cmsSourceField, readCmsSource, type CmsSource } from "@three-acts/cms-schema";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@three-acts/utils";
import type { AuthUser } from "@three-acts/auth";
import { collectionRegistry } from "../cms/registry";
import { singularize } from "../lib/format";
import { canCreate, hasPublishWorkflow } from "../lib/records";
import { BareIconButton, Button, ConfirmDialog, PanelHeader, Tooltip, useToast } from "../components/atoms";
import { useCmsWorkspace } from "../hooks/use-cms-workspace";
import { CollectionSidebar, RecordListPane, RecordsToolbar, RecordTable, TopBar } from "../components/workspace";
import type { WorkspaceTab } from "../components/workspace";
import { RecordEditor } from "../components/editor";
import { ImportDialog } from "../components/import";
import { SiteSettingsView } from "../components/settings";
import { PagesWorkspace } from "../components/designer/pages-workspace";

// Tabs come from the static registry so they don't pop in once the
// collection summaries finish loading.
const availableTabs: WorkspaceTab[] = [
  ...(collectionRegistry.some((collection) => collection.settingsView === "pages") ? (["page-settings"] as const) : []),
  "cms",
  ...(collectionRegistry.some((collection) => collection.settingsView === "site") ? (["site-settings"] as const) : [])
];

export function CmsWorkspace({ onSignOut, user }: { onSignOut: () => Promise<void>; user: AuthUser }) {
  const {
    activeCollection,
    activeCollectionId,
    clearError,
    draftRecord,
    discardRecordChanges,
    recordError,
    reloadRecord,
    error,
    filteredRecords,
    groups,
    handleAssetUpload,
    handleCreateRecord,
    handleDeleteRecords,
    handleDuplicateRecord,
    handleExport,
    handleGalleryItemUpload,
    handleGalleryUpload,
    handleImportRecords,
    handleSaveRecord,
    handleSelectCollection,
    handleUpdateSelectedStatus,
    isDirty,
    isImportOpen,
    isLoadingCollections,
    isLoadingRecords,
    isSaving,
    queuedCount,
    records,
    refreshCollections,
    refreshRecords,
    search,
    selectedIds,
    selectedRecordId,
    selectionMode,
    setIsImportOpen,
    setSearch,
    setSelectedRecordId,
    settingsCollections,
    toggleRecordSelected,
    toggleSelectAll,
    toggleSelectionMode,
    updateDraftValue,
    uploadingField
  } = useCmsWorkspace();

  const toast = useToast();

  // Any navigation that would blow away an in-progress edit (switching
  // records/collections, going Back, signing out) routes through here so it
  // can be paused behind a confirmation instead of discarding silently.
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  // Settings screens own their draft; they report dirtiness up here so the
  // same guard covers them. Bumping the revision remounts a clean settings
  // screen so it re-reads records the publish pipeline just changed.
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const [isDesignerBusy, setIsDesignerBusy] = useState(false);
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [publishRevision, setPublishRevision] = useState(0);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(availableTabs[0] ?? "cms");
  const [designerToolbarHost, setDesignerToolbarHost] = useState<HTMLDivElement | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [cmsReturn, setCmsReturn] = useState<CmsSource | null>(null);
  const [detailsDiscardRevision, setDetailsDiscardRevision] = useState(0);
  const [viewSiteUrl, setViewSiteUrl] = useState<string | null>(null);
  const siteSettingsCollection = settingsCollections.find((collection) => collection.settingsView === "site");
  const redirectRulesCollection = settingsCollections.find((collection) => collection.settingsView === "redirects");
  const mediaCollection = settingsCollections.find((collection) => collection.settingsView === "media");
  const pageSettingsCollection = settingsCollections.find((collection) => collection.settingsView === "pages");
  const settingsCollection =
    activeTab === "site-settings" ? siteSettingsCollection : activeTab === "page-settings" ? pageSettingsCollection : undefined;

  useEffect(() => {
    if (!error) {
      return;
    }

    // Base UI's toast `add` flushes synchronously, which React rejects from
    // inside an effect body, so hand it to the next task. Deliberately not
    // cancelled in a cleanup: clearing the error below re-runs this effect,
    // and a cleanup would cancel the toast before it ever showed.
    const message = error;
    window.setTimeout(() => {
      toast.push({ tone: "error", title: "Something went wrong", description: message, duration: 8000 });
    }, 0);
    // Reset back to null so the next error — even with identical text —
    // is a genuine state transition the toast effect will react to.
    clearError();
  }, [clearError, error, toast]);

  const selectedRecords = filteredRecords.filter((record) => selectedIds.has(record.id));
  const showUpdateItems = Boolean(activeCollection && hasPublishWorkflow(activeCollection));
  const canQueueSelected = selectedRecords.some((record) => record.publishStatus !== "queued_to_publish");
  const canUnpublishSelected = selectedRecords.some((record) => record.publishStatus === "published");

  // The publish pipeline flips queued records to published server-side, so
  // both the record list and the collection summaries (queued counts, the
  // sidebar's per-collection totals) need a refetch once it settles.
  function handlePublished() {
    refreshRecords();
    refreshCollections();
    setPublishRevision((revision) => revision + 1);

    if (!isSettingsDirty && !isDesignerBusy && !cmsReturn) {
      setSettingsRevision((revision) => revision + 1);
    }
  }

  function guardNavigation(action: () => void, settingsUnsafe = isSettingsDirty, preserveRecord = false) {
    if (isDesignerBusy || isSaving || uploadingField) return;
    if ((!preserveRecord && isDirty) || settingsUnsafe) {
      setPendingAction(() => () => {
        if (!preserveRecord && isDirty) discardRecordChanges();
        if (settingsUnsafe) setDetailsDiscardRevision(revision => revision + 1);
        action();
      });
    } else {
      action();
    }
  }

  function returnToCanvas() {
    guardNavigation(() => { setSelectedRecordId(null); setPublishOpen(false); setActiveTab("page-settings"); setCmsReturn(null); });
  }
  function openCmsRecord(raw: CmsSource, leaveDetails: () => void, dirtyDetails: boolean) {
    const source = readCmsSource(raw);
    if (!source) return;
    guardNavigation(() => {
      leaveDetails();
      handleSelectCollection(source.collectionId);
      setSelectedRecordId(source.recordId);
      setCmsReturn(source);
      setPublishOpen(false);
      setActiveTab("cms");
    }, dirtyDetails, activeCollectionId === source.collectionId && selectedRecordId === source.recordId);
  }
  const handleGuardedBack = () => cmsReturn ? returnToCanvas() : guardNavigation(() => setSelectedRecordId(null));

  function handleSelectRecordFromList(recordId: string) {
    guardNavigation(() => setSelectedRecordId(recordId));
  }

  function handleSelectCollectionGuarded(collectionId: string) {
    if (collectionId === activeCollection?.id) {
      return;
    }

    guardNavigation(() => handleSelectCollection(collectionId));
  }

  // The CMS tab's draft lives in the workspace hook and survives a tab switch;
  // a settings screen unmounts, so only its unsaved edits need the guard.
  function handleTabChange(tab: WorkspaceTab) {
    if (isDesignerBusy || isSaving || uploadingField) return;
    if (tab === "page-settings" && cmsReturn) { returnToCanvas(); return; }
    if (tab === activeTab) {
      return;
    }

    if (isSettingsDirty) {
      setPendingAction(() => () => { setDetailsDiscardRevision(revision => revision + 1); setPublishOpen(false); setActiveTab(tab); });
    } else {
      setPublishOpen(false);
      setActiveTab(tab);
    }
  }

  function handleSignOutRequest(): Promise<void> {
    guardNavigation(() => {
      void onSignOut();
    });
    return Promise.resolve();
  }

  function handleDeleteSelectedRequest() {
    if (selectedRecords.length === 0) {
      return;
    }

    setPendingDeleteIds(selectedRecords.map((record) => record.id));
  }

  const deleteCount = pendingDeleteIds?.length ?? 0;

  return (
    <div className="flex h-screen flex-col bg-cms-bg text-ui text-cms-text">
      <TopBar
        activeTab={activeTab}
        availableTabs={availableTabs}
        onPublished={handlePublished}
        onSignOut={handleSignOutRequest}
        onTabChange={handleTabChange}
        queuedCount={queuedCount}
        user={user}
        designerToolbarRef={setDesignerToolbarHost}
        editorBusy={isDesignerBusy}
        publishOpen={publishOpen}
        onPublishOpenChange={setPublishOpen}
        viewSiteUrl={viewSiteUrl}
      />
      <div className="flex min-h-0 flex-1">
        {pageSettingsCollection && <main hidden={activeTab !== "page-settings"} className={cn("relative min-h-0 min-w-0 flex-1", activeTab === "page-settings" ? "flex" : "hidden")}>
          <PagesWorkspace collection={pageSettingsCollection} key={`${pageSettingsCollection.id}-${settingsRevision}`} active={activeTab === "page-settings"} onOpenCmsRecord={openCmsRecord} discardDetailsRevision={detailsDiscardRevision} onDirtyChange={setIsSettingsDirty} onSaved={refreshCollections} onBusyChange={setIsDesignerBusy} user={user} toolbarHost={activeTab === "page-settings" ? designerToolbarHost : null} onClosePublish={() => setPublishOpen(false)} onViewSiteUrlChange={setViewSiteUrl} publishRevision={publishRevision}/>
        </main>}
        {activeTab === "cms" ? (
          <CollectionSidebar
            activeCollectionId={activeCollectionId}
            groups={groups}
            isLoading={isLoadingCollections}
            onSelectCollection={handleSelectCollectionGuarded}
          />
        ) : null}

        {activeTab === "page-settings" && pageSettingsCollection ? null : activeTab !== "cms" && !settingsCollection ? (
          <main className="grid flex-1 place-items-center p-8 text-center" role="status">
            <p className="m-0 text-ui text-cms-subtle">Loading settings…</p>
          </main>
        ) : settingsCollection ? (
          // Settings tabs take the whole workspace below the top bar; the
          // collections sidebar belongs to the CMS tab only.
          <main className="relative flex min-h-0 min-w-0 flex-1">
              <SiteSettingsView
                collection={settingsCollection}
                key={`${settingsCollection.id}-${settingsRevision}`}
                onDirtyChange={setIsSettingsDirty}
                onSaved={refreshCollections}
                mediaCollection={mediaCollection}
                redirectCollection={redirectRulesCollection}
              />
          </main>
        ) : activeCollection ? (
          <main className="relative flex min-h-0 min-w-0 flex-1">
            <section
              className={cn(
                "flex min-h-0 flex-col border-r border-cms-line-strong",
                selectedRecordId ? "w-pane shrink-0" : "min-w-0 flex-1"
              )}
              aria-label={`${activeCollection.label} records`}
            >
              {selectedRecordId ? (
                <RecordListPane
                  collection={activeCollection}
                  onCreate={handleCreateRecord}
                  onSelectRecord={handleSelectRecordFromList}
                  records={filteredRecords}
                  selectedRecordId={selectedRecordId}
                />
              ) : (
                <>
                  <RecordsToolbar
                    canQueueSelected={canQueueSelected}
                    canCreate={canCreate(activeCollection)}
                    canUnpublishSelected={canUnpublishSelected}
                    hasPublishWorkflow={showUpdateItems}
                    newLabel={singularize(activeCollection.label)}
                    onCreate={handleCreateRecord}
                    onDeleteSelected={handleDeleteSelectedRequest}
                    onExportSelected={() => handleExport(selectedRecords)}
                    onImport={() => setIsImportOpen(true)}
                    onSearchChange={setSearch}
                    onToggleSelectionMode={toggleSelectionMode}
                    onUpdateSelectedStatus={handleUpdateSelectedStatus}
                    search={search}
                    selectedCount={selectedRecords.length}
                    selectionMode={selectionMode}
                    title={activeCollection.label}
                  />
                  <RecordTable
                    collection={activeCollection}
                    hasSearch={search.trim().length > 0}
                    isLoading={isLoadingRecords}
                    onSelectRecord={setSelectedRecordId}
                    onToggleSelectAll={toggleSelectAll}
                    onToggleSelected={toggleRecordSelected}
                    records={filteredRecords}
                    selectedIds={selectedIds}
                    selectionMode={selectionMode}
                  />
                  <footer className="flex h-7 shrink-0 items-center border-t border-cms-line px-3 text-ui tabular-nums text-cms-subtle">
                    {filteredRecords.length === records.length
                      ? `${records.length} records`
                      : `${filteredRecords.length} of ${records.length} records`}
                  </footer>
                </>
              )}
            </section>

            {selectedRecordId ? (
              draftRecord ? (
                <RecordEditor
                  collection={activeCollection}
                  backLabel={cmsReturn ? "Back to canvas" : "Back to table"}
                  focusField={cmsReturn?.collectionId === activeCollection.id && cmsReturn.recordId === draftRecord.id ? cmsSourceField(cmsReturn)?.key : undefined}
                  draftRecord={draftRecord}
                  isDirty={isDirty}
                  isSaving={isSaving}
                  onAssetUpload={handleAssetUpload}
                  onGalleryItemUpload={handleGalleryItemUpload}
                  onGalleryUpload={handleGalleryUpload}
                  onBack={handleGuardedBack}
                  onChangeStatus={(status) => handleSaveRecord(status)}
                  onDelete={() => handleDeleteRecords([draftRecord.id])}
                  onDuplicate={handleDuplicateRecord}
                  onSave={() => handleSaveRecord()}
                  onUpdateValue={updateDraftValue}
                  uploadingField={uploadingField}
                />
              ) : (
                <div role="region" aria-label="CMS record loading" aria-busy={!recordError} className="flex min-h-0 min-w-0 flex-1 flex-col bg-cms-bg">
                  <PanelHeader>
                    <Tooltip content={cmsReturn ? "Back to canvas" : "Back to table"}>
                      <BareIconButton aria-label={cmsReturn ? "Back to canvas" : "Back to table"} disabled={isSaving} onClick={handleGuardedBack}>
                        <ArrowLeft size={15} />
                      </BareIconButton>
                    </Tooltip>
                  </PanelHeader>
                  <div className="grid flex-1 place-items-center p-8 text-center">
                    <div className="grid gap-2"><p role={recordError ? "alert" : undefined} className="m-0 text-ui text-cms-subtle">{recordError ?? "Loading record…"}</p>{recordError && <Button onClick={() => void reloadRecord()}>Retry record</Button>}</div>
                  </div>
                </div>
              )
            ) : null}
          </main>
        ) : (
          <main className="grid flex-1 place-items-center p-8 text-center">
            <p className="m-0 text-ui text-cms-subtle">
              No collections are registered yet. Add one to the Collection Registry to start editing.
            </p>
          </main>
        )}
      </div>

      {activeCollection ? (
        <ImportDialog collection={activeCollection} onImport={handleImportRecords} onOpenChange={setIsImportOpen} open={isImportOpen} />
      ) : null}

      <ConfirmDialog
        confirmLabel="Delete"
        description="This cannot be undone."
        onConfirm={() => {
          if (pendingDeleteIds) {
            handleDeleteRecords(pendingDeleteIds);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteIds(null);
          }
        }}
        open={pendingDeleteIds !== null}
        title={`Delete ${deleteCount} record${deleteCount === 1 ? "" : "s"}?`}
      />

      <ConfirmDialog
        confirmLabel="Discard"
        description="You have unsaved changes. Discard them?"
        onConfirm={() => pendingAction?.()}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
        open={pendingAction !== null}
        title="Discard unsaved changes?"
      />
    </div>
  );
}
