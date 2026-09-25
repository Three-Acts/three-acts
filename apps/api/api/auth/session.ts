import type { SessionResponse } from "@three-acts/auth";
import { ok, withApi } from "../_lib/http";
import { authenticate } from "../_lib/auth/sessions";

/**
 * GET /api/auth/session -> { user: AuthUser | null }
 *
 * Never 401s: a missing, malformed, or expired bearer token simply yields
 * `{ user: null }`, matching `authenticate`'s "never throws" contract. Used
 * by both apps' `AuthClient.restore()` to revalidate a cached session.
 */
export default withApi(["GET"], async (request, response) => {
  const body: SessionResponse = { user: authenticate(request) };
  ok(response, body);
});
