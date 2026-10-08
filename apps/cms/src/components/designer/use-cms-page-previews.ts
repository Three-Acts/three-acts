import { useCallback, useEffect, useMemo, useState } from "react";
import { cmsPreviewLimits } from "@three-acts/cms-schema";
import { useCmsBackend } from "../../cms/backend-context";
import type { CmsRecord, PublishStatus } from "../../cms/types";

export type CmsPagePreview = { id: string; label: string; route: string; publishStatus: PublishStatus; liveRoute: string | null; draftRoute: string | null };
type Item = CmsPagePreview & { liveLabel: string | null; draftLabel: string };
type PreviewState = { collectionId: string | null; items: Item[]; loading: boolean; error: string | null };

const pageSize = 100;

/** Includes saved drafts without treating their current slug as a public route. */
export function useCmsPagePreviews(collectionId: string | undefined, routePattern: string | undefined, version: "published" | "draft" = "published", active = true) {
  const { data } = useCmsBackend();
  const [state, setState] = useState<PreviewState>({ collectionId: null, items: [], loading: false, error: null });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!collectionId || !routePattern || !active) {
      return;
    }

    let currentRequest = true;

    void (async () => {
      try {
        const records: CmsRecord[] = [];
        let offset = 0;
        let total = Number.POSITIVE_INFINITY;
        const seen = new Set<string>();
        while (offset < total) {
          const result = await data.listRecords(collectionId, { limit: pageSize, offset });
          if (!currentRequest) return;
          if (!Number.isSafeInteger(result.total) || result.total < 0 || result.total > cmsPreviewLimits.records) throw new Error("This collection exceeds the saved draft preview limit.");
          if (result.records.length > pageSize || offset + result.records.length > result.total || !result.records.length && offset < result.total) throw new Error("CMS records changed while loading items. Try again.");
          for (const record of result.records) {
            if (seen.has(record.id)) throw new Error("CMS records changed while loading items. Try again.");
            seen.add(record.id);
          }
          records.push(...result.records);
          total = result.total;
          if (!result.records.length) break;
          offset += result.records.length;
        }

        const routeFor = (values: CmsRecord["values"] | null) => typeof values?.slug === "string" && values.slug.trim() ? routePattern.replace("[slug]", encodeURIComponent(values.slug)) : null;
        const labelFor = (values: CmsRecord["values"] | null) => {
          const label = values?.title ?? values?.name ?? values?.slug;
          return typeof label === "string" && label.trim() ? label : null;
        };
        const items = records.map((record) => {
          const live = record.liveValues ?? (record.publishStatus === "published" ? record.values : null);
          const liveRoute = routeFor(live);
          const draftRoute = routeFor(record.values);
          const draftLabel = labelFor(record.values) ?? `Untitled item · ${record.id}`;
          return { id: record.id, label: labelFor(live) ?? draftLabel, route: liveRoute ?? draftRoute ?? routePattern, publishStatus: record.publishStatus, liveRoute, draftRoute, liveLabel: labelFor(live), draftLabel };
        });
        if (currentRequest) setState({ collectionId, items, loading: false, error: null });
      } catch (error) {
        if (currentRequest) setState(previous => ({ collectionId, items: previous.collectionId === collectionId ? previous.items : [], loading: false, error: error instanceof Error ? error.message : "Could not load collection items." }));
      }
    })();

    return () => { currentRequest = false; };
  }, [collectionId, data, routePattern, active, revision]);

  // Don't show the previous template's routes during the effect's first render.
  const items = useMemo(() => state.collectionId === collectionId ? state.items.map(item => ({ ...item, label: version === "draft" ? item.draftLabel : item.liveLabel ?? item.draftLabel, route: version === "draft" ? item.draftRoute ?? routePattern! : item.liveRoute ?? item.draftRoute ?? routePattern! })) : [], [state, collectionId, version, routePattern]);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  return { collectionId: collectionId ?? null, items, loading: state.collectionId === collectionId ? state.loading : Boolean(collectionId), error: state.collectionId === collectionId ? state.error : null, refresh };
}
