import { Button, FormField, Input } from "../atoms";
import { ReviewChanges } from "./review";
import type { usePublication } from "../../hooks/use-publication";
import type { PublicationSource } from "./publication-source";

export function PublicationPanel({ publication, source, queuedCount, unsaved }: { publication: ReturnType<typeof usePublication>; source: PublicationSource | null; queuedCount: number; unsaved: boolean }) {
  const { review, receipt, busy, loading, error, message, setMessage } = publication;
  const labels = { reviewed: "Review captured", committed: "Source committed", promoting: "Promoting reviewed CMS records", deploying: "Deploying committed revision", verifying: "Verifying production revision", live: "Live revision verified", failed: "Publication paused", unconfigured: "Publication not configured" };
  function downloadRecovery() {
    if (!publication.recovery) return;
    const url = URL.createObjectURL(new Blob([publication.recovery], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "publication-recovery.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section aria-label="Site deployment" className="grid gap-3 border-t border-cms-line p-3">
    {review?.source.workspace ? <>
      <div><h3 className="m-0 text-ui font-medium">Review publication</h3><p className="mb-0 mt-1 text-ui leading-4 text-cms-muted">One source commit, then these saved CMS records, then an exact revision build. Each release includes a small source receipt.</p></div>
      <p className="m-0 text-ui text-cms-subtle">{review.source.workspace.repository} · {review.source.workspace.branch} · base {review.source.workspace.headSha?.slice(0, 8)}</p>
      <ReviewChanges drafts={review.drafts} workspace={review.source.workspace}/>
      {!Object.keys(review.drafts).length && <p className="m-0 text-ui text-cms-muted">No browser content or design changes.</p>}
      <section aria-label="Reviewed CMS records"><h4 className="mb-2 mt-0 text-ui font-medium">{review.queue.length} queued CMS records</h4><ul className="m-0 grid list-none gap-2 p-0">{review.queue.map(item => <li key={`${item.record.collectionId}:${item.record.id}`} className="text-ui"><strong className="block font-medium">{item.label}</strong><span className="text-cms-muted">{item.collectionLabel} · {item.record.id}</span></li>)}</ul></section>
      <FormField label="Commit message"><Input value={message} maxLength={200} onValueChange={setMessage} disabled={busy}/></FormField>
      <Button variant="primary" disabled={busy || unsaved || !review.source.workspace.connected || !message.trim()} onClick={() => void publication.publishReview()}>Publish reviewed changes</Button>
    </> : <>
      <div className="flex items-center justify-between gap-2 text-ui"><strong className="font-medium">Site deployment</strong><span className="text-cms-subtle">{queuedCount} queued CMS record{queuedCount === 1 ? "" : "s"}</span></div>
      {receipt && <section aria-label="Publication status" aria-live="polite" className="grid gap-2 rounded-cms border border-cms-line p-2">
        <strong className="text-ui font-medium">{labels[receipt.state]}</strong>
        {receipt.revision && <p className="m-0 text-ui text-cms-muted">Revision <a href={receipt.commit?.url} target="_blank" rel="noopener noreferrer" className="text-cms-accent">{receipt.revision.slice(0, 8)}</a></p>}
        <p className="m-0 text-ui text-cms-muted">{receipt.changes.filter(change => change.id !== "publication").length} source documents · {receipt.cms.length} reviewed CMS records</p>
        {receipt.promotion?.records.filter(record => ["conflict", "not-found", "pending"].includes(record.state)).map(record => <p key={`${record.collectionId}:${record.id}`} className="m-0 text-ui text-cms-muted">{record.collectionId} · {record.id}: {record.state}</p>)}
        {receipt.state !== "live" && <p className="m-0 text-ui leading-4 text-cms-muted">New browser drafts and newly queued records stay outside this captured release.</p>}
        <Button disabled={busy || unsaved} onClick={publication.resume}>{receipt.state === "failed" || receipt.state === "unconfigured" ? "Resume publication" : "Check publication status"}</Button>
      </section>}
      <p className="m-0 text-ui leading-4 text-cms-muted">Review browser content, design and composition together with the exact queued CMS records before publishing.</p>
      <Button disabled={busy || loading || publication.pending || unsaved || !source?.workspace || source.busy} onClick={() => void publication.loadReview()}>{loading ? "Loading publication review…" : "Review & publish"}</Button>
    </>}
    {unsaved && <p className="m-0 text-ui leading-4 text-cms-muted">Save or discard the open record/settings edits before reviewing publication.</p>}
    {error && <p role="alert" className="m-0 text-ui leading-4 text-cms-danger">{error}</p>}
    {publication.recovery && <Button onClick={downloadRecovery}>Download publication recovery</Button>}
  </section>;
}
