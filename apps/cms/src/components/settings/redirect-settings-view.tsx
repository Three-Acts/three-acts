import { useEffect, useMemo, useState } from "react";
import type { AssetField, CmsCollectionSummary, CmsRecord, FileField, ImageField, VideoField } from "../../cms/types";
import { useCmsBackend } from "../../cms/backend-context";
import { Button, Input, PanelHeader } from "../atoms";
import { RecordEditor } from "../editor/record-editor";
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
        onDiscard={() => setDraft(saved)}
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
      <PanelHeader className="gap-1.5">
        <div className="min-w-0">
          <h2 className="m-0 truncate text-ui-lg font-semibold text-cms-text">Redirects</h2>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Input aria-label="Search redirects" onChange={(event) => setSearch(event.target.value)} placeholder="Search redirects…" value={search} />
          <Button onClick={() => void createRecord()} variant="primary">New redirect</Button>
        </div>
      </PanelHeader>
      <RecordTable
        collection={collection}
        hasSearch={Boolean(search.trim())}
        isLoading={isLoading}
        onSelectRecord={selectRecord}
        onToggleSelectAll={() => undefined}
        onToggleSelected={() => undefined}
        records={filteredRecords}
        selectedIds={new Set()}
        selectionMode={false}
      />
      <footer className="flex h-7 shrink-0 items-center border-t border-cms-line px-3 text-ui tabular-nums text-cms-subtle">
        {filteredRecords.length === records.length ? `${records.length} records` : `${filteredRecords.length} of ${records.length} records`}
      </footer>
    </section>
  );
}
