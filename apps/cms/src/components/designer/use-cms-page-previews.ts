import { useEffect, useState } from "react";
import { useCmsBackend } from "../../cms/backend-context";
import type { CmsRecord, PublishStatus } from "../../cms/types";

export type CmsPagePreview = { id: string; label: string; route: string; publishStatus: PublishStatus };
type PreviewState = { collectionId: string | null; items: CmsPagePreview[]; loading: boolean; error: string | null };

const pageSize = 100;

/** Loads live collection records for selecting a concrete route in the page canvas. */
export function useCmsPagePreviews(collectionId: string | undefined, routePattern: string | undefined): PreviewState {
  const { data } = useCmsBackend();
  const [state, setState] = useState<PreviewState>({ collectionId: null, items: [], loading: false, error: null });

  useEffect(() => {
    if (!collectionId || !routePattern) {
      return;
    }

    let active = true;

    void (async () => {
      try {
        const records: CmsRecord[] = [];
        let offset = 0;
        let total = Number.POSITIVE_INFINITY;
        while (offset < total) {
          const result = await data.listRecords(collectionId, { limit: pageSize, offset });
          records.push(...result.records);
          total = result.total;
          if (!result.records.length) break;
          offset += result.records.length;
        }

        const items = records.flatMap((record) => {
          const values = record.liveValues ?? (record.publishStatus === "published" ? record.values : null);
          if (!values) return [];
          const slug = values.slug;
          if (typeof slug !== "string" || !slug.trim()) return [];
          const labelValue = values.title ?? values.name ?? slug;
          const label = typeof labelValue === "string" && labelValue.trim() ? labelValue : slug;
          return [{ id: record.id, label, route: routePattern.replace("[slug]", encodeURIComponent(slug)), publishStatus: record.publishStatus }];
        });
        if (active) setState({ collectionId, items, loading: false, error: null });
      } catch (error) {
        if (active) setState({ collectionId, items: [], loading: false, error: error instanceof Error ? error.message : "Could not load collection items." });
      }
    })();

    return () => { active = false; };
  }, [collectionId, data, routePattern]);

  // Don't show the previous template's routes during the effect's first render.
  return state.collectionId === collectionId ? state : { collectionId: collectionId ?? null, items: [], loading: Boolean(collectionId), error: null };
}
