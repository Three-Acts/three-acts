import { ok, withApi } from "../_lib/http";

/**
 * POST /api/auth/sign-out -> { ok: true }
 *
 * Sessions are stateless signed tokens (no server-side session store), so
 * there's nothing to invalidate here: the client just drops its stored
 * token. This route exists for a stable client-facing contract and so a
 * future revocation mechanism (e.g. a token denylist) has somewhere to land
 * without changing the API shape.
 */
export default withApi(["POST"], async (_request, response) => {
  ok(response, { ok: true });
});
