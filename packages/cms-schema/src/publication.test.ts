import test from "node:test";
import assert from "node:assert/strict";
import { cmsValuesHash, nextModifiedAt, readReviewedCmsRecords } from "./publication";

test("publication record fingerprints survive JSON transport and property ordering", async () => {
  const a = await cmsValuesHash({ title: "A", count: 0, flag: false, absent: undefined, empty: null });
  assert.equal(a, await cmsValuesHash({ empty: null, flag: false, count: 0, title: "A" }));
  assert.notEqual(a, await cmsValuesHash({ empty: null, flag: false, count: 0, title: "B" }));
  assert.equal(await cmsValuesHash({ "ä": 3, a: 1, Z: 2 }), "5fd80b3907cf8604ef0ee8852547eebb83c7c0fa23ae0b82da7db29f1c71adc7", "Fingerprints use code-unit ordering, independent of editor/server locale");
  const record = { collectionId: "articles", id: "article-1", modifiedAt: "2026-10-08T00:00:00.000Z", valuesHash: a };
  assert.deepEqual(readReviewedCmsRecords([record]), [record]);
  for (const invalid of [[record, record], [{ ...record, id: "../secret" }], [{ ...record, modifiedAt: "invalid" }], [{ ...record, values: {} }], [{ ...record, valuesHash: "bad" }], Array(1001).fill(record)]) assert.throws(() => readReviewedCmsRecords(invalid));
});

test("optimistic versions advance even when the wall clock is unchanged or behind", () => {
  const previous = "2999-01-01T00:00:00.000Z";
  const next = nextModifiedAt(previous);
  assert.equal(next, "2999-01-01T00:00:00.001Z");
  assert.ok(nextModifiedAt(next) > next);
});
