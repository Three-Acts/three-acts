import type { PublishBody } from "@three-acts/cms-schema";
import { ok, readJsonBody, withApi } from "../_lib/http";
import { requireAuth } from "../_lib/auth";
import { publishQueued } from "../_lib/cms/service";

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
  ok(response, await publishQueued(body.collectionId));
});
