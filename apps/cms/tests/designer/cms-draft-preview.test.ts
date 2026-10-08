import assert from "node:assert/strict";
import test from "node:test";
import { cloneSeedCollections } from "@three-acts/cms-schema/seed";
import type { CmsDataAdapter } from "@three-acts/cms-schema";
import { loadCmsDraftPreview, resolveCmsDraftRoute } from "../../src/components/designer/cms-draft-preview";

const source = { session: "draft-preview-session-12345", sequence: 1, collectionId: "products" as const, recordId: "new-product" };
test("CMS draft loading fetches only template dependencies and reads the exact selected item last", async () => {
  const seed = cloneSeedCollections();
  const main = { ...seed.products[0], id: source.recordId, publishStatus: "not_published" as const, values: { ...seed.products[0].values, title: "Newest saved draft", privateNote: "stay in CMS" }, liveValues: null };
  const calls: string[] = [];
  const data: Pick<CmsDataAdapter, "getRecord" | "listRecords"> = {
    async listRecords(id, options) { calls.push(`list:${id}`); const records = seed[id]; return { records: records.slice(options?.offset ?? 0, (options?.offset ?? 0) + 100), total: records.length }; },
    async getRecord(collectionId, id) { calls.push(`get:${collectionId}:${id}`); return main; },
  };
  const payload = await loadCmsDraftPreview(data, source);
  assert.deepEqual(new Set(calls.slice(0, -1)), new Set(["list:products", "list:product-categories", "list:faqs"]));
  assert.equal(calls.at(-1), "get:products:new-product");
  assert.equal(payload.collections.products.find(record => record.id === source.recordId)?.values.title, "Newest saved draft");
  assert.equal(payload.collections.products.find(record => record.id === source.recordId)?.values.privateNote, undefined);
  assert.deepEqual(payload.collections.authors, []);
  const templates = [{ id: "product-template", collectionId: "products", route: "/shop/[slug]" }, { id: "category-template", collectionId: "product-categories", route: "/shop/category/[slug]" }];
  const category = payload.collections["product-categories"][0];
  assert.deepEqual(resolveCmsDraftRoute(payload, `/shop/category/${category.values.slug}`, templates), { templateId: "category-template", recordId: category.id });
  payload.collections.products.find(record => record.id === source.recordId)!.values.slug = "";
  assert.deepEqual(resolveCmsDraftRoute(payload, "/shop/__preview_new-product", templates), { templateId: "product-template", recordId: source.recordId });
  assert.equal(resolveCmsDraftRoute(payload, "/shop/unknown", templates), null);
});
test("CMS draft loading cancels stale requests and rejects incomplete pagination", async () => {
  let current = true;
  let getCalls = 0;
  const data: Pick<CmsDataAdapter, "getRecord" | "listRecords"> = {
    async listRecords() { current = false; return { records: [], total: 0 }; },
    async getRecord() { getCalls++; throw new Error("must not fetch a stale main source"); },
  };
  await assert.rejects(loadCmsDraftPreview(data, source, () => current), { name: "AbortError" });
  assert.equal(getCalls, 0);
  data.listRecords = async () => ({ records: [], total: 1 });
  await assert.rejects(loadCmsDraftPreview(data, source), /records changed/);
});
