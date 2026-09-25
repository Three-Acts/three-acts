import { createApiClient, type ApiEnvelope } from "@three-acts/utils/api-client";
import { sessionStore } from "./session";

/**
 * Web app's bound API client. `PUBLIC_API_URL` is the only env-driven knob:
 * Astro (like Vite) only exposes `PUBLIC_`-prefixed vars to client-side code,
 * so this must not be `VITE_`-prefixed or it is always undefined in the
 * hydrated bundle. Unset, it falls back to the same-origin `/api` convention
 * (proxied in dev, rewritten in Vercel — see astro.config.mjs / vercel.ts).
 *
 * `getAuthToken` reads `./session`'s `sessionStore` — that module also
 * imports `apiFetch` from here (to build `authClient`), so this pair is
 * intentionally circular. It's safe: `sessionStore` is only read lazily
 * inside this closure (never at module-evaluation time), and `./session`
 * only ever calls `apiFetch` through a wrapper closure of its own — by the
 * time either closure actually runs, both modules have finished evaluating.
 */
const client = createApiClient({
  baseUrl: import.meta.env.PUBLIC_API_URL,
  getAuthToken: () => sessionStore.getToken()
});

export const apiUrl = client.apiUrl;
export const apiFetch = client.apiFetch;
export type { ApiEnvelope };
