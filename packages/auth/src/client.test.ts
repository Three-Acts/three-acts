import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApiRequestError } from "@three-acts/utils";
import { authApiPaths } from "./api-contract";
import { createAuthClient, type ApiFetch } from "./client";
import type { Session } from "./models";
import { createSessionStore } from "./session-store";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    token: "tok_abc",
    user: { id: "user_1", email: "amy@example.com", name: "Amy", scope: "shop" },
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides
  };
}

describe("createAuthClient", () => {
  it("signIn posts { ...credentials, scope }, stores the session, and returns the user", async () => {
    const session = makeSession();
    const calls: Array<{ path: string; init?: RequestInit }> = [];
    const apiFetch: ApiFetch = (async (path: `/${string}`, init?: RequestInit) => {
      calls.push({ path, init });
      return session;
    }) as ApiFetch;
    const store = createSessionStore();
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    const user = await client.signIn({ email: "amy@example.com", password: "hunter2" });

    assert.deepEqual(user, session.user);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.path, authApiPaths.signIn());
    assert.deepEqual(JSON.parse(calls[0]?.init?.body as string), {
      email: "amy@example.com",
      password: "hunter2",
      scope: "shop"
    });
    assert.deepEqual(store.getState(), session);
    assert.equal(client.getAccessToken(), session.token);
    assert.equal(client.getUser()?.email, "amy@example.com");
    assert.deepEqual(client.getSession(), session);
  });

  it("signUp posts the input (no scope) and stores the returned session", async () => {
    const session = makeSession({ user: { id: "user_2", email: "ben@example.com", name: "Ben", scope: "shop" } });
    let capturedBody: unknown;
    const apiFetch: ApiFetch = (async (path: `/${string}`, init?: RequestInit) => {
      assert.equal(path, authApiPaths.signUp());
      capturedBody = JSON.parse(init?.body as string);
      return session;
    }) as ApiFetch;
    const store = createSessionStore();
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    const user = await client.signUp({ name: "Ben", email: "ben@example.com", password: "s3cret!" });

    assert.deepEqual(user, session.user);
    assert.deepEqual(capturedBody, { name: "Ben", email: "ben@example.com", password: "s3cret!" });
    assert.deepEqual(store.getState(), session);
  });

  it("maps a 401 to a friendly incorrect-credentials message on signIn", async () => {
    const apiFetch: ApiFetch = (async () => {
      throw new ApiRequestError("api", "invalid_credentials", "Invalid credentials", 401);
    }) as ApiFetch;
    const store = createSessionStore();
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    await assert.rejects(client.signIn({ email: "amy@example.com", password: "wrong" }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as Error).message, "Incorrect email or password.");
      return true;
    });
    assert.equal(store.getState(), null);
  });

  it("maps a 409 to a friendly account-exists message on signUp", async () => {
    const apiFetch: ApiFetch = (async () => {
      throw new ApiRequestError("api", "conflict", "Email already registered", 409);
    }) as ApiFetch;
    const store = createSessionStore();
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    await assert.rejects(client.signUp({ name: "Ben", email: "ben@example.com", password: "x" }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as Error).message, "An account with this email already exists.");
      return true;
    });
  });

  it("falls back to the API's own message for other errors", async () => {
    const apiFetch: ApiFetch = (async () => {
      throw new ApiRequestError("api", "server_error", "Something broke upstream", 500);
    }) as ApiFetch;
    const store = createSessionStore();
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    await assert.rejects(client.signIn({ email: "amy@example.com", password: "x" }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as Error).message, "Something broke upstream");
      return true;
    });
  });

  it("signOut posts to the sign-out path and clears the store even when the network call fails", async () => {
    const store = createSessionStore();
    store.set(makeSession());
    const apiFetch: ApiFetch = (async () => {
      throw new Error("network down");
    }) as ApiFetch;
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    await client.signOut();

    assert.equal(store.getState(), null);
  });

  it("signOut posts to authApiPaths.signOut()", async () => {
    const store = createSessionStore();
    store.set(makeSession());
    const calls: string[] = [];
    const apiFetch: ApiFetch = (async (path: `/${string}`) => {
      calls.push(path);
      return undefined;
    }) as ApiFetch;
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    await client.signOut();

    assert.deepEqual(calls, [authApiPaths.signOut()]);
    assert.equal(store.getState(), null);
  });

  it("restore() returns the cached user immediately without waiting on the network", async () => {
    const session = makeSession();
    const store = createSessionStore();
    store.set(session);

    // Never resolves within the test; restore() must not wait on it.
    const apiFetch: ApiFetch = (() => new Promise(() => {})) as ApiFetch;
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    const user = await client.restore();
    assert.deepEqual(user, session.user);
  });

  it("restore() revalidates via GET authApiPaths.session() and clears the store if the API says user: null", async () => {
    const session = makeSession();
    const store = createSessionStore();
    store.set(session);

    const apiFetch: ApiFetch = (async (path: `/${string}`, init?: RequestInit) => {
      assert.equal(path, authApiPaths.session());
      assert.equal(init?.method, "GET");
      return { user: null };
    }) as ApiFetch;
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    const user = await client.restore();
    assert.deepEqual(user, session.user);

    // Let the background revalidation's microtasks run.
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(store.getState(), null);
  });

  it("restore() returns null with no stored session and never calls the API", async () => {
    const store = createSessionStore();
    let calls = 0;
    const apiFetch: ApiFetch = (async () => {
      calls += 1;
      return { user: null };
    }) as ApiFetch;
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    const user = await client.restore();
    assert.equal(user, null);
    assert.equal(calls, 0);
  });

  it("restore() keeps the cached session when the background revalidation fails", async () => {
    const session = makeSession();
    const store = createSessionStore();
    store.set(session);

    const apiFetch: ApiFetch = (async () => {
      throw new Error("offline");
    }) as ApiFetch;
    const client = createAuthClient({ apiFetch, store, scope: "shop" });

    const user = await client.restore();
    assert.deepEqual(user, session.user);

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(store.getState(), session);
  });

  it("subscribe forwards to the underlying store", () => {
    const store = createSessionStore();
    const apiFetch: ApiFetch = (async () => undefined) as ApiFetch;
    const client = createAuthClient({ apiFetch, store, scope: "shop" });
    let calls = 0;
    const unsubscribe = client.subscribe(() => {
      calls += 1;
    });

    store.set(makeSession());
    assert.equal(calls, 1);
    unsubscribe();
  });
});
