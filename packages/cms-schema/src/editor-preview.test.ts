import assert from "node:assert/strict";
import test from "node:test";
import { createCmsDraftPreview, readCmsDraftPreview, cmsPreviewCollections, cmsPreviewLimits, type CmsPreviewCollection } from "./editor-preview";
import { cloneSeedCollections } from "./seed";
import type { CmsRecord } from "./types";

const session = { session: "preview-session-123456", sequence: 1, collectionId: "products" as const, recordId: "draft-product" };
function records() {
  const seed = cloneSeedCollections();
  const main = structuredClone(seed.products[0]);
  main.id = session.recordId;
  main.publishStatus = "not_published";
  main.values.title = "A private unpublished title";
  main.values.privateEditorialNote = "Never transfer me";
  main.values.images = JSON.stringify([{ src: "/image.png", alt: "Image", fileName: "private-original-name.png", privateNote: "private-media-note" }]);
  main.liveValues = { title: "Old snapshot" };
  seed.products = [main];
  return Object.fromEntries(cmsPreviewCollections.map(id => [id, seed[id]])) as Record<CmsPreviewCollection, CmsRecord[]>;
}
test("draft projection transfers saved public-model values without full records, private fields or snapshots", () => {
  const projected = createCmsDraftPreview({ ...session, token: "never transfer credentials" } as typeof session, records());
  assert.equal(projected.collections.products[0].values.title, "A private unpublished title");
  assert.equal(projected.collections.products[0].values.privateEditorialNote, undefined);
  assert.deepEqual(Object.keys(projected.collections.products[0]).sort(), ["id", "values"]);
  assert.equal(JSON.stringify(projected).includes("Old snapshot"), false);
  assert.equal(JSON.stringify(projected).includes("never transfer credentials"), false);
  assert.equal(JSON.stringify(projected).includes("private-original-name"), false);
  assert.equal(JSON.stringify(projected).includes("private-media-note"), false);
  assert.equal(readCmsDraftPreview(projected, session), projected);
});
test("draft packets reject unrelated data, malformed values, duplicate IDs and missing selected records", () => {
  const payload = createCmsDraftPreview(session, records());
  assert.equal(readCmsDraftPreview({ ...payload, token: "private" }, session), null);
  for (const mutate of [
    (value: typeof payload) => Object.assign(value.collections, { orders: [] }),
    (value: typeof payload) => { value.collections.products[0].values.privateEditorialNote = "private"; },
    (value: typeof payload) => { value.collections.products[0].values.price = Infinity; },
    (value: typeof payload) => { value.collections.products.push(value.collections.products[0]); },
    (value: typeof payload) => { value.recordId = "missing"; },
  ]) {
    const invalid = structuredClone(payload); mutate(invalid);
    assert.equal(readCmsDraftPreview(invalid, session), null);
  }
});
test("draft packets correlate sessions and exact template/record identities", () => {
  const payload = createCmsDraftPreview(session, records());
  assert.equal(readCmsDraftPreview(payload, { ...session, session: "different-session-12345" }), null);
  assert.equal(readCmsDraftPreview(payload, { ...session, recordId: "other" }), null);
  assert.equal(readCmsDraftPreview(payload, { ...session, collectionId: "authors" }), null);
  assert.equal(readCmsDraftPreview({ ...payload, sequence: 0 }, session), null);
  assert.equal(readCmsDraftPreview({ ...payload, collectionId: "orders" }, session), null);
});
test("draft limits bound text, total records and encoded content size", () => {
  const source = records();
  source.products[0].values.description = "x".repeat(cmsPreviewLimits.text + 1);
  assert.throws(() => createCmsDraftPreview(session, source), /content limits/);
  source.products[0].values.description = "x".repeat(cmsPreviewLimits.text);
  source.products = Array.from({ length: 45 }, (_, index) => ({ ...source.products[0], id: index === 0 ? session.recordId : `product-${index}` }));
  assert.throws(() => createCmsDraftPreview(session, source), /content limits/);
  source.products = Array.from({ length: cmsPreviewLimits.records + 1 }, (_, index) => ({ ...source.products[0], id: `product-${index}`, values: {} }));
  assert.throws(() => createCmsDraftPreview(session, source), /record limits/);
});
