import { createApiClient } from "@three-acts/utils";
import type { ApiEnvelope } from "@three-acts/utils";
import { sessionStore } from "../auth/session-store";

export type { ApiEnvelope };

// An empty string is what an unset Vite env var resolves to at build time;
// `createApiClient` already treats that the same as "unset" and falls back
// to "/api".
const client = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL,
  // The signed-in editor's session token first (set by the `rest` AuthClient
  // on sign-in — see `cms/resolve-backend.ts`); `VITE_PUBLISH_TOKEN` as a
  // legacy fallback for when no session exists yet (or `VITE_CMS_BACKEND=mock`,
  // whose local-only auth client never writes a real session here).
  getAuthToken: async () => (await sessionStore.getToken()) ?? import.meta.env.VITE_PUBLISH_TOKEN ?? null
});

export const apiBaseUrl = client.apiBaseUrl;
export const apiUrl = client.apiUrl;

/**
 * The CMS's bound `apiFetch`. Failures are `ApiRequestError`s from
 * `@three-acts/utils`, carrying the envelope `code` and HTTP `status`.
 */
export const apiFetch: <TData>(path: `/${string}`, init?: RequestInit) => Promise<TData> = client.apiFetch;
