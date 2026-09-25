import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCartStore } from "./cart-store";
import type { KeyValueStorage } from "./cart-store";

function fakeStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    }
  };
}

describe("createCartStore", () => {
  it("adds a line and accumulates quantity on repeat adds", () => {
    const store = createCartStore({ storage: fakeStorage() });
    store.add("house-blend-350g", 2);
    assert.deepEqual(store.getState().lines, [{ slug: "house-blend-350g", quantity: 2 }]);
    store.add("house-blend-350g", 1);
    assert.equal(store.getState().lines[0].quantity, 3);
  });

  it("setQuantity updates an existing line and setQuantity(slug, 0) removes it", () => {
    const store = createCartStore({ storage: fakeStorage() });
    store.add("aeropress-go", 1);
    store.setQuantity("aeropress-go", 5);
    assert.equal(store.getState().lines[0].quantity, 5);
    store.setQuantity("aeropress-go", 0);
    assert.deepEqual(store.getState().lines, []);
  });

  it("clamps quantity to 1..99", () => {
    const store = createCartStore({ storage: fakeStorage() });
    store.add("aeropress-go", 500);
    assert.equal(store.getState().lines[0].quantity, 99);
    store.setQuantity("aeropress-go", -5);
    assert.deepEqual(store.getState().lines, []);
    store.add("comandante-c40-grinder", 0);
    assert.equal(store.getState().lines[0].quantity, 1);
  });

  it("remove drops a single line, clear empties the cart", () => {
    const store = createCartStore({ storage: fakeStorage() });
    store.add("a", 1);
    store.add("b", 1);
    store.remove("a");
    assert.deepEqual(store.getState().lines.map((l) => l.slug), ["b"]);
    store.clear();
    assert.deepEqual(store.getState().lines, []);
  });

  it("sets and clears a discount code", () => {
    const store = createCartStore({ storage: fakeStorage() });
    store.setDiscountCode("WELCOME10");
    assert.equal(store.getState().discountCode, "WELCOME10");
    store.setDiscountCode(undefined);
    assert.equal(store.getState().discountCode, undefined);
  });

  it("persists across store instances sharing the same storage and key", () => {
    const storage = fakeStorage();
    const store1 = createCartStore({ storage, key: "test:cart" });
    store1.add("house-blend-350g", 2);
    store1.setDiscountCode("WELCOME10");

    const store2 = createCartStore({ storage, key: "test:cart" });
    assert.deepEqual(store2.getState().lines, [{ slug: "house-blend-350g", quantity: 2 }]);
    assert.equal(store2.getState().discountCode, "WELCOME10");
  });

  it("ignores a corrupt (non-JSON) persisted payload", () => {
    const storage = fakeStorage();
    storage.setItem("three-acts:cart:v1", "{not json");
    const store = createCartStore({ storage });
    assert.deepEqual(store.getState().lines, []);
  });

  it("ignores a persisted payload from a different version", () => {
    const storage = fakeStorage();
    storage.setItem("three-acts:cart:v1", JSON.stringify({ version: 2, lines: [{ slug: "x", quantity: 1 }] }));
    const store = createCartStore({ storage });
    assert.deepEqual(store.getState().lines, []);
  });

  it("uses the default localStorage-style key when none is given", () => {
    const storage = fakeStorage();
    const store = createCartStore({ storage });
    store.add("x", 1);
    assert.ok(storage.getItem("three-acts:cart:v1"));
  });

  it("returns a stable snapshot reference until the state changes (useSyncExternalStore contract)", () => {
    const store = createCartStore({ storage: fakeStorage() });
    const first = store.getState();
    const second = store.getState();
    assert.equal(first, second);
    store.add("x", 1);
    const third = store.getState();
    assert.notEqual(second, third);
    const fourth = store.getState();
    assert.equal(third, fourth);
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const store = createCartStore({ storage: fakeStorage() });
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.add("x", 1);
    assert.equal(calls, 1);
    unsubscribe();
    store.add("x", 1);
    assert.equal(calls, 1);
  });
});
