import { useEffect, useMemo, useState } from "react";
import { useCmsBackend } from "../cms/backend-context";
import { describeCmsError } from "../cms/errors";
import type {
  AssetField,
  CmsCollectionSummary,
  CmsRecord,
  CmsRecordValue,
  ImageField,
  ImageGalleryField,
  ImageValue,
  PublishStatus
} from "../cms/types";
import { parseImageGallery, parseImageValue, serializeImageGallery, serializeImageValue } from "../cms/types";
import { rememberAssetMeta } from "../components/atoms";
import type { CollectionGroup } from "../components/workspace";
import { getRecordTitle } from "../lib/records";
import { exportRecords } from "../lib/export-records";
import { getImageDimensions } from "../lib/image-dimensions";

/** Shallow-compares two records' editable surface: field values plus publish status. */
function areValuesEqual(a: Record<string, CmsRecordValue>, b: Record<string, CmsRecordValue>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of keys) {
    if ((a[key] ?? null) !== (b[key] ?? null)) {
      return false;
    }
  }

  return true;
}

export function useCmsWorkspace() {
  const { data, storage } = useCmsBackend();
  const [collections, setCollections] = useState<CmsCollectionSummary[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState("");
  const [records, setRecords] = useState<CmsRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  // Raw, async-driven state: whatever was last fetched/created/saved, whether
  // or not it still matches `selectedRecordId`. The publicly exposed
  // `draftRecord` (derived below) is what the UI should actually show.
  const [draftRecordState, setDraftRecordState] = useState<CmsRecord | null>(null);
  // The last record snapshot known to be saved on the server. Compared
  // against the draft to derive `isDirty` — never mutated by `updateDraftValue`.
  const [lastSavedRecordState, setLastSavedRecordState] = useState<CmsRecord | null>(null);
  const [search, setSearch] = useState("");
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    data
      .listCollections()
      .then((nextCollections) => {
        if (!isMounted) {
          return;
        }

        setCollections(nextCollections);
        setActiveCollectionId((current) => current || nextCollections[0]?.id || "");

        // Only flip on the records spinner when a collection is actually about
        // to be fetched — otherwise it never gets cleared when the registry is empty.
        if (nextCollections.length > 0) {
          setIsLoadingRecords(true);
        }
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(describeCmsError(nextError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCollections(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [data]);

  useEffect(() => {
    if (!activeCollectionId) {
      return;
    }

    let isMounted = true;

    data
      .listRecords(activeCollectionId)
      .then(({ records: nextRecords }) => {
        if (isMounted) {
          setRecords(nextRecords);
        }
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(describeCmsError(nextError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingRecords(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCollectionId, data]);

  useEffect(() => {
    if (!selectedRecordId || !activeCollectionId) {
      return;
    }

    if (draftRecordState?.id === selectedRecordId) {
      // Already holding this record in memory (just created or duplicated) —
      // nothing to refetch. (The derived `draftRecord` below is what makes
      // sure nothing stale renders while a *different* id is being fetched.)
      return;
    }

    let isMounted = true;

    data
      .getRecord(activeCollectionId, selectedRecordId)
      .then((record) => {
        if (isMounted) {
          setDraftRecordState(record);
          setLastSavedRecordState(record);
        }
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(describeCmsError(nextError));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCollectionId, selectedRecordId, draftRecordState?.id, data]);

  const activeCollection = collections.find((collection) => collection.id === activeCollectionId) ?? collections[0];

  const filteredRecords = useMemo(() => {
    if (!activeCollection) {
      return [];
    }

    const query = search.trim().toLowerCase();

    if (!query) {
      return records;
    }

    return records.filter((record) => {
      const title = getRecordTitle(activeCollection, record).toLowerCase();

      if (title.includes(query)) {
        return true;
      }

      // Match per field rather than joining every value into one string:
      // joining lets a query span two unrelated fields, and booleans
      // stringify to "true"/"false", which would match almost every record.
      return Object.values(record.values).some((value) => {
        if (typeof value === "boolean" || value === null || value === undefined) {
          return false;
        }

        return String(value).toLowerCase().includes(query);
      });
    });
  }, [activeCollection, records, search]);

  // Hidden selections (records ticked, then filtered out by a search) must not
  // silently accumulate. Adjusted directly during render — the idiomatic way
  // to keep one piece of state in sync with another without an extra render
  // pass (see "Adjusting state when a prop changes" in the React docs).
  const [prevFilteredRecords, setPrevFilteredRecords] = useState(filteredRecords);

  if (filteredRecords !== prevFilteredRecords) {
    setPrevFilteredRecords(filteredRecords);
    setSelectedIds((current) => {
      if (current.size === 0) {
        return current;
      }

      const visibleIds = new Set(filteredRecords.map((record) => record.id));
      let changed = false;
      const next = new Set<string>();

      for (const id of current) {
        if (visibleIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }

  // What the UI should actually see: `null` whenever the raw state doesn't
  // (yet) match the selected id, so switching records can never flash the
  // previous one's data or accept edits into it while the new one loads.
  const draftRecord = draftRecordState && draftRecordState.id === selectedRecordId ? draftRecordState : null;
  const lastSavedRecord = lastSavedRecordState && lastSavedRecordState.id === selectedRecordId ? lastSavedRecordState : null;

  const isDirty = useMemo(() => {
    if (!draftRecord || !lastSavedRecord || draftRecord.id !== lastSavedRecord.id) {
      return false;
    }

    if (draftRecord.publishStatus !== lastSavedRecord.publishStatus) {
      return true;
    }

    return !areValuesEqual(draftRecord.values, lastSavedRecord.values);
  }, [draftRecord, lastSavedRecord]);

  // Discourage navigating away (closing the tab, reloading) with unsaved edits.
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // Drives the top bar's "Publish site" button: it only appears once some
  // collection actually has something queued. Lives on the summary rather
  // than being derived from `records` because the active collection's
  // records are only a slice of what's queued across the whole registry.
  const queuedCount = useMemo(() => collections.reduce((sum, collection) => sum + collection.queuedCount, 0), [collections]);

  const groups = useMemo<CollectionGroup[]>(() => {
    return collections.reduce<CollectionGroup[]>((acc, collection) => {
      const groupName = collection.group ?? "Collections";
      const group = acc.find((item) => item.group === groupName);

      if (group) {
        group.collections.push(collection);
      } else {
        acc.push({ group: groupName, collections: [collection] });
      }

      return acc;
    }, []);
  }, [collections]);

  function handleSelectCollection(collectionId: string) {
    if (collectionId === activeCollectionId) {
      // Nothing changes, so don't flip the table into a "Loading records…"
      // state the id-keyed fetch effect will never clear.
      return;
    }

    setIsLoadingRecords(true);
    setSelectedRecordId(null);
    setDraftRecordState(null);
    setLastSavedRecordState(null);
    setSearch("");
    setError(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setActiveCollectionId(collectionId);
  }

  function toggleSelectionMode() {
    setSelectionMode((current) => !current);
    setSelectedIds(new Set());
  }

  function toggleRecordSelected(recordId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }

      return next;
    });
  }

  function toggleSelectAll(selected: boolean) {
    setSelectedIds(selected ? new Set(filteredRecords.map((record) => record.id)) : new Set());
  }

  async function handleDeleteRecords(ids: string[]) {
    if (!activeCollection || ids.length === 0) {
      return;
    }

    setError(null);

    // Settle every delete before touching state: one failed delete must not
    // stop the rest from running, or leave the list/sidebar count stale.
    const results = await Promise.allSettled(ids.map((id) => data.deleteRecord(activeCollection.id, id)));
    const failedCount = results.filter((result) => result.status === "rejected").length;

    try {
      const { records: nextRecords } = await data.listRecords(activeCollection.id);
      setRecords(nextRecords);
      await refreshCollections();
    } catch (nextError) {
      setError(describeCmsError(nextError));
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of ids) {
        next.delete(id);
      }
      return next;
    });

    if (selectedRecordId && ids.includes(selectedRecordId)) {
      setSelectedRecordId(null);
      setDraftRecordState(null);
      setLastSavedRecordState(null);
    }

    if (failedCount > 0) {
      setError(`Unable to delete ${failedCount} of ${ids.length} record${ids.length === 1 ? "" : "s"}.`);
    }
  }

  async function handleImportRecords(rows: Array<Record<string, CmsRecordValue>>) {
    if (!activeCollection) {
      return;
    }

    setError(null);

    try {
      await data.importRecords(activeCollection.id, rows);
      const { records: nextRecords } = await data.listRecords(activeCollection.id);
      setRecords(nextRecords);
      await refreshCollections();
      setIsImportOpen(false);
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  function handleExport(recordsToExport: CmsRecord[]) {
    if (!activeCollection) {
      return;
    }

    exportRecords(activeCollection, recordsToExport);
  }

  async function handleCreateRecord() {
    if (!activeCollection) {
      return;
    }

    setError(null);

    try {
      const record = await data.createRecord(activeCollection.id);
      const { records: nextRecords } = await data.listRecords(activeCollection.id);
      setRecords(nextRecords);
      await refreshCollections();
      setSelectedRecordId(record.id);
      setDraftRecordState(record);
      setLastSavedRecordState(record);
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  async function handleDuplicateRecord() {
    if (!activeCollection || !draftRecord) {
      return;
    }

    setError(null);

    try {
      const values: Record<string, CmsRecordValue> = { ...draftRecord.values };

      // System identifiers must not carry into the copy; the backend assigns new ones.
      for (const field of activeCollection.fields) {
        if (field.type === "readonly") {
          delete values[field.key];
        }
      }

      const titleKey = activeCollection.titleField;
      if (titleKey && typeof values[titleKey] === "string" && values[titleKey]) {
        values[titleKey] = `${values[titleKey]} (copy)`;
      }

      const [copy] = await data.importRecords(activeCollection.id, [values]);
      const { records: nextRecords } = await data.listRecords(activeCollection.id);
      setRecords(nextRecords);
      await refreshCollections();

      if (copy) {
        setSelectedRecordId(copy.id);
        setDraftRecordState(copy);
        setLastSavedRecordState(copy);
      }
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  async function handleSaveRecord(nextStatus?: PublishStatus) {
    if (!activeCollection || !draftRecord) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const recordToSave = nextStatus ? { ...draftRecord, publishStatus: nextStatus } : draftRecord;
    // Snapshot of what we're sending, so we can tell afterwards which fields
    // the user changed *while the request was in flight*.
    const valuesAtSaveStart = recordToSave.values;

    try {
      const savedRecord = await data.saveRecord(activeCollection.id, recordToSave, {
        expectedModifiedAt: lastSavedRecord?.modifiedAt
      });

      setDraftRecordState((current) => {
        if (!current || current.id !== savedRecord.id) {
          // The user navigated away from this record before the save resolved.
          return current;
        }

        // Server-normalised values win for every field the user left alone;
        // anything they changed since the save started is preserved.
        const mergedValues: Record<string, CmsRecordValue> = { ...savedRecord.values };

        for (const key of Object.keys(current.values)) {
          if (current.values[key] !== valuesAtSaveStart[key]) {
            mergedValues[key] = current.values[key];
          }
        }

        return { ...savedRecord, values: mergedValues };
      });
      setLastSavedRecordState(savedRecord);
      setRecords((currentRecords) => currentRecords.map((record) => (record.id === savedRecord.id ? savedRecord : record)));

      // A plain field-value save never moves a record in or out of
      // "queued_to_publish", so only a status-changing save needs to refresh
      // the summaries the Publish button and sidebar counts read from.
      if (nextStatus) {
        await refreshCollections();
      }
    } catch (nextError) {
      setError(describeCmsError(nextError));
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Re-reads the active collection's records and count without disturbing the
   * open draft. Used after a publish transition changes statuses server-side.
   */
  async function refreshRecords() {
    if (!activeCollection) {
      return;
    }

    try {
      const { records: nextRecords, total } = await data.listRecords(activeCollection.id);
      setRecords(nextRecords);
      setCollections((currentCollections) =>
        currentCollections.map((collection) => (collection.id === activeCollection.id ? { ...collection, count: total } : collection))
      );

      if (selectedRecordId && !isDirty) {
        const record = await data.getRecord(activeCollection.id, selectedRecordId);
        setDraftRecordState(record);
        setLastSavedRecordState(record);
      }
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  /**
   * Re-fetches the collection registry and replaces `collections` wholesale
   * (both `count` and `queuedCount`), leaving `activeCollectionId` untouched.
   * Called after anything that can move a record's publish status or change
   * how many records a collection holds.
   */
  async function refreshCollections() {
    try {
      const nextCollections = await data.listCollections();
      setCollections(nextCollections);
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  /** Bulk status override for the selection toolbar's "Update items" menu. */
  async function handleUpdateSelectedStatus(status: Exclude<PublishStatus, "published">) {
    if (!activeCollection || selectedIds.size === 0) {
      return;
    }

    setError(null);

    try {
      const updated = await data.setPublishStatus(activeCollection.id, Array.from(selectedIds), status);
      const updatedById = new Map(updated.map((record) => [record.id, record] as const));

      setRecords((currentRecords) => currentRecords.map((record) => updatedById.get(record.id) ?? record));
      await refreshCollections();
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  /** Discards the draft and re-fetches the record — the recovery path from a `conflict` save error. */
  async function reloadRecord() {
    if (!activeCollection || !selectedRecordId) {
      return;
    }

    setError(null);

    try {
      const record = await data.getRecord(activeCollection.id, selectedRecordId);
      setDraftRecordState(record);
      setLastSavedRecordState(record);
    } catch (nextError) {
      setError(describeCmsError(nextError));
    }
  }

  function updateDraftValue(fieldKey: string, value: CmsRecordValue) {
    setDraftRecordState((record) => {
      if (!record) {
        return record;
      }

      return {
        ...record,
        values: {
          ...record.values,
          [fieldKey]: value
        }
      };
    });
  }

  async function handleAssetUpload(field: AssetField | ImageField, file: File) {
    if (!activeCollection || !draftRecord) {
      return;
    }

    // Capture which record we're uploading into: if the editor switches to a
    // different record before the upload resolves, the URL must not land there.
    const uploadRecordId = draftRecord.id;
    setUploadingField(field.key);
    setError(null);

    try {
      const [result, dimensions] = await Promise.all([
        storage.uploadAsset(activeCollection.id, field.key, file),
        field.type === "image" ? getImageDimensions(file) : Promise.resolve(null)
      ]);

      // The record only ever stores the URL, so the real file name/size must
      // be captured now — nothing about the URL itself carries them, and a
      // mock-storage URL never will.
      rememberAssetMeta(result.url, { fileName: result.fileName, size: result.size });

      setDraftRecordState((current) => {
        if (!current || current.id !== uploadRecordId) {
          return current;
        }

        const nextValue =
          field.type === "image"
            ? serializeImageValue({
                src: result.url,
                fileName: result.fileName,
                size: result.size,
                ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
                // Replacing the file keeps the editor's alt text.
                alt: parseImageValue(current.values[field.key])?.alt
              })
            : result.url;

        return {
          ...current,
          values: {
            ...current.values,
            [field.key]: nextValue
          }
        };
      });
    } catch (nextError) {
      setError(describeCmsError(nextError));
    } finally {
      setUploadingField(null);
    }
  }

  /** Appends every successfully uploaded file to a gallery, in input order; failures keep the rest. */
  async function handleGalleryUpload(field: ImageGalleryField, files: File[]) {
    if (!activeCollection || !draftRecord || files.length === 0) {
      return;
    }

    const uploadRecordId = draftRecord.id;
    const currentCount = parseImageGallery(draftRecord.values[field.key]).length;
    const availableSlots = field.maxItems === undefined ? files.length : Math.max(0, field.maxItems - currentCount);
    const filesToUpload = files.slice(0, availableSlots);
    const skippedCount = files.length - filesToUpload.length;
    if (filesToUpload.length === 0) {
      setError(`Maximum of ${field.maxItems} images reached.`);
      return;
    }
    setUploadingField(field.key);
    setError(null);

    try {
      const outcomes = await Promise.allSettled(
        filesToUpload.map(async (file): Promise<ImageValue> => {
          const [result, dimensions] = await Promise.all([
            storage.uploadAsset(activeCollection.id, field.key, file),
            getImageDimensions(file)
          ]);
          rememberAssetMeta(result.url, { fileName: result.fileName, size: result.size });
          return {
            src: result.url,
            fileName: result.fileName,
            size: result.size,
            ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {})
          };
        })
      );

      const succeeded = outcomes.flatMap((outcome) => (outcome.status === "fulfilled" ? [outcome.value] : []));
      const failedCount = outcomes.length - succeeded.length;

      setDraftRecordState((current) => {
        if (!current || current.id !== uploadRecordId) {
          return current;
        }

        return {
          ...current,
          values: {
            ...current.values,
            [field.key]: serializeImageGallery([...parseImageGallery(current.values[field.key]), ...succeeded])
          }
        };
      });

      if (failedCount > 0 || skippedCount > 0) {
        const rejectedCount = failedCount + skippedCount;
        setError(
          succeeded.length === 0
            ? `Unable to add ${rejectedCount} file${rejectedCount === 1 ? "" : "s"}.`
            : `Unable to add ${rejectedCount} of ${files.length} files — kept the rest.`
        );
      }
    } catch (nextError) {
      setError(describeCmsError(nextError));
    } finally {
      setUploadingField(null);
    }
  }

  /** Replaces one gallery item in place, preserving its position and alt text. */
  async function handleGalleryItemUpload(field: ImageGalleryField, index: number, file: File) {
    if (!activeCollection || !draftRecord) {
      return;
    }

    const uploadRecordId = draftRecord.id;
    setUploadingField(field.key);
    setError(null);

    try {
      const [result, dimensions] = await Promise.all([storage.uploadAsset(activeCollection.id, field.key, file), getImageDimensions(file)]);
      rememberAssetMeta(result.url, { fileName: result.fileName, size: result.size });

      setDraftRecordState((current) => {
        if (!current || current.id !== uploadRecordId) {
          return current;
        }

        const items = parseImageGallery(current.values[field.key]);
        if (index < 0 || index >= items.length) {
          return current;
        }

        const nextItems = [...items];
        nextItems[index] = {
          src: result.url,
          fileName: result.fileName,
          size: result.size,
          ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
          alt: items[index].alt
        };

        return {
          ...current,
          values: {
            ...current.values,
            [field.key]: serializeImageGallery(nextItems)
          }
        };
      });
    } catch (nextError) {
      setError(describeCmsError(nextError));
    } finally {
      setUploadingField(null);
    }
  }

  function clearError() {
    setError(null);
  }

  return {
    activeCollection,
    activeCollectionId,
    clearError,
    draftRecord,
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
    reloadRecord,
    search,
    selectedIds,
    selectedRecordId,
    selectionMode,
    setIsImportOpen,
    setSearch,
    setSelectedRecordId,
    toggleRecordSelected,
    toggleSelectAll,
    toggleSelectionMode,
    updateDraftValue,
    uploadingField
  };
}
