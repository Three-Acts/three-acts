import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CmsDraftPreview, CmsPreviewTemplateCollection } from "@three-acts/cms-schema";
import { useCmsBackend } from "../../cms/backend-context";
import { loadCmsDraftPreview } from "./cms-draft-preview";

type State = { request: string; sequence: number; preview: CmsDraftPreview | null; error: string | null };
export function useCmsDraftPreview(enabled: boolean, session: string, collectionId: CmsPreviewTemplateCollection | null, recordId: string | null) {
  const { data } = useCmsBackend();
  const [retry, setRetry] = useState(0);
  const request = useMemo(() => `${session}:${collectionId}:${recordId}:${enabled}:${retry}:${crypto.randomUUID()}`, [enabled, session, collectionId, recordId, retry]);
  const sequence = useRef(0);
  const [state, setState] = useState<State>({ request: "", sequence: 0, preview: null, error: null });
  useEffect(() => {
    if (!enabled || !collectionId || !recordId) return;
    let current = true;
    const nextSequence = ++sequence.current;
    void loadCmsDraftPreview(data, { session, sequence: nextSequence, collectionId, recordId }, () => current).then(preview => {
      if (current) setState({ request, sequence: nextSequence, preview, error: null });
    }).catch(error => {
      if (current) setState({ request, sequence: nextSequence, preview: null, error: error instanceof Error ? error.message : "Saved CMS draft couldn't be loaded." });
    });
    return () => { current = false; };
  }, [enabled, session, collectionId, recordId, request, data]);
  const refresh = useCallback(() => setRetry(value => value + 1), []);
  return { preview: state.request === request ? state.preview : null, error: state.request === request ? state.error : null, sequence: state.sequence, loading: enabled && state.request !== request, refresh };
}
