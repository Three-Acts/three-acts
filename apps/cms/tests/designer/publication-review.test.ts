import test from "node:test";
import assert from "node:assert/strict";
import { collectionRegistry, type CmsRecord, type CmsDataAdapter } from "@three-acts/cms-schema";
import { loadCmsPublicationReview } from "../../src/components/designer/publication-review";

function fixture(count = 102) {
  const collection = collectionRegistry.find(item => item.id === "articles")!;
  const records: CmsRecord[] = Array.from({ length: count }, (_, index) => ({ id: `article-${index}`, publishStatus: "queued_to_publish", createdAt: "2026-10-08T00:00:00.000Z", modifiedAt: "2026-10-08T00:00:00.000Z", values: { title: `Article ${index}` } }));
  const calls: number[] = [];
  const data: Pick<CmsDataAdapter, "listCollections" | "listRecords"> = {
    listCollections: async () => [{ ...collection, count, queuedCount: count }, { ...collection, id: "operations", mode: "data", count: 1, queuedCount: 1 }],
    listRecords: async (id, options) => { assert.equal(id, "articles"); assert.equal(options?.publishStatus, "queued_to_publish"); calls.push(options?.offset ?? 0); return { records: records.slice(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 100)), total: count }; }
  };
  return { data, calls, records };
}

test("publication review reads the whole queued catalogue and retains exact versions and readable labels", async () => {
  const { data, calls } = fixture();
  const items = await loadCmsPublicationReview(data);
  assert.equal(items.length, 102); assert.deepEqual(calls, [0, 100]);
  assert.equal(items[101].label, "Article 101"); assert.equal(items[101].record.id, "article-101");
  assert.match(items[101].record.valuesHash, /^[a-f0-9]{64}$/);
  assert.equal(items.some(item => item.record.collectionId === "operations"), false);
});

test("publication review rejects incomplete, moving, duplicate and oversized queues rather than silently truncating", async () => {
  const { data, records } = fixture();
  const list = data.listRecords;
  data.listRecords = async (id, options) => { const page = await list(id, options); return { ...page, records: page.records.slice(0, 2) }; };
  await assert.rejects(() => loadCmsPublicationReview(data), /incomplete/);
  data.listRecords = async (id, options) => ({ ...await list(id, options), total: 101 });
  await assert.rejects(() => loadCmsPublicationReview(data), /changed/);
  data.listRecords = async (id, options) => { const page = await list(id, options); return options?.offset ? { ...page, records: [records[0], records[1]] } : page; };
  await assert.rejects(() => loadCmsPublicationReview(data), /changed/);
  await assert.rejects(() => loadCmsPublicationReview(fixture(1001).data), /1000/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => loadCmsPublicationReview(fixture().data, controller.signal), /abort/i);
});
