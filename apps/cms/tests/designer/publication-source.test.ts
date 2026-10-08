import assert from "node:assert/strict";
import test from "node:test";
import { contentDefinitions, type EditorChange, type EditorPushResult, type EditorWorkspace } from "@three-acts/static-content";
import { reconcilePublication } from "../../src/components/designer/publication-source";
import { updateField, type Drafts } from "../../src/components/designer/drafts";

const baseRevision = "a".repeat(40);
const doc = { ...contentDefinitions.find(doc => doc.id === "home")!, sha: "b".repeat(40) };
const content = updateField(doc.content, ["hero_section", "display_1"], "A reviewed publication");
const committed = { ...doc, content, sha: "c".repeat(40) };
const result: EditorPushResult = { sha: "d".repeat(40), url: "https://github.com/test/site/commit/" + "d".repeat(40), documents: [committed] };
const reviewed: EditorChange[] = [{ id: doc.id, sha: doc.sha, content }];
const workspace: EditorWorkspace = { connected: true, repository: "test/site", branch: "content", source: "github", connectionMode: "server", headSha: baseRevision, documents: [doc] };
const drafts: Drafts = { home: { sha: doc.sha, content, original: doc.content } };

test("publication acknowledgement clears matching drafts before and after loading the committed baseline", () => {
  for (const baseline of [workspace, { ...workspace, headSha: result.sha, documents: [committed] }]) {
    const next = reconcilePublication(baseline, drafts, result, reviewed, baseRevision);
    assert.ok(next);
    assert.deepEqual(next.drafts, {});
    assert.equal(next.workspace.headSha, result.sha);
    assert.deepEqual(next.workspace.documents, [committed]);
    assert.equal(reconcilePublication(next.workspace, next.drafts, result, reviewed, baseRevision), null, "Status acknowledgement cannot reset subsequent history");
  }
});

test("lost-response reconciliation rebases newer drafts and preserves a subsequently advanced branch head", () => {
  const later = updateField(content, ["hero_section", "display_1"], "A later browser edit");
  const laterHead = "e".repeat(40);
  const next = reconcilePublication({ ...workspace, documents: [committed], headSha: laterHead }, { home: { ...drafts.home, content: later } }, result, reviewed, baseRevision);
  assert.ok(next);
  assert.equal(next.workspace.headSha, laterHead);
  assert.deepEqual(next.drafts.home, { sha: committed.sha, content: later, original: committed.content });
  assert.equal(reconcilePublication(next.workspace, next.drafts, result, reviewed, baseRevision), null);
  assert.equal(drafts.home.sha, doc.sha, "Reconciliation must not mutate the captured draft");
});

test("publication acknowledgement leaves newer source content and its existing draft untouched", () => {
  const later = { ...committed, sha: "f".repeat(40), content: updateField(content, ["hero_section", "display_1"], "A newer source revision") };
  assert.equal(reconcilePublication({ ...workspace, documents: [later] }, drafts, result, reviewed, baseRevision), null);
});
