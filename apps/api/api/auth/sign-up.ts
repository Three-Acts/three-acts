import type { SignUpRequest } from "@three-acts/auth";
import { ok, readJsonBody, withApi } from "../_lib/http";
import { signUp } from "../_lib/auth/service";

/** POST /api/auth/sign-up  body SignUpRequest -> Session (scope "shop") */
export default withApi(["POST"], async (request, response) => {
  const body = readJsonBody<SignUpRequest>(request);
  ok(response, await signUp(body));
});
