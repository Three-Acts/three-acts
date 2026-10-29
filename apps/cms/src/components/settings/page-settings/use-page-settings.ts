import { useEffect, useMemo, useRef, useState } from "react";
import { useCmsBackend } from "../../../cms/backend-context";
import type { CmsCollectionSummary, CmsRecord } from "../../../cms/types";
import { useSettingsRecord } from "../../../hooks/use-settings-record";
import { readSiteDefaults, suggestPagePath, text } from "./seo";
import type { SiteDefaults } from "./seo";

/** Static pages sort by path, so "/" leads and nested paths sit under their parent. */
function sortPages(records: CmsRecord[]): CmsRecord[] {
  return [...records].sort((a, b) => text(a.values, "pagePath").localeCompare(text(b.values, "pagePath")));
}

type UsePageSettingsOptions = {
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => void;
};

/**
 * Data logic for the Page settings view: the page list and selection, plus
 * the read-only site defaults the form's fallbacks and previews render from.
 * Editing the selected page (draft, dirty tracking, saves, conflicts,
 * uploads) is the shared `useSettingsRecord`.
 */
export function usePageSettings(collection: CmsCollectionSummary, { onDirtyChange, onSaved }: UsePageSettingsOptions) {
  const { data } = useCmsBackend();
  const record = useSettingsRecord({ collection, onDirtyChange, onSaved });
  const { lastSaved, load, reportError } = record;
  const [loadedPages, setPages] = useState<CmsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [siteRecord, setSiteRecord] = useState<CmsRecord | null>(null);
  const [hasSiteSettings, setHasSiteSettings] = useState(false);

  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });

  useEffect(() => {
    let isMounted = true;

    data
      .listRecords(collection.id)
      .then(({ records }) => {
        if (!isMounted) {
          return;
        }

        const sorted = sortPages(records);
        setPages(sorted);
        load(sorted[0] ?? null);
      })
      .catch((error: unknown) => {
        if (isMounted) {
          reportError(error, "Couldn’t load pages");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [collection.id, data, load, reportError]);

  // The list shows the selected page as last saved, so saves and reloads
  // (status pill, name, path) appear without refetching.
  const pages = useMemo(
    () => sortPages(loadedPages.map((page) => (lastSaved && page.id === lastSaved.id ? lastSaved : page))),
    [lastSaved, loadedPages]
  );

  // Site settings are read-only here: they only feed the title template,
  // default description/image placeholders and the previews. A registry
  // without a site-settings singleton is fine — everything falls back to empty.
  useEffect(() => {
    let isMounted = true;

    data
      .listCollections()
      .then(async (collections) => {
        const site = collections.find((candidate) => candidate.settingsView === "site");
        if (!site) {
          return;
        }

        const { records } = await data.listRecords(site.id, { limit: 1 });
        if (isMounted) {
          setHasSiteSettings(true);
          setSiteRecord(records[0] ?? null);
        }
      })
      .catch(() => {
        // Previews degrade to the page's own values; not worth a toast.
      });

    return () => {
      isMounted = false;
    };
  }, [data]);

  const site: SiteDefaults = useMemo(() => readSiteDefaults(siteRecord), [siteRecord]);

  function selectPage(pageId: string | null) {
    // Commit the outgoing page's saved copy before `lastSaved` moves on.
    setPages(pages);
    load(pageId ? (pages.find((page) => page.id === pageId) ?? null) : null);
  }

  async function createPage() {
    try {
      const pagePath = suggestPagePath(pages.map((page) => text(page.values, "pagePath")));
      const created = await data.createRecord(collection.id, { pageName: "New page", pagePath });
      setPages([...pages, created]);
      load(created);
      onSavedRef.current();
    } catch (error) {
      reportError(error, "Couldn’t add a page");
    }
  }

  async function deletePage() {
    const deletedId = record.draft?.id;
    if (!deletedId) {
      return;
    }

    try {
      await data.deleteRecord(collection.id, deletedId);
      const index = pages.findIndex((page) => page.id === deletedId);
      const remaining = pages.filter((page) => page.id !== deletedId);
      setPages(remaining);
      load(remaining[Math.min(Math.max(index, 0), remaining.length - 1)] ?? null);
      onSavedRef.current();
    } catch (error) {
      reportError(error, "Couldn’t delete this page");
    }
  }

  return {
    ...record,
    createPage,
    deletePage,
    hasSiteSettings,
    isLoading,
    pages,
    selectPage,
    selectedId: record.draft?.id ?? null,
    site
  };
}
