import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSessionStore, type KeyValueStorage } from "./session-store";
import type { Session } from "./models";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    token: "tok_123",
    user: { id: "user_1", email: "amy@example.com", name: "Amy", scope: "shop" },
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides
  };
}

function makeMemoryStorage(): KeyValueStorage {
  const backing = new Map<string, string>();
  return {
    getItem: (key) => backing.get(key) ?? null,
    setItem: (key, value) => {
      backing.set(key, value);
    },
    removeItem: (key) => {
      backing.delete(key);
    }
  };
}

describe("createSessionStore", () => {
  it("starts signed out with no persisted session", () => {
    const store = createSessionStore({ storage: makeMemoryStorage() });
    assert.equal(store.getState(), null);
    assert.equal(store.getToken(), null);
  });

  it("set() persists and getState() reads it back; getToken() shorthands the token", () => {
    const storage = makeMemoryStorage();
    const store = createSessionStore({ storage });
    const session = makeSession();

    store.set(session);

    assert.deepEqual(store.getState(), session);
    assert.equal(store.getToken(), session.token);
  });

  it("persists under the default key as { version: 1, session }", () => {
    const storage = makeMemoryStorage();
    const store = createSessionStore({ storage });
    const session = makeSession();

    store.set(session);

    const raw = storage.getItem("three-acts:session:v1");
    assert.ok(raw);
    assert.deepEqual(JSON.parse(raw!), { version: 1, session });
  });

  it("honors a custom key", () => {
    const storage = makeMemoryStorage();
    const store = createSessionStore({ storage, key: "custom:key" });
    store.set(makeSession());

    assert.equal(storage.getItem("three-acts:session:v1"), null);
    assert.ok(storage.getItem("custom:key"));
  });

  it("set(null) clears the persisted session", () => {
    const storage = makeMemoryStorage();
    const store = createSessionStore({ storage });
    store.set(makeSession());
    store.set(null);

    assert.equal(store.getState(), null);
    assert.equal(storage.getItem("three-acts:session:v1"), null);
  });

  it("drops an expired session on read, returning null", () => {
    const storage = makeMemoryStorage();
    const store = createSessionStore({ storage });
    store.set(makeSession({ expiresAt: new Date(Date.now() - 1_000).toISOString() }));

    assert.equal(store.getState(), null);
    // ...and evicts it from storage rather than leaving stale data behind.
    assert.equal(storage.getItem("three-acts:session:v1"), null);
  });

  it("getState() returns a stable reference across calls when nothing changed", () => {
    const storage = makeMemoryStorage();
    const store = createSessionStore({ storage });
    store.set(makeSession());

    const first = store.getState();
    const second = store.getState();
    assert.equal(first, second);
  });

  it("notifies subscribers on set(), and unsubscribe stops further notifications", () => {
    const store = createSessionStore({ storage: makeMemoryStorage() });
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });

    store.set(makeSession());
    assert.equal(calls, 1);

    unsubscribe();
    store.set(null);
    assert.equal(calls, 1);
  });

  it("falls back to an in-memory store when no storage is available (e.g. Node)", () => {
    // No `storage` option and no global `localStorage` in this environment,
    // so this exercises the in-memory branch directly.
    const store = createSessionStore();
    const session = makeSession();

    store.set(session);
    assert.deepEqual(store.getState(), session);

    // A second, independently-created store must not share the first's
    // in-memory state.
    const other = createSessionStore();
    assert.equal(other.getState(), null);
  });
});
