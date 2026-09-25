import { ApiError, ok, withApi } from "../../_lib/http";
import { requireShopAuth } from "../../_lib/auth/sessions";
import { getOrderForEmail } from "../../_lib/shop/orders";

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/**
 * GET /api/shop/orders/:orderNumber -> { order: Order }
 *
 * Requires a shop session. 404 `not_found` both when the order doesn't exist
 * and when it belongs to a different customer — `getOrderForEmail` doesn't
 * distinguish the two, so this route can't leak which order numbers exist.
 */
export default withApi(["GET"], async (request, response) => {
  const user = requireShopAuth(request);

  const orderNumber = readStringParam(request.query.orderNumber);
  if (!orderNumber) {
    throw new ApiError(400, "invalid_query", "orderNumber is required.");
  }

  const order = await getOrderForEmail(orderNumber, user.email);
  if (!order) {
    throw new ApiError(404, "not_found", `No order found for "${orderNumber}".`);
  }

  ok(response, { order });
});
