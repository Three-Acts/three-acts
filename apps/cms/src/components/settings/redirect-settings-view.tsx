import { useEffect, useMemo, useState } from "react";
import type { AssetField, CmsCollectionSummary, CmsRecord, CmsRecordValue, FileField, ImageField, VideoField } from "../../cms/types";
import { useCmsBackend } from "../../cms/backend-context";
import { RecordEditor } from "../editor/record-editor";
import { ImportDialog } from "../import";
import { RecordsToolbar } from "../workspace/records-toolbar";
import { RecordTable } from "../workspace/record-table";
import type { SettingsViewProps } from "./index";

type Props = Pick<SettingsViewProps, "onDirtyChange" | "onSaved"> & { collection: CmsCollectionSummary };

export function RedirectSettingsView({ collection, onDirtyChange, onSaved }: Props) {
  const { data, storage } = useCmsBackend();
  const [records, setRecords] = useState<CmsRecord[]>([]);
  const [draft, setDraft] = useState<CmsRecord | null>(null);
  const [saved, setSaved] = useState<CmsRecord | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isDirty = Boolean(draft && saved && (draft.modifiedAt !== saved.modifiedAt || JSON.stringify(draft.values) !== JSON.stringify(saved.values)));
  const filteredRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((record) => Object.values(record.values).some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }, [records, search]);

  useEffect(() => {
    let mounted = true;
    data
      .listRecords(collection.id)
      .then(({ records: next }) => mounted && setRecords(next))
      .catch(() => undefined)
      .finally(() => mounted && setIsLoading(false));
    return () => {
      mounted = false;
    };
  }, [collection.id, data]);

  useEffect(() => {
    onDirtyChange(isDirty);
    return () => onDirtyChange(false);
  }, [isDirty, onDirtyChange]);

  function selectRecord(id: string) {
    const record = records.find((item) => item.id === id) ?? null;
    setDraft(record);
    setSaved(record);
  }

  async function createRecord() {
    try {
      const record = await data.createRecord(collection.id);
      setRecords((current) => [record, ...current]);
      setDraft(record);
      setSaved(record);
    } catch {
      // The global CMS error surface handles collection-level failures.
    }
  }

  async function saveRecord() {
    if (!draft) return;
    setIsSaving(true);
    try {
      const next = await data.saveRecord(collection.id, draft, { expectedModifiedAt: saved?.modifiedAt });
      setRecords((current) => current.map((record) => (record.id === next.id ? next : record)));
      setDraft(next);
      setSaved(next);
      onSaved();
    } catch {
      // Keep the draft visible so the user can retry without losing edits.
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRecord() {
    if (!draft) return;
    try {
      await data.deleteRecord(collection.id, draft.id);
      setRecords((current) => current.filter((record) => record.id !== draft.id));
      setDraft(null);
      setSaved(null);
      onSaved();
    } catch {
      // Keep the editor open when deletion fails.
    }
  }

  async function uploadAsset(field: AssetField | ImageField | VideoField | FileField, file: File) {
    if (!draft) return;
    setUploadingField(field.key);
    try {
      const result = await storage.uploadAsset(collection.id, field.key, file);
      setDraft((current) => (current ? { ...current, values: { ...current.values, [field.key]: result.url } } : current));
    } catch {
      // Keep the current value if storage rejects the upload.
    } finally {
      setUploadingField(null);
    }
  }

  async function importRecords(rows: Array<Record<string, CmsRecordValue>>) {
    try {
      const imported = await data.importRecords(collection.id, rows);
      setRecords((current) => [...imported, ...current]);
      setIsImportOpen(false);
      onSaved();
    } catch {
      // Keep the import dialog open so the user can retry.
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(selected: boolean) {
    setSelectedIds(selected ? new Set(filteredRecords.map((record) => record.id)) : new Set());
  }

  async function deleteSelected() {
    await Promise.all(Array.from(selectedIds, (id) => data.deleteRecord(collection.id, id)));
    setRecords((current) => current.filter((record) => !selectedIds.has(record.id)));
    setSelectedIds(new Set());
    setSelectionMode(false);
    onSaved();
  }

  function exportSelected() {
    const rows = records.filter((record) => selectedIds.has(record.id));
    const headers = collection.fields.map((field) => field.key);
    const csv = [headers.join(","), ...rows.map((record) => headers.map((key) => JSON.stringify(record.values[key] ?? "")).join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "redirect-rules.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (draft) {
    return (
      <RecordEditor
        collection={collection}
        draftRecord={draft}
        isDirty={isDirty}
        isSaving={isSaving}
        onAssetUpload={(field, file) => void uploadAsset(field, file)}
        onBack={() => {
          setDraft(null);
          setSaved(null);
        }}
        onChangeStatus={() => undefined}
        onDelete={() => void deleteRecord()}
        onDuplicate={() => undefined}
        onGalleryItemUpload={() => undefined}
        onGalleryUpload={() => undefined}
        onSave={() => void saveRecord()}
        onUpdateValue={(key, value) => setDraft((current) => (current ? { ...current, values: { ...current.values, [key]: value } } : current))}
        uploadingField={uploadingField}
      />
    );
  }

  return (
    <section aria-label="Redirects" className="flex min-h-0 min-w-0 flex-1 flex-col bg-cms-bg">
      <RecordsToolbar
        canQueueSelected={false}
        canUnpublishSelected={false}
        hasPublishWorkflow={false}
        newLabel="redirect"
        onCreate={() => void createRecord()}
        onDeleteSelected={() => void deleteSelected()}
        onExportSelected={exportSelected}
        onImport={() => setIsImportOpen(true)}
        onSearchChange={setSearch}
        onToggleSelectionMode={() => {
          setSelectionMode((current) => !current);
          setSelectedIds(new Set());
        }}
        onUpdateSelectedStatus={() => undefined}
        search={search}
        selectedCount={selectedIds.size}
        selectionMode={selectionMode}
        title="Redirects"
      />
      <RecordTable
        collection={collection}
        hasSearch={Boolean(search.trim())}
        isLoading={isLoading}
        onSelectRecord={selectRecord}
        onToggleSelectAll={toggleAll}
        onToggleSelected={toggleSelected}
        records={filteredRecords}
        selectedIds={new Set()}
        selectionMode={false}
      />
      <footer className="flex h-7 shrink-0 items-center border-t border-cms-line px-3 text-ui tabular-nums text-cms-subtle">
        {filteredRecords.length === records.length ? `${records.length} records` : `${filteredRecords.length} of ${records.length} records`}
      </footer>
      <ImportDialog collection={collection} onImport={importRecords} onOpenChange={setIsImportOpen} open={isImportOpen} />
    </section>
  );
}
