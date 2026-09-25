import { json, readJsonBody, withApi } from "../_lib/http";
import { authenticate } from "../_lib/auth/sessions";
import { checkout, validateCheckout } from "../_lib/shop/checkout";

/**
 * POST /api/shop/checkout  body CheckoutRequest -> CheckoutResponse (201)
 *
 * Auth is optional: an anonymous shopper can check out as a guest. When a
 * valid `scope: "shop"` session is sent, `checkout()` forces `customer.email`
 * to the session's email so a signed-in order always attaches to that
 * account, never to whatever email the client happened to send.
 */
export default withApi(["POST"], async (request, response) => {
  const body = readJsonBody<unknown>(request);
  const checkoutRequest = validateCheckout(body);
  const user = authenticate(request);

  const result = await checkout(checkoutRequest, user);
  json(response, 201, { ok: true, data: result });
});
