import assert from "node:assert/strict";
import test from "node:test";
import { cmsAttributes, cmsSourceField, readCmsSource } from "./editor-source";

test("source identities normalize legacy collection names and preserve exact related-record IDs", () => {
  const category = readCmsSource({ collectionId: "productCategories", recordId: "category-3", label: "Apps", field: "name" });
  assert.equal(category?.collectionId, "product-categories");
  assert.equal(category?.recordId, "category-3");
  assert.equal(cmsSourceField(category!)?.key, "name");
  assert.equal(readCmsSource({ collectionId: "articleCategories", recordId: "category-4", label: "Notes" })?.collectionId, "article-categories");
  assert.equal(cmsAttributes({ collectionId: "articles", recordId: "related-7", label: "Related" }, "title")["data-cms-item-id"], "related-7");
});
test("missing, malformed and unknown identities cannot become a CMS handoff", () => {
  for (const value of [null, [], {}, { collectionId: "products", label: "Product", slug: "product" }, { collectionId: "unknown", recordId: "1", label: "Item" }, { collectionId: "products", recordId: "../1", label: "Item" }, { collectionId: "products", recordId: "1", label: "Item", field: "title]" }]) assert.equal(readCmsSource(value), null);
  assert.deepEqual(cmsAttributes(undefined, "title"), {});
  assert.throws(() => cmsAttributes({ collectionId: "products", recordId: "", label: "Product" }), /identity/);
});
test("nested assets focus the registered root field while derived content never invents a field", () => {
  const source = { collectionId: "products", recordId: "product-1", label: "Product", field: "images.2.alt" };
  assert.equal(cmsSourceField(source)?.key, "images");
  assert.equal(cmsSourceField({ ...source, field: "derived" }), undefined);
});
