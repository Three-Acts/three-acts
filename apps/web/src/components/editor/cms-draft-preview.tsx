import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { isCmsPreviewTemplateCollection, readCmsDraftPreview, type CmsDraftPreview, type CmsPreviewSession } from "@three-acts/cms-schema";
import { CmsDraftPreviewView } from "../../views/editor-cms-preview";

function readSession(): CmsPreviewSession | null {
  const params = new URLSearchParams(window.location.search);
  const collectionId = params.get("collection");
  const recordId = params.get("record");
  const session = params.get("session");
  return isCmsPreviewTemplateCollection(collectionId) && recordId && /^[\w.:-]{1,200}$/.test(recordId) && session && /^[a-zA-Z0-9_-]{16,80}$/.test(session) ? { collectionId, recordId, session } : null;
}

function PreviewError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div data-three-acts-editor-ui="" role="alert" className="mx-auto grid max-w-xl gap-3 px-gutter py-section text-body"><h1 className="text-h3">Draft preview unavailable</h1><p>{message}</p><button type="button" onClick={onRetry} className="focus-ring w-fit border border-line-strong px-4 py-2">Try again</button></div>;
}
class PreviewBoundary extends Component<{ sequence: number; onRetry: () => void; children: ReactNode }, { sequence: number; failed: boolean }> {
  constructor(props: { sequence: number; onRetry: () => void; children: ReactNode }) { super(props); this.state = { sequence: props.sequence, failed: false }; }
  static getDerivedStateFromProps(props: { sequence: number }, state: { sequence: number; failed: boolean }) { return props.sequence === state.sequence ? null : { sequence: props.sequence, failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <PreviewError message="This draft couldn't be displayed. Check its source values, then reload the preview." onRetry={this.props.onRetry}/> : this.props.children; }
}

/** The static shell contains no draft data. Only an origin-checked message
 * from its configured CMS parent can create this transient render model. */
export function CmsDraftPreviewClient({ origin }: { origin: string }) {
  const [session] = useState(readSession);
  const [preview, setPreview] = useState<CmsDraftPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    if (!session || !origin || window.parent === window) return;
    function receive(event: MessageEvent) {
      if (event.source !== window.parent || event.origin !== origin || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "three-acts:cms-preview") {
        const next = readCmsDraftPreview(event.data.preview, session!);
        if (!next || next.sequence <= sequence.current) return;
        sequence.current = next.sequence;
        document.dispatchEvent(new CustomEvent("three-acts:cms-rendering"));
        setPreview(next); setError(null);
      }
      if (event.data.type === "three-acts:cms-preview-error" && event.data.session === session?.session && Number.isSafeInteger(event.data.sequence) && event.data.sequence > sequence.current && typeof event.data.message === "string" && event.data.message.length <= 300) {
        sequence.current = event.data.sequence;
        setPreview(null); setError(event.data.message);
      }
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "three-acts:cms-preview-ready", ...session }, origin);
    return () => window.removeEventListener("message", receive);
  }, [origin, session]);
  useEffect(() => {
    const collectionId = preview?.collectionId ?? (error ? session?.collectionId : null);
    if (collectionId) document.dispatchEvent(new CustomEvent("three-acts:cms-rendered", { detail: { collectionId } }));
  }, [preview, error, session]);
  function retry() { if (session && origin && window.parent !== window) window.parent.postMessage({ type: "three-acts:cms-preview-retry", ...session }, origin); }
  if (!session || !origin || window.parent === window) return <p className="px-gutter py-section text-body">Open saved CMS drafts from the authenticated designer.</p>;
  if (error) return <PreviewError message={error} onRetry={retry}/>;
  return preview ? <PreviewBoundary sequence={preview.sequence} onRetry={retry}><CmsDraftPreviewView preview={preview}/></PreviewBoundary> : <p role="status" className="px-gutter py-section text-body">Waiting for an authenticated CMS draft preview…</p>;
}
