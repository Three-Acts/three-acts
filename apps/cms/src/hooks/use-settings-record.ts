import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCmsBackend } from "../cms/backend-context";
import { describeCmsError } from "../cms/errors";
import type {
  AssetField,
  CmsCollectionSummary,
  CmsRecord,
  CmsRecordValue,
  FileField,
  ImageField,
  ImageGalleryField,
  ImageValue,
  PublishStatus,
  VideoField
} from "../cms/types";
import { isCmsError, parseImageGallery, parseImageValue, serializeFileValue, serializeImageGallery, serializeImageValue, serializeVideoValue } from "../cms/types";
import { rememberAssetMeta, useToast } from "../components/atoms";
import { getImageDimensions } from "../lib/image-dimensions";

type UseSettingsRecordOptions = {
  collection: CmsCollectionSummary;
  /** Mirrors `isDirty` up to the workspace so its navigation guard can see it. */
  onDirtyChange: (dirty: boolean) => void;
  /** Called after any successful save so the workspace can refresh summaries. */
  onSaved: () => void;
};

function areValuesEqual(a: Record<string, CmsRecordValue>, b: Record<string, CmsRecordValue>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    if ((a[key] ?? null) !== (b[key] ?? null)) {
      return false;
    }
  }

  return true;
}

/**
 * Draft/saved state for ONE record edited outside the table workflow (the
 * settings views). The caller decides which record to show and hands it in via
 * `load`; the hook owns dirty tracking, saving with optimistic concurrency,
 * discard/reload, and uploads for the FieldControl media fields. Failures are
 * surfaced as error toasts.
 */
