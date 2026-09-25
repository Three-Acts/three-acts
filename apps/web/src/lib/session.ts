import { createAuthClient, createSessionStore, type ApiFetch } from "@three-acts/auth";
import { apiFetch } from "./api-client";

/**
 * The storefront's shared session store and auth client — the "shop" scope
 * of `@three-acts/auth` (as opposed to the CMS's "cms" scope). Every island
 * that needs auth state imports `authClient` (usually indirectly, through
 * `AuthProvider` in `./providers`) so sign-in/out is visible everywhere at
 * once, via `sessionStore`'s `localStorage` + `storage`-event sync.
 */
export const sessionStore = createSessionStore();

// Wrapped rather than passed directly: see `./api-client`'s docstring on why
// this pair of modules imports each other, and why this indirection is what
// makes the cycle safe.
const apiFetchForAuth: ApiFetch = (path, init) => apiFetch(path, init);

export const authClient = createAuthClient({
  apiFetch: apiFetchForAuth,
  store: sessionStore,
  scope: "shop"
});
