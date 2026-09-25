import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectionRegistry, isCmsError } from "@three-acts/cms-schema";
import { mockCmsBackend } from "../src/cms/mock-adapter.ts";
import { createDefaultsFor } from "../src/lib/records.ts";

// The mock adapter intentionally models browser latency through window.setTimeout.
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { setTimeout: globalThis.setTimeout.bind(globalThis) }
});

const { data } = mockCmsBackend;

function getCollection(id: string) {
  const collection = collectionRegistry.find((item) => item.id === id);
  assert.ok(collection, `${id} is registered`);
  return collection!;
}

describe("record source gating", () => {
  it("forbids creating a record in a site-sourced collection", async () => {
    await assert.rejects(
      () => data.createRecord("orders"),
      (error: unknown) => {
        assert.ok(isCmsError(error));
        assert.equal((error as { code: string }).code, "forbidden");
        return true;
      }
    );
  });

  it("forbids importing into a site-sourced collection", async () => {
    await assert.rejects(
      () => data.importRecords("customers", [{ name: "Someone", email: "someone@example.com" }]),
      (error: unknown) => {
        assert.ok(isCmsError(error));
        assert.equal((error as { code: string }).code, "forbidden");
        return true;
      }
    );
  });

  it("still allows creating records in an editor-sourced collection", async () => {
    const record = await data.createRecord("redirect-rules");
    assert.ok(record.id);
  });
});

describe("read-only field preservation", () => {
  it("keeps a read-only field's stored value even when the client submits a different one", async () => {
    const order = (await data.listRecords("orders", { limit: 1 })).records[0];
    const originalEmail = order.values.customerEmail;

    const saved = await data.saveRecord("orders", {
      ...order,
      values: { ...order.values, customerEmail: "tampered@example.com", status: "fulfilled" }
    });

    // The read-only field is untouched...
    assert.equal(saved.values.customerEmail, originalEmail);
    assert.notEqual(saved.values.customerEmail, "tampered@example.com");
    // ...while an editable field on the very same save goes through.
    assert.equal(saved.values.status, "fulfilled");
  });
});

describe("format: json validation", () => {
  it("rejects a save with malformed JSON in a format: json field", async () => {
    const order = (await data.listRecords("orders", { limit: 1 })).records[0];

    await assert.rejects(
      () => data.saveRecord("orders", { ...order, values: { ...order.values, items: "{not valid json" } }),
      (error: unknown) => {
        assert.ok(isCmsError(error));
        assert.equal((error as { code: string }).code, "validation");
        return true;
      }
    );
  });

  it("accepts a save that keeps valid JSON in a format: json field", async () => {
    const order = (await data.listRecords("orders", { limit: 1 })).records[0];

    const saved = await data.saveRecord("orders", {
      ...order,
      values: { ...order.values, items: JSON.stringify([{ slug: "x", qty: 1 }]) }
    });

    assert.ok(saved.id);
  });

  it("treats an empty string as valid", async () => {
    const order = (await data.listRecords("orders", { limit: 1 })).records[0];

    const saved = await data.saveRecord("orders", { ...order, values: { ...order.values, items: "" } });
    assert.ok(saved.id);
  });
});

describe("create defaults", () => {
  it("defaults product review source to manual, applying only known fields", () => {
    const defaults = createDefaultsFor(getCollection("product-reviews"));
    assert.deepEqual(defaults, { source: "manual" });
  });

  it("applies no defaults for a collection without an override", () => {
    const defaults = createDefaultsFor(getCollection("articles"));
    assert.deepEqual(defaults, {});
  });

  it("seeds a created product review with source: manual", async () => {
    const collection = getCollection("product-reviews");
    const record = await data.createRecord(collection.id, createDefaultsFor(collection));
    assert.equal(record.values.source, "manual");
  });
});
