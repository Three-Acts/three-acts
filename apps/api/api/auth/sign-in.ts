import type { SignInRequest } from "@three-acts/auth";
import { ok, readJsonBody, withApi } from "../_lib/http";
import { signIn } from "../_lib/auth/service";

/** POST /api/auth/sign-in  body SignInRequest ({ email, password, scope? }) -> Session */
export default withApi(["POST"], async (request, response) => {
  const body = readJsonBody<SignInRequest>(request);
  ok(response, await signIn(body));
});
