import type { PublishBody } from "@three-acts/cms-schema";
import { ApiError, ok, readJsonBody, withApi } from "../_lib/http";
import { requireAuth } from "../_lib/auth";
import { authenticate } from "../_lib/auth/sessions";
import { publishQueued, publishReviewed } from "../_lib/cms/service";

/**
 * POST /api/cms/publish  body PublishBody -> { published: number }
 *
 * Publish step 1: flips every `queued_to_publish` record (optionally scoped
 * to one collection) to `published`. Triggering the site rebuild is a
 * separate step — see /api/deploy.
 */
export default withApi(["POST"], async (request, response) => {
  requireAuth(request);
  const body = readJsonBody<PublishBody>(request);
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !["collectionId", "records"].includes(key)) || body.collectionId !== undefined && typeof body.collectionId !== "string") throw new ApiError(400, "invalid_request", "Choose reviewed records or a valid legacy collection scope.");
  if (Object.hasOwn(body, "records")) {
    if (authenticate(request)?.scope !== "cms") throw new ApiError(401, "unauthorized", "Sign in as a content editor to publish a reviewed release.");
    if (body.collectionId !== undefined) throw new ApiError(400, "invalid_request", "Choose reviewed records or a legacy collection scope.");
    ok(response, await publishReviewed(body.records));
  } else ok(response, await publishQueued(body.collectionId));
});
