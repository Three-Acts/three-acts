import { ok, withApi } from "../_lib/http";
import { requireShopAuth } from "../_lib/auth/sessions";
import { listOrdersForEmail } from "../_lib/shop/orders";

/** GET /api/shop/orders -> { orders: Order[] } — the signed-in customer's own orders, newest first. Requires a shop session. */
export default withApi(["GET"], async (request, response) => {
  const user = requireShopAuth(request);
  ok(response, { orders: await listOrdersForEmail(user.email) });
});
