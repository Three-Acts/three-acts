import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectionRegistry, cmsValuesHash, type CmsCollection, type CmsRecord } from "@three-acts/cms-schema";
import { seedCollections } from "@three-acts/cms-schema/seed";
import { MemoryDataStore } from "./memory-store";
import { FileDataStore } from "./file-store";
import { setDataStoreForTests } from "./resolve-store";
import { publishReviewed } from "./service";

const collection = collectionRegistry.find(item => item.id === "articles")!;
function queued(id: string): CmsRecord {
  const record = structuredClone(seedCollections.articles.find(item => item.id === "article-afternoon-launch")!);
  return { ...record, id, publishStatus: "queued_to_publish", values: { ...record.values, title: `Reviewed ${id}`, slug: id } };
}
async function review(record: CmsRecord) {
  return { collectionId: collection.id, id: record.id, modifiedAt: record.modifiedAt, valuesHash: await cmsValuesHash(record.values) };
}

test("selected promotion and retries never include newly queued records or newer edits", async t => {
  const a = queued("review-a"), b = queued("newly-queued-b");
  const store = new MemoryDataStore(() => ({ articles: [a, b] }));
  setDataStoreForTests(store); t.after(() => setDataStoreForTests(undefined));
  const reviewed = [await review(a)];
  const promoted = await publishReviewed(reviewed);
  assert.equal(promoted.complete, true); assert.equal(promoted.published, 1);
  const current = (await store.getRecord(collection, a.id))!;
  assert.deepEqual(current.liveValues, a.values);
  assert.equal((await store.getRecord(collection, b.id))?.publishStatus, "queued_to_publish");
  const retry = await publishReviewed(reviewed);
  assert.equal(retry.published, 0); assert.equal(retry.records[0].state, "already-published");
  await store.updateRecord(collection, { ...current, publishStatus: "queued_to_publish", values: { ...current.values, title: "A newer edit" } }, current.modifiedAt);
  const conflict = await publishReviewed(reviewed);
  assert.equal(conflict.complete, false); assert.equal(conflict.records[0].state, "conflict");
  assert.deepEqual((await store.getRecord(collection, a.id))?.liveValues, a.values, "A retry cannot replace the previous snapshot with newer values");
});

test("preflight conflicts prevent promotion; a race reports partial progress and leaves the remaining queue intact", async t => {
  const a = queued("review-a"), b = queued("review-b"), c = queued("review-c");
  class RacingStore extends MemoryDataStore {
    race = false;
    override async publishRecord(target: CmsCollection, id: string, expected: string) {
      if (this.race && id === b.id) {
        const record = (await this.getRecord(target, id))!;
        await this.updateRecord(target, { ...record, values: { ...record.values, title: "Concurrent edit" } }, record.modifiedAt);
      }
      return super.publishRecord(target, id, expected);
    }
  }
  const store = new RacingStore(() => ({ articles: [a, b, c] }));
  setDataStoreForTests(store); t.after(() => setDataStoreForTests(undefined));
  const reviewed = await Promise.all([a, b, c].map(review));
  const preflight = await publishReviewed([reviewed[0], { ...reviewed[1], valuesHash: "0".repeat(64) }]);
  assert.equal(preflight.published, 0); assert.equal(preflight.records[0].state, "pending");
  assert.equal((await store.getRecord(collection, a.id))?.publishStatus, "queued_to_publish");
  store.race = true;
  const partial = await publishReviewed(reviewed);
  assert.equal(partial.complete, false); assert.equal(partial.published, 1);
  assert.deepEqual(partial.records.map(record => record.state), ["published", "conflict", "pending"]);
  const retry = await publishReviewed(reviewed);
  assert.equal(retry.published, 0); assert.equal(retry.records[0].state, "already-published");
  assert.equal((await store.getRecord(collection, c.id))?.publishStatus, "queued_to_publish");
});

test("file-backed selected promotion persists a recoverable snapshot and rejects an old version", async t => {
  const dir = await mkdtemp(join(tmpdir(), "cms-publication-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const a = queued("persistent-release");
  const store = new FileDataStore({ dir, loadSeed: () => ({ articles: [a] }) });
  const result = await store.publishRecord(collection, a.id, a.modifiedAt);
  assert.ok(result && result !== "conflict");
  const reopened = new FileDataStore({ dir });
  assert.deepEqual((await reopened.getRecord(collection, a.id))?.liveValues, a.values);
  assert.equal(await reopened.publishRecord(collection, a.id, a.modifiedAt), "conflict");
});