export function useSettingsRecord({ collection, onDirtyChange, onSaved }: UseSettingsRecordOptions) {
  const { data, storage } = useCmsBackend();
  const toast = useToast();
  const [draft, setDraft] = useState<CmsRecord | null>(null);
  const [lastSaved, setLastSaved] = useState<CmsRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  /** The last save lost an optimistic-concurrency race; `discard` recovers. */
  const [hasConflict, setHasConflict] = useState(false);

  const onDirtyChangeRef = useRef(onDirtyChange);
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
    onSavedRef.current = onSaved;
  });

  const reportError = useCallback(
    (error: unknown, title = "Something went wrong") => {
      // Base UI's toast `add` flushes synchronously; defer it so it never runs
      // inside a React render/effect phase.
      const description = describeCmsError(error);
      window.setTimeout(() => toast.push({ tone: "error", title, description, duration: 8000 }), 0);
    },
    [toast]
  );

  const isDirty = useMemo(() => {
    if (!draft || !lastSaved || draft.id !== lastSaved.id) {
      return false;
    }

    return draft.publishStatus !== lastSaved.publishStatus || !areValuesEqual(draft.values, lastSaved.values);
  }, [draft, lastSaved]);

  useEffect(() => {
    onDirtyChangeRef.current(isDirty);
  }, [isDirty]);

  // Unmounting drops the draft, so the workspace must not keep guarding it.
  useEffect(() => () => onDirtyChangeRef.current(false), []);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  /** Replaces both the draft and the saved snapshot (fresh load, create, or reload). */
  const load = useCallback((record: CmsRecord | null) => {
    setDraft(record);
    setLastSaved(record);
    setHasConflict(false);
  }, []);

  function updateValue(fieldKey: string, value: CmsRecordValue) {
    setDraft((current) => (current ? { ...current, values: { ...current.values, [fieldKey]: value } } : current));
  }

  /** Saves the draft; `nextStatus` also moves its Publish Status. Resolves to the saved record, or null on failure. */
  async function save(nextStatus?: Exclude<PublishStatus, "published">): Promise<CmsRecord | null> {
    if (!draft) {
      return null;
    }

    setIsSaving(true);
    setHasConflict(false);
    const recordToSave = nextStatus ? { ...draft, publishStatus: nextStatus } : draft;
    const valuesAtSaveStart = recordToSave.values;

    try {
      const saved = await data.saveRecord(collection.id, recordToSave, { expectedModifiedAt: lastSaved?.modifiedAt });

      setDraft((current) => {
        if (!current || current.id !== saved.id) {
          return current;
        }

        // Server-normalised values win, except fields edited while the save was in flight.
        const merged: Record<string, CmsRecordValue> = { ...saved.values };
        for (const key of Object.keys(current.values)) {
          if (current.values[key] !== valuesAtSaveStart[key]) {
            merged[key] = current.values[key];
          }
        }

        return { ...saved, values: merged };
      });
      setLastSaved(saved);
      onSavedRef.current();
      return saved;
    } catch (error) {
      if (isCmsError(error) && error.code === "conflict") {
        setHasConflict(true);
      }

      reportError(error, "Unable to save");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  /** Drops local edits and re-reads the stored record — also the recovery path after a `conflict`. */
  async function discard() {
    if (!draft) {
      return;
    }

    try {
      load(await data.getRecord(collection.id, draft.id));
    } catch (error) {
      reportError(error, "Unable to reload");
    }
  }

  async function uploadAsset(field: AssetField | ImageField | VideoField | FileField, file: File) {
    if (!draft) {
      return;
    }

    const recordId = draft.id;
    setUploadingField(field.key);

    try {
      const [result, dimensions] = await Promise.all([
        storage.uploadAsset(collection.id, field.key, file),
        field.type === "image" ? getImageDimensions(file) : Promise.resolve(null)
      ]);
      rememberAssetMeta(result.url, { fileName: result.fileName, size: result.size });
      const typed = { src: result.url, fileName: result.fileName, size: result.size, ...(file.type ? { contentType: file.type } : {}) };

      setDraft((current) => {
        if (!current || current.id !== recordId) {
          return current;
        }

        let nextValue: CmsRecordValue = result.url;
        if (field.type === "image") {
          nextValue = serializeImageValue({
            src: result.url,
            fileName: result.fileName,
            size: result.size,
            ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
            alt: parseImageValue(current.values[field.key])?.alt
          });
        } else if (field.type === "video") {
          nextValue = serializeVideoValue(typed);
        } else if (field.type === "file") {
          nextValue = serializeFileValue(typed);
        }

        return { ...current, values: { ...current.values, [field.key]: nextValue } };
      });
    } catch (error) {
      reportError(error, "Upload failed");
    } finally {
      setUploadingField(null);
    }
  }

  async function uploadImage(field: ImageGalleryField, file: File): Promise<ImageValue> {
    const [result, dimensions] = await Promise.all([storage.uploadAsset(collection.id, field.key, file), getImageDimensions(file)]);
    rememberAssetMeta(result.url, { fileName: result.fileName, size: result.size });
    return {
      src: result.url,
      fileName: result.fileName,
      size: result.size,
      ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {})
    };
  }

  /** Appends uploaded images to a gallery (respecting `maxItems`); failures keep the rest. */
  async function uploadGallery(field: ImageGalleryField, files: File[]) {
    if (!draft || files.length === 0) {
      return;
    }

    const recordId = draft.id;
    const current = parseImageGallery(draft.values[field.key]).length;
    const slots = field.maxItems === undefined ? files.length : Math.max(0, field.maxItems - current);
    setUploadingField(field.key);

    try {
      const outcomes = await Promise.allSettled(files.slice(0, slots).map((file) => uploadImage(field, file)));
      const added = outcomes.flatMap((outcome) => (outcome.status === "fulfilled" ? [outcome.value] : []));

      setDraft((record) =>
        record && record.id === recordId
          ? {
              ...record,
              values: { ...record.values, [field.key]: serializeImageGallery([...parseImageGallery(record.values[field.key]), ...added]) }
            }
          : record
      );

      if (added.length < files.length) {
        reportError(new Error(`Unable to add ${files.length - added.length} of ${files.length} files.`), "Upload failed");
      }
    } finally {
      setUploadingField(null);
    }
  }

  /** Replaces one gallery item in place, keeping its alt text. */
  async function uploadGalleryItem(field: ImageGalleryField, index: number, file: File) {
    if (!draft) {
      return;
    }

    const recordId = draft.id;
    setUploadingField(field.key);

    try {
      const image = await uploadImage(field, file);
      setDraft((record) => {
        if (!record || record.id !== recordId) {
          return record;
        }

        const items = parseImageGallery(record.values[field.key]);
        if (!items[index]) {
          return record;
        }

        const next = [...items];
        next[index] = { ...image, alt: items[index].alt };
        return { ...record, values: { ...record.values, [field.key]: serializeImageGallery(next) } };
      });
    } catch (error) {
      reportError(error, "Upload failed");
    } finally {
      setUploadingField(null);
    }
  }

  return {
    discard,
    draft,
    hasConflict,
    isDirty,
    isSaving,
    lastSaved,
    load,
    reportError,
    save,
    updateValue,
    uploadAsset,
    uploadGallery,
    uploadGalleryItem,
    uploadingField
  };
}
