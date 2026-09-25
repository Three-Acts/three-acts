import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CmsError, type CmsCollection, type CmsRecord, type CmsRecordValue } from "@three-acts/cms-schema";
import type { SeedCollections } from "@three-acts/cms-schema/seed";
import { FileDataStore } from "./file-store";
import { MemoryDataStore } from "./memory-store";
import { setDataStoreForTests } from "./resolve-store";
import { createRecord, createSystemRecord, saveRecord } from "./service";

function makeTempDir(t: import("node:test").TestContext): Promise<string> {
  return mkdtemp(join(tmpdir(), "cms-file-store-")).then((dir) => {
    t.after(() => rm(dir, { recursive: true, force: true }));
    return dir;
  });
}

/** Minimal `CmsCollection` fixture — the engine/store only care about `id`, `fields`, and `mode`. */
function makeCollection(id: string, overrides: Partial<CmsCollection> = {}): CmsCollection {
  return {
    id,
    label: id,
    tableName: id,
    fields: [{ key: "name", label: "Name", type: "text" }],
    listColumns: [{ key: "name", label: "Name" }],
    ...overrides
  };
}

function makeSeedRecord(values: Record<string, CmsRecordValue>): CmsRecord {
  const now = new Date().toISOString();
  return { id: randomUUID(), publishStatus: "published", createdAt: now, modifiedAt: now, values, liveValues: { ...values } };
}

test("FileDataStore seeds a collection from the seed loader when its file is missing", async (t) => {
  const dir = await makeTempDir(t);
  const widgets = makeCollection("widgets");
  const seedRecord = makeSeedRecord({ name: "Seeded widget" });
  const seed: SeedCollections = { widgets: [seedRecord] };

  const store = new FileDataStore({ dir, loadSeed: () => seed });
  const result = await store.listRecords(widgets, {});

  assert.equal(result.total, 1);
  assert.equal(result.records[0]?.values.name, "Seeded widget");
});

test("FileDataStore starts empty (no seed loader) when the collection file is missing", async (t) => {
  const dir = await makeTempDir(t);
  const widgets = makeCollection("widgets");

  const store = new FileDataStore({ dir });
  const result = await store.listRecords(widgets, {});

  assert.equal(result.total, 0);
  assert.deepEqual(result.records, []);
});

test("FileDataStore persists a create across a second store instance", async (t) => {
  const dir = await makeTempDir(t);
  const widgets = makeCollection("widgets");

  const store1 = new FileDataStore({ dir });
  await store1.insertRecords(widgets, [{ publishStatus: "not_published", values: { name: "Widget A" } }]);

  const store2 = new FileDataStore({ dir });
  const result = await store2.listRecords(widgets, {});

  assert.equal(result.total, 1);
  assert.equal(result.records[0]?.values.name, "Widget A");
});

test("FileDataStore atomic write leaves no .tmp file behind", async (t) => {
  const dir = await makeTempDir(t);
  const widgets = makeCollection("widgets");

  const store = new FileDataStore({ dir });
  await store.insertRecords(widgets, [{ publishStatus: "not_published", values: { name: "Widget A" } }]);

  const entries = await readdir(dir);
  assert.ok(entries.includes("widgets.json"), "expected widgets.json to exist");
  assert.ok(!entries.some((entry) => entry.endsWith(".tmp")), `expected no .tmp files, found: ${entries.join(", ")}`);
});

test("FileDataStore serializes concurrent mutations to the same collection without dropping any", async (t) => {
  const dir = await makeTempDir(t);
  const widgets = makeCollection("widgets");
  const store = new FileDataStore({ dir });

  await Promise.all(
    Array.from({ length: 10 }, (_, index) => store.insertRecords(widgets, [{ publishStatus: "not_published", values: { name: `Widget ${index}` } }]))
  );

  const result = await store.listRecords(widgets, {});
  assert.equal(result.total, 10);

  // Re-reading from disk via a fresh instance proves every write actually landed, not just the in-memory view.
  const store2 = new FileDataStore({ dir });
  const reread = await store2.listRecords(widgets, {});
  assert.equal(reread.total, 10);
});

test("service: readOnly fields are preserved on save through the memory store, even when the client sends new values", async (t) => {
  setDataStoreForTests(new MemoryDataStore());
  t.after(() => setDataStoreForTests(undefined));

  // "customers" (registry.ts) has recordSource: "site" and readOnly fields
  // (email, totalOrders, ...); createSystemRecord is the legitimate way to
  // write them, exercised by the next test.
  const created = await createSystemRecord("customers", {
    name: "Ada Test",
    email: "ada@example.com",
    totalOrders: 3,
    lifetimeValue: 450
  });

  const updated = await saveRecord("customers", created.id, {
    ...created,
    values: {
      ...created.values,
      name: "Ada Updated",
      email: "hijacked@example.com",
      totalOrders: 999
    }
  });

  // Editable field: the client's new value wins.
  assert.equal(updated.values.name, "Ada Updated");
  // readOnly fields: the stored value survives regardless of client input.
  assert.equal(updated.values.email, "ada@example.com");
  assert.equal(updated.values.totalOrders, 3);
});

test("service: createSystemRecord bypasses recordSource gating", async (t) => {
  setDataStoreForTests(new MemoryDataStore());
  t.after(() => setDataStoreForTests(undefined));

  // "customers" has recordSource: "site" — createRecord (the editor path)
  // would reject this; createSystemRecord (the site's own write path) must not.
  const record = await createSystemRecord("customers", { name: "Site Customer", email: "site@example.com" });

  assert.equal(record.values.name, "Site Customer");
  assert.equal(record.values.email, "site@example.com");
});

test("service: createRecord is forbidden on a recordSource: 'site' collection", async (t) => {
  setDataStoreForTests(new MemoryDataStore());
  t.after(() => setDataStoreForTests(undefined));

  await assert.rejects(
    () => createRecord("customers", { name: "Should not exist" }),
    (error: unknown) => {
      assert.ok(error instanceof CmsError);
      assert.equal(error.code, "forbidden");
      return true;
    }
  );
});
