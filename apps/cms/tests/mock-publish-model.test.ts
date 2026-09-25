import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedCollections } from "@three-acts/cms-schema/seed";
import { mockCmsBackend } from "../src/cms/mock-adapter.ts";

// The mock adapter intentionally models browser latency through window.setTimeout.
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { setTimeout: globalThis.setTimeout.bind(globalThis) }
});

const { data } = mockCmsBackend;

describe("mock backend seed data", () => {
  it("serves every seed collection with the seed's record counts", async () => {
    const summaries = await data.listCollections();
    for (const summary of summaries) {
      const seeded = seedCollections[summary.id] ?? [];
      assert.equal(summary.count, seeded.length, `${summary.id} count`);
      const queued = summary.mode === undefined || summary.mode === "editorial" ? seeded.filter((r) => r.publishStatus === "queued_to_publish").length : 0;
      assert.equal(summary.queuedCount, queued, `${summary.id} queuedCount`);
    }
    assert.ok(summaries.find((s) => s.id === "articles")!.queuedCount > 0, "the seed has queued articles");
  });

  it("searches, sorts and pages seed records", async () => {
    const result = await data.listRecords("products", { search: "supabase", sort: { key: "title", direction: "asc" }, limit: 1, offset: 0 });
    assert.ok(result.total >= 1);
    assert.equal(result.records.length, 1);
    assert.match(JSON.stringify(result.records[0].values).toLowerCase(), /supabase/);
  });

  it("does not let edits leak into the shared seed", async () => {
    const original = await data.getRecord("faqs", seedCollections.faqs[0].id);
    await data.saveRecord("faqs", { ...original, values: { ...original.values, question: "changed" } });
    assert.notEqual(seedCollections.faqs[0].values.question, "changed");
  });
});

describe("mock backend publish model", () => {
  it("turns an edited published record into a draft that keeps the live snapshot", async () => {
    const original = await data.getRecord("articles", "article-afternoon-launch");
    assert.equal(original.publishStatus, "published");
    const liveTitle = original.liveValues?.title;

    const saved = await data.saveRecord("articles", { ...original, values: { ...original.values, title: "Dialling in, revised" } });
    assert.equal(saved.publishStatus, "draft");
    assert.equal(saved.liveValues?.title, liveTitle);

    // Reverting to the snapshot's values makes it published again.
    const reverted = await data.saveRecord("articles", { ...saved, values: { ...saved.values, title: liveTitle } });
    assert.equal(reverted.publishStatus, "published");
  });

  it("never lets a client set published or liveValues directly", async () => {
    const draft = (seedCollections.articles.find((r) => r.publishStatus === "draft" && !r.liveValues))!;
    const original = await data.getRecord("articles", draft.id);
    const saved = await data.saveRecord("articles", { ...original, publishStatus: "published", liveValues: { ...original.values } });
    assert.equal(saved.publishStatus, "draft");
    assert.equal(saved.liveValues, null);
  });

  it("promotes queued values into the live snapshot on publish", async () => {
    const original = await data.getRecord("articles", "article-registry-source-of-truth");
    const queued = await data.saveRecord("articles", { ...original, publishStatus: "queued_to_publish", values: { ...original.values, title: "Registry, revisited" } });
    assert.equal(queued.publishStatus, "queued_to_publish");
    assert.notEqual(queued.liveValues?.title, "Registry, revisited");

    const before = (await data.listCollections()).find((s) => s.id === "articles")!.queuedCount;
    const { published } = await data.publishQueued("articles");
    assert.equal(published, before);

    const promoted = await data.getRecord("articles", "article-registry-source-of-truth");
    assert.equal(promoted.publishStatus, "published");
    assert.deepEqual(promoted.liveValues, promoted.values);
    assert.equal((await data.listCollections()).find((s) => s.id === "articles")!.queuedCount, 0);
  });

  it("clears the live snapshot when a record is unpublished", async () => {
    const [unpublished] = await data.setPublishStatus("articles", ["article-afternoon-launch"], "not_published");
    assert.equal(unpublished.publishStatus, "not_published");
    assert.equal(unpublished.liveValues, null);
  });

  it("leaves data collections without a publish workflow untouched", async () => {
    const order = (await data.listRecords("orders", { limit: 1 })).records[0];
    const saved = await data.saveRecord("orders", { ...order, publishStatus: "queued_to_publish", values: { ...order.values, notes: "Left at reception." } });
    assert.equal(saved.publishStatus, "not_published");
    assert.equal(saved.liveValues, null);
  });
});
