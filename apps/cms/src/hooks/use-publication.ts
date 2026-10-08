import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthUser } from "@three-acts/auth";
import type { PublicationConfiguration, PublicationDeployment } from "@three-acts/static-content";
import { useCmsBackend } from "../cms/backend-context";
import { apiFetch } from "../lib/api-client";
import { pushDesignerChanges } from "../components/designer/client";
import { advancePublication, preparePublication, publicationStorageKey, readScopedPublicationReceipt, type PublicationReceipt } from "../components/designer/publication-model";
import { loadCmsPublicationReview, type CmsPublicationReviewItem } from "../components/designer/publication-review";
import type { PublicationSource } from "../components/designer/publication-source";
import type { Drafts } from "../components/designer/drafts";

export type PublicationReview = { source: PublicationSource; drafts: Drafts; queue: CmsPublicationReviewItem[] };
export type PublicationStatus = Pick<PublicationReceipt, "state" | "revision">;

export function usePublication({ source, user, onPublished }: { source: PublicationSource | null; user: AuthUser; onPublished?: () => void }) {
  const backend = useCmsBackend();
  const [review, setReview] = useState<PublicationReview | null>(null);
  const [receipt, setReceipt] = useState<PublicationReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState<string | null>(null);
  const [message, setMessage] = useState("Publish reviewed changes");
  const receiptRef = useRef<PublicationReceipt | null>(null);
  const recoveryRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const latest = useRef({ source, onPublished });
  useEffect(() => { latest.current = { source, onPublished }; }, [source, onPublished]);
  const repository = source?.workspace?.repository, branch = source?.workspace?.branch;
  const key = repository && branch ? publicationStorageKey(user.id, repository, branch) : null;

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      receiptRef.current = null; recoveryRef.current = null; setReceipt(null); setRecovery(null);
      if (!key || !repository || !branch) return;
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(key);
        if (!raw) return;
        const saved = readScopedPublicationReceipt(JSON.parse(raw), user.id, repository, branch);
        const restored: PublicationReceipt = saved.state === "live" ? { ...saved, step: "verify", state: "verifying" } : saved;
        receiptRef.current = restored; setReceipt(restored);
      } catch {
        recoveryRef.current = raw; setRecovery(raw);
        setError(raw ? "Saved publication could not be restored. Download its recovery before starting a new review." : "Publication storage is unavailable. Keep this tab open.");
      }
    });
    return () => { cancelled = true; };
  }, [key, repository, branch, user.id]);

  const run = useCallback(async (captured: PublicationReceipt) => {
    if (busyRef.current || !key) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      const result = await advancePublication(captured, {
        configuration: () => apiFetch<PublicationConfiguration>("/editor/deploy"),
        push: pushDesignerChanges,
        onCommitted: (committed, reviewed) => latest.current.source?.acknowledge(committed, reviewed, captured.repository, captured.branch, captured.baseRevision),
        promote: async records => {
          const result = await backend.data.publishReviewed(records);
          latest.current.onPublished?.();
          return result;
        },
        deploy: (identity, retry) => apiFetch<PublicationDeployment>("/editor/deploy", { method: "POST", body: JSON.stringify({ ...identity, retry }) }),
        check: (identity, id) => apiFetch<PublicationDeployment>(`/editor/deploy?${new URLSearchParams({ ...identity, ...(id ? { id } : {}) })}`),
        save: next => {
          if (recoveryRef.current) localStorage.setItem(`${key}:recovery`, recoveryRef.current);
          localStorage.setItem(key, JSON.stringify(next));
          receiptRef.current = next; setReceipt(next);
        }
      });
      setError(result.error ?? "");
    } catch (error) { setError(error instanceof Error ? error.message : "Publication recovery could not be saved. Keep this tab open."); }
    finally { busyRef.current = false; setBusy(false); }
  }, [backend.data, key]);

  useEffect(() => {
    if (busy || receipt?.step !== "verify" || !["deploying", "verifying"].includes(receipt.state) || Date.now() - Date.parse(receipt.startedAt) > 600_000) return;
    const timer = window.setTimeout(() => { if (receiptRef.current) void run(receiptRef.current); }, 2500);
    return () => window.clearTimeout(timer);
  }, [receipt, busy, run]);
  useEffect(() => () => controller.current?.abort(), []);

  async function loadReview() {
    const current = latest.current.source;
    if (busyRef.current || current?.busy || receiptRef.current && ["committed", "promoting", "deploying", "verifying"].includes(receiptRef.current.state)) return;
    if (!current?.workspace) { setError("Wait for the source workspace to load before reviewing publication."); return; }
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError("");
    const captured = { ...current, workspace: structuredClone(current.workspace), drafts: structuredClone(current.drafts) };
    try {
      const queue = await loadCmsPublicationReview(backend.data, request.signal);
      if (!request.signal.aborted) setReview({ source: captured, drafts: captured.drafts, queue });
    } catch (error) { if (!request.signal.aborted) setError(error instanceof Error ? error.message : "Publication review could not load."); }
    finally { if (controller.current === request) setLoading(false); }
  }
  function closeReview() { controller.current?.abort(); setLoading(false); setReview(null); }
  async function publishReview() {
    if (!review?.source.workspace || busyRef.current) return;
    try {
      const changes = Object.entries(review.drafts).map(([id, draft]) => ({ id, sha: draft.sha, content: draft.content }));
      const captured = preparePublication(user.id, review.source.workspace, changes, review.queue.map(item => item.record), message);
      // Keep the previous release recoverable when the user starts a new one.
      if (receiptRef.current) {
        const previous = JSON.stringify(receiptRef.current);
        recoveryRef.current = previous; setRecovery(previous);
      }
      closeReview(); await run(captured);
    } catch (error) { setError(error instanceof Error ? error.message : "Publication review is invalid."); }
  }
  const resume = () => { if (receiptRef.current) void run(receiptRef.current); };
  const locked = loading || Boolean(review) || busy && !["verify", "done"].includes(receipt?.step ?? "source");
  const pending = Boolean(receipt && ["committed", "promoting", "deploying", "verifying"].includes(receipt.state));
  return { review, receipt, loading, busy, locked, pending, error, recovery, message, setMessage, loadReview, closeReview, publishReview, resume };
}
