import { ApiError, ok, readJsonBody, withApi } from "../_lib/http";
import { authenticate } from "../_lib/auth/sessions";
import { getPublicationDeployment, publicationConfiguration, triggerPublicationDeployment } from "../_lib/editor/deployment";

export default withApi(["GET", "POST"], async (request, response) => {
  if (authenticate(request)?.scope !== "cms") throw new ApiError(401, "unauthorized", "Sign in as a content editor.");
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "POST") {
    const body = readJsonBody<Record<string, unknown>>(request);
    if (body.retry !== undefined && typeof body.retry !== "boolean") throw new ApiError(400, "invalid_publication", "Retry must be explicit.");
    ok(response, await triggerPublicationDeployment(body, body.retry === true));
  } else if (request.query.revision !== undefined || request.query.publicationId !== undefined) {
    if (request.query.id !== undefined && typeof request.query.id !== "string") throw new ApiError(400, "invalid_publication", "Choose one deployment identity.");
    ok(response, await getPublicationDeployment({ revision: request.query.revision, publicationId: request.query.publicationId }, request.query.id));
  } else ok(response, await publicationConfiguration());
});
