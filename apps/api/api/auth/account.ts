import type { UpdateAccountRequest } from "@three-acts/auth";
import { ok, readJsonBody, withApi } from "../_lib/http";
import { requireShopAuth } from "../_lib/auth/sessions";
import { getAccount, updateAccount } from "../_lib/auth/service";

/**
 * GET /api/auth/account -> { customer: Customer }  (shop session required)
 * PUT /api/auth/account  body UpdateAccountRequest -> { customer: Customer }
 */
export default withApi(["GET", "PUT"], async (request, response) => {
  const user = requireShopAuth(request);

  if (request.method === "GET") {
    ok(response, await getAccount(user));
    return;
  }

  const body = readJsonBody<UpdateAccountRequest>(request);
  ok(response, await updateAccount(user, body));
});
