import { createAuthClient } from "@three-acts/auth";
import type { AuthClient } from "@three-acts/auth";
import { apiFetch } from "../lib/api-client";
import { mockAuthClient } from "../auth/mock-auth-client";
import { sessionStore } from "../auth/session-store";
import { mockCmsBackend } from "./mock-adapter";
import { createRestCmsBackend } from "./rest-backend";
import type { CmsBackend } from "./types";

export type ResolvedCmsBackend = {
  backend: CmsBackend;
  authClient: AuthClient;
};

/**
 * Picks the active `CmsBackend` (and its matching `AuthClient`) from
 * `VITE_CMS_BACKEND`:
 * - unset or "mock" (the default): the in-memory mock backend, paired with
 *   the zero-backend local-only `mockAuthClient` (any email/password, never
 *   persisted).
 * - "rest": the REST backend, talking to `/api/cms/*` via the CMS `apiFetch`,
 *   paired with a `cms`-scoped `@three-acts/auth` client that signs in
 *   through `/api/auth/sign-in` and stores the session in `sessionStore`.
 * - anything else: warns and falls back to mock so local dev never hard-fails
 *   on a typo'd env var.
 */
export function resolveCmsBackend(): ResolvedCmsBackend {
  const value = import.meta.env.VITE_CMS_BACKEND;

  if (value === "rest") {
    return {
      backend: createRestCmsBackend({ apiFetch }),
      authClient: createAuthClient({ apiFetch, store: sessionStore, scope: "cms" })
    };
  }

  if (value && value !== "mock") {
    console.warn(`Unknown VITE_CMS_BACKEND "${value}" — falling back to the mock backend.`);
  }

  return { backend: mockCmsBackend, authClient: mockAuthClient };
}
