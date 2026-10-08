import { GitCommitHorizontal } from "lucide-react";
import { contentFields, type EditorWorkspace, type HomeCopy } from "@three-acts/static-content";
import { LayoutReview } from "./layout-review";
import { Button, FormField, Input, Modal } from "../atoms";
import { fieldLabel, type Drafts } from "./drafts";

export function Review({ drafts, workspace, message, onMessage, busy, error, onClose, onPush }: {
  drafts: Drafts; workspace: EditorWorkspace; message: string; onMessage: (value: string) => void;
  busy: boolean; error: string; onClose: () => void; onPush: () => void;
}) {
  const requestClose = () => {
    if (!busy) onClose();
  };

  return (
    <Modal
      className="w-140 max-w-viewport"
      footer={
        <>
          <Button disabled={busy} onClick={requestClose}>Keep editing</Button>
          <Button disabled={busy || !workspace.connected || !message.trim()} onClick={onPush} variant="primary">
            <GitCommitHorizontal aria-hidden="true" size={15} />
            {busy ? "Pushing changes…" : "Push to GitHub"}
          </Button>
        </>
      }
      onClose={requestClose}
      open
      title="Review changes"
    >
      <p className="mb-3 mt-0 text-ui leading-5 text-cms-muted">
        {workspace.connected ? <>One commit to <strong className="font-medium text-cms-text">{workspace.repository}</strong> on <strong className="font-medium text-cms-text">{workspace.branch}</strong>.</> : "These drafts use bundled demo content. Connect a repository to push them."}
      </p>

      <ReviewChanges drafts={drafts} workspace={workspace}/>

      <FormField label="Commit message">
        <Input maxLength={200} value={message} onValueChange={onMessage} disabled={busy} />
      </FormField>
      {error && <p className="mb-3 mt-0 rounded-cms border border-cms-danger-line bg-cms-danger-surface px-2 py-1.5 text-ui text-cms-danger" role="alert">{error}</p>}
      {!workspace.connected && <p className="mb-0 mt-3 rounded-cms border border-cms-danger-line bg-cms-danger-surface px-2 py-1.5 text-ui leading-5 text-cms-muted">GitHub is not connected. Your drafts stay in this browser. Open Connection details in Publish for setup information.</p>}
    </Modal>
  );
}

export function ReviewChanges({ drafts, workspace }: { drafts: Drafts; workspace: EditorWorkspace }) {
  return (
<div className="mb-3 grid gap-3">
        {Object.entries(drafts).map(([id, draft]) => {
          if (id.startsWith('source:')) return <section key={id} className="overflow-hidden rounded-cms border border-cms-line bg-cms-surface"><h3 className="m-0 border-b border-cms-line px-2 py-2 text-ui font-medium">{id.slice(7)}</h3><div aria-label="Source code diff" className="grid gap-2 p-2 font-mono text-[10px] leading-4"><del className="whitespace-pre-wrap break-words bg-cms-danger-surface p-2 text-cms-subtle">{String(draft.original.code)}</del><ins className="whitespace-pre-wrap break-words bg-cms-success/10 p-2 no-underline">{String(draft.content.code)}</ins></div></section>;
          if (id === "layout") {
            const home = workspace.documents.find(doc => doc.id === "home")?.content;
            if (home) return <LayoutReview key={id} draft={draft} home={home as HomeCopy}/>;
          }
          const original = new Map(contentFields(draft.original).map((field) => [field.path.join("."), field.value]));
          const current = new Map(contentFields(draft.content).map(field => [field.path.join("."), field.value]));
          const changed = [...new Set([...original.keys(), ...current.keys()])].filter(path => current.get(path) !== original.get(path)).map(path => ({ path: path.split("."), value: current.get(path) }));
          return (
            <section className="overflow-hidden rounded-cms border border-cms-line-strong bg-cms-surface" key={id}>
              <h3 className="m-0 flex items-center justify-between gap-2 border-b border-cms-line px-2.5 py-2 text-ui font-medium text-cms-text">
                <span className="truncate">{workspace.documents.find((doc) => doc.id === id)?.label}</span>
                <span className="shrink-0 text-ui font-normal tabular-nums text-cms-subtle">{changed.length} changes</span>
              </h3>
              <div className="divide-y divide-cms-line">
                {changed.map((field) => (
                  <div className="grid gap-1 px-2.5 py-2" key={field.path.join(".")}>
                    <small className="text-ui font-medium text-cms-subtle">{fieldLabel(field.path)}</small>
                    <del className="whitespace-pre-wrap wrap-break-word rounded-cms bg-cms-bg px-2 py-1 text-ui leading-5 text-cms-subtle">{original.has(field.path.join(".")) ? String(original.get(field.path.join("."))) || "Empty" : "Not set"}</del>
                    <ins className="whitespace-pre-wrap wrap-break-word rounded-cms border border-cms-success/30 bg-cms-success/10 px-2 py-1 text-ui leading-5 text-cms-text no-underline">{field.value === undefined ? "Removed" : String(field.value) || "Empty"}</ins>
                  </div>
                ))}
                {!changed.length && <p className="m-0 px-2.5 py-2 text-ui text-cms-subtle">No field changes.</p>}
              </div>
            </section>
          );
        })}
      </div>
  );
}
