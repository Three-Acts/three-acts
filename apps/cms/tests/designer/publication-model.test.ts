import test from "node:test";
import assert from "node:assert/strict";
import { contentDefinitions, type EditorPushResult, type EditorWorkspace, type PublicationDeployment } from "@three-acts/static-content";
import { advancePublication, preparePublication, readPublicationReceipt, readScopedPublicationReceipt, publicationStorageKey, type PublicationDependencies, type PublicationReceipt } from "../../src/components/designer/publication-model";

const publicationId = "d280d96c-5b8f-4d43-8b9b-e5dce7f2ce31";
const revision = "b".repeat(40);
const workspace: EditorWorkspace = { connected: true, repository: "test/site", branch: "content", source: "github", headSha: "a".repeat(40), connectionMode: "server", documents: contentDefinitions.map(doc => ({ ...doc, sha: "a".repeat(40) })) };
const cms = [{ collectionId: "articles", id: "reviewed-article", modifiedAt: "2026-10-08T00:00:00.000Z", valuesHash: "c".repeat(64) }];
function fixture() {
  const receipt = preparePublication("editor-1", workspace, [{ id: "home", sha: "a".repeat(40), content: structuredClone(contentDefinitions.find(doc => doc.id === "home")!.content) }], cms, "Publish reviewed changes", publicationId);
  const calls: string[] = [], saved: PublicationReceipt[] = [];
  const commit: EditorPushResult = { sha: revision, url: `https://github.com/test/site/commit/${revision}`, documents: receipt.changes.map(change => ({ ...contentDefinitions.find(doc => doc.id === change.id)!, content: change.content, sha: "d".repeat(40) })) };
  let state: PublicationDeployment["state"] = "BUILDING";
  const deps: PublicationDependencies = {
    configuration: async () => { calls.push("config"); return { configured: true, repository: "test/site", branch: "content" }; },
    push: async (changes, message, requestId) => { calls.push("push"); assert.deepEqual(changes, receipt.changes); assert.equal(message, receipt.message); assert.equal(requestId, publicationId); return commit; },
    onCommitted: result => { calls.push("ack"); assert.deepEqual(result.documents.map(doc => doc.id), receipt.changes.map(change => change.id)); },
    promote: async records => { calls.push("cms"); assert.deepEqual(records, cms); return { complete: true, published: 1, records: [{ collectionId: "articles", id: "reviewed-article", state: "published" }] }; },
    deploy: async (identity, retry) => { calls.push(retry ? "retry-deploy" : "deploy"); assert.deepEqual(identity, { revision, publicationId }); return { ...identity, state, id: "dpl_reviewed" }; },
    check: async identity => { calls.push("check"); return { ...identity, state, id: "dpl_reviewed" }; },
    save: value => { saved.push(structuredClone(value)); }
  };
  return { receipt, deps, calls, saved, setDeployment: (next: PublicationDeployment["state"]) => { state = next; } };
}

test("publication captures immutable changes and orders source, exact CMS promotion, deployment and live verification", async () => {
  const { receipt, deps, calls, saved, setDeployment } = fixture();
  const captured = structuredClone(receipt);
  const building = await advancePublication(receipt, deps);
  assert.deepEqual(receipt, captured, "Progress cannot mutate the captured review");
  assert.deepEqual(calls, ["config", "push", "ack", "cms", "deploy"]);
  assert.equal(building.step, "verify"); assert.equal(building.state, "deploying");
  assert.ok(saved.some(value => value.state === "committed" && value.revision === revision));
  setDeployment("READY");
  const ready = await advancePublication(building, deps);
  assert.equal(ready.state, "verifying", "Provider READY is not live evidence");
  setDeployment("live");
  const live = await advancePublication(ready, deps);
  assert.equal(live.step, "done"); assert.equal(live.state, "live");
  setDeployment("verifying");
  const superseded = await advancePublication(live, deps);
  assert.equal(superseded.state, "verifying"); assert.equal(superseded.step, "verify");
  assert.equal(calls.filter(call => call === "push").length, 1);
  assert.equal(calls.filter(call => call === "cms").length, 1);
});

test("source failures and configuration changes prevent later mutations while preserving the review", async () => {
  const { receipt, deps, calls } = fixture();
  deps.push = async () => { calls.push("push"); throw new Error("Source SHA conflict"); };
  const failed = await advancePublication(receipt, deps);
  assert.equal(failed.state, "failed"); assert.equal(failed.step, "source"); assert.deepEqual(failed.changes, receipt.changes);
  assert.deepEqual(calls, ["config", "push"]);
  deps.configuration = async () => ({ configured: false, repository: "test/site", branch: "content", message: "Local only" });
  assert.equal((await advancePublication(failed, deps)).state, "unconfigured");
  deps.configuration = async () => ({ configured: true, repository: "other/site", branch: "content" });
  const changed = await advancePublication(failed, deps);
  assert.match(changed.error!, /connection changed/);
  assert.deepEqual(calls, ["config", "push"]);
});

test("partial promotion and deployment failures resume their captured step without another source push", async () => {
  const { receipt, deps, calls, setDeployment } = fixture();
  const promote = deps.promote;
  deps.promote = async () => { calls.push("cms-conflict"); return { complete: false, published: 0, records: [{ collectionId: "articles", id: "reviewed-article", state: "conflict" }] }; };
  const conflict = await advancePublication(receipt, deps);
  assert.equal(conflict.step, "cms"); assert.equal(conflict.state, "failed");
  assert.equal(calls.includes("deploy"), false);
  deps.promote = promote; setDeployment("ERROR");
  const failedDeployment = await advancePublication(conflict, deps);
  assert.equal(failedDeployment.step, "deploy"); assert.equal(failedDeployment.state, "failed");
  setDeployment("BUILDING");
  const retry = await advancePublication(failedDeployment, deps);
  assert.equal(retry.state, "deploying"); assert.ok(calls.includes("retry-deploy"));
  assert.equal(calls.filter(call => call === "push").length, 1);
  deps.check = async () => { throw new Error("Status temporarily unavailable"); };
  const lostStatus = await advancePublication(retry, deps);
  assert.equal(lostStatus.step, "verify"); assert.equal(lostStatus.state, "failed");
});

test("publication recovery rejects wrong scopes, skipped acceptance, mismatched status and missing storage", async () => {
  const { receipt, deps } = fixture();
  assert.throws(() => readScopedPublicationReceipt(receipt, "editor-2", "test/site", "content"), /different editor/);
  assert.throws(() => readScopedPublicationReceipt(receipt, "editor-1", "test/site", "other"), /different editor/);
  assert.notEqual(publicationStorageKey("editor:1", "test/site", "content"), publicationStorageKey("editor", "1:test/site", "content"));
  assert.throws(() => readPublicationReceipt({ ...receipt, step: "deploy", revision }), /committed/);
  const pending = await advancePublication(receipt, deps);
  assert.throws(() => readPublicationReceipt({ ...pending, promotion: { complete: true, published: 0, records: [] } }), /promotion/);
  assert.throws(() => readPublicationReceipt({ ...pending, step: "done", state: "live" }), /verified live/);
  deps.check = async identity => ({ ...identity, publicationId: "d280d96c-5b8f-4d43-8b9b-e5dce7f2ce32", state: "live" });
  assert.equal((await advancePublication(pending, deps)).state, "failed");
  deps.save = () => { throw new Error("Browser storage is unavailable"); };
  await assert.rejects(() => advancePublication(receipt, deps), /storage is unavailable/);
});
