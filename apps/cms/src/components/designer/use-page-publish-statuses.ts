import { useEffect, useState } from "react";
import { useCmsBackend } from "../../cms/backend-context";
import type { CmsRecord, PublishStatus } from "../../cms/types";

export type PagePublishStatuses = Record<string, PublishStatus>;

type StatusState = { collectionId: string; statuses: PagePublishStatuses };

const pageSize = 100;

/** Loads saved CMS publish states keyed by static page path for the Designer. */
export function usePagePublishStatuses(collectionId: string, revision: number): PagePublishStatuses {
  const { data } = useCmsBackend();
  const [state, setState] = useState<StatusState | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const records: CmsRecord[] = [];
        let offset = 0;
        let total = Number.POSITIVE_INFINITY;
        while (active && offset < total) {
          const result = await data.listRecords(collectionId, { limit: pageSize, offset });
          records.push(...result.records);
          total = result.total;
          if (!result.records.length) break;
          offset += result.records.length;
        }

        const statuses: PagePublishStatuses = {};
        for (const record of records) {
          // A saved path change can still have an older published URL.
          for (const pagePath of [record.liveValues?.pagePath, record.values.pagePath]) {
            if (typeof pagePath === "string" && pagePath.trim()) {
              statuses[pagePath] = record.publishStatus;
            }
          }
        }

        if (active) setState({ collectionId, statuses });
      } catch {
        // Keep the last known status map so a transient refresh failure doesn't
        // clear useful state or replace it with a guessed default.
      }
    })();

    return () => { active = false; };
  }, [collectionId, data, revision]);

  return state?.collectionId === collectionId ? state.statuses : {};
}
