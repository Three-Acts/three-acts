import type { EditorChange, EditorPushResult, EditorWorkspace } from "@three-acts/static-content";
import { sameContent, type Drafts } from "./drafts";

export type PublicationSource = {
  workspace: EditorWorkspace | null;
  drafts: Drafts;
  busy: boolean;
  storageUnavailable: boolean;
  acknowledge: (result: EditorPushResult, reviewed: EditorChange[], repository: string, branch: string, baseRevision: string) => void;
};

/** Reconcile either the original baseline or an already-loaded commit after
 * response loss. Unrelated source updates and subsequent drafts stay intact. */
export function reconcilePublication(workspace: EditorWorkspace, drafts: Drafts, result: EditorPushResult, reviewed: EditorChange[], baseRevision: string) {
  const nextDrafts = { ...drafts };
  let changed = false;
  const replacements = new Map(result.documents.map(doc => [doc.id, doc]));
  const originals = new Map(reviewed.map(change => [change.id, change.sha]));
  const documents = workspace.documents.map(doc => {
    const committed = replacements.get(doc.id);
    if (!committed || doc.sha !== originals.get(doc.id) && (doc.sha !== committed.sha || !sameContent(doc.content, committed.content))) return doc;
    if (doc.sha !== committed.sha) changed = true;
    const draft = nextDrafts[doc.id];
    if (draft?.sha === originals.get(doc.id)) {
      changed = true;
      if (sameContent(draft.content, committed.content)) delete nextDrafts[doc.id];
      else nextDrafts[doc.id] = { ...draft, sha: committed.sha, original: committed.content };
    }
    return committed;
  });
  if (!changed) return null;
  return { workspace: { ...workspace, headSha: workspace.headSha === baseRevision ? result.sha : workspace.headSha, documents }, drafts: nextDrafts };
}
