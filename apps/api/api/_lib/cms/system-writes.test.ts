import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { cloneSeedCollections } from "@three-acts/cms-schema/seed";
import { MemoryDataStore } from "./memory-store";
import { setDataStoreForTests } from "./resolve-store";
import { findRecords, getRecord, listPublishedRecords, updateSystemRecord } from "./service";

function freshStore(t: TestContext): void {
  setDataStoreForTests(new MemoryDataStore(async () => cloneSeedCollections()));
  t.after(() => setDataStoreForTests(undefined));
}

test("updateSystemRecord({ live: true }) patches the live snapshot of a published product without creating a draft", async (t) => {
  freshStore(t);
  const [product] = await findRecords("products", (record) => record.publishStatus === "published" && Number(record.values.inventory) > 3);
  assert.ok(product, "seed has a published product with stock");

  const before = Number(product.values.inventory);
  await updateSystemRecord("products", product.id, { inventory: before - 2 }, { live: true });

  const stored = await getRecord("products", product.id);
  assert.equal(stored.publishStatus, "published", "stays published — stock is operational, not a draft");
  assert.equal(stored.values.inventory, before - 2);
  assert.equal(stored.liveValues?.inventory, before - 2, "live snapshot updated too");

  const live = await listPublishedRecords("products", {});
  const publicRecord = live.records.find((record) => record.id === product.id);
  assert.equal(publicRecord?.values.inventory, before - 2, "public catalogue sees the new stock immediately");
});

test("updateSystemRecord without { live } keeps the editorial draft semantics", async (t) => {
  freshStore(t);
  const [product] = await findRecords("products", (record) => record.publishStatus === "published");
  const before = Number(product.values.inventory);
  await updateSystemRecord("products", product.id, { inventory: before + 5 });
  const stored = await getRecord("products", product.id);
  assert.equal(stored.publishStatus, "draft");
  assert.equal(stored.liveValues?.inventory, before, "snapshot untouched");
});
