import { authenticate } from "../_lib/auth/sessions";
import { ApiError, ok, readJsonBody, withApi } from "../_lib/http";
import { pushEditorContent } from "../_lib/editor/github";

export default withApi(["POST"], async (request, response) => {
  if (authenticate(request)?.scope !== "cms") throw new ApiError(401, "unauthorized", "Sign in as a content editor.");
  response.setHeader("Cache-Control", "no-store");
  ok(response, await pushEditorContent(readJsonBody(request)));
});
