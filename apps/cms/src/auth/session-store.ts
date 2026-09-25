import { createSessionStore } from "@three-acts/auth";

/**
 * The CMS's singleton client-side session store (see `@three-acts/auth`'s
 * `createSessionStore`): persists the signed-in editor's session to
 * `localStorage` under a CMS-specific key so it never collides with the
 * storefront's own session store (`three-acts:session:v1`, shop-scoped) if
 * both apps ever share an origin/browser profile.
 *
 * Shared by `lib/api-client.ts` (reads the token to attach to every request)
 * and `cms/resolve-backend.ts` (the `rest` `AuthClient` writes to it on
 * sign-in/sign-out/restore).
 */
export const sessionStore = createSessionStore({ key: "three-acts:cms-session:v1" });
