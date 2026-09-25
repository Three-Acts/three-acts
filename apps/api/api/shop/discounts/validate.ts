import { isPurchasable, priceCart, shopConfig, type CartLine, type Product, type ValidateDiscountRequest, type ValidateDiscountResponse } from "@three-acts/ecommerce";
import { ApiError, ok, readJsonBody, withApi } from "../../_lib/http";
import { findDiscount, getLiveProduct } from "../../_lib/shop/catalogue";

type ResolvedLine = { product: Product; quantity: number };

/**
 * Resolves whatever lines are recognizable (live, purchasable, sane
 * quantity) and silently drops the rest — this endpoint previews a discount
 * against the current cart, it isn't the checkout stock gate, so a stale or
 * unknown line shouldn't block validating the code itself.
 */
async function resolveValidateLines(lines: unknown): Promise<ResolvedLine[]> {
  if (!Array.isArray(lines)) return [];
  const resolved: ResolvedLine[] = [];
  for (const raw of lines as CartLine[]) {
    if (!raw || typeof raw.slug !== "string" || !raw.slug.trim()) continue;
    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) continue;
    const product = await getLiveProduct(raw.slug.trim());
    if (!product || !isPurchasable(product)) continue;
    resolved.push({ product, quantity });
  }
  return resolved;
}

/**
 * POST /api/shop/discounts/validate  body ValidateDiscountRequest -> ValidateDiscountResponse
 *
 * Public (no auth). Never 400s for a code that simply doesn't exist or isn't
 * currently redeemable — that's `{ valid: false, reason }`, not an error.
 * `lines` has no shipping/country context yet (that's collected later at
 * checkout), so the preview `breakdown` prices against domestic shipping to
 * `shopConfig.shipping.domesticCountry`; the real order is priced again at
 * checkout with the shopper's actual shipping selection.
 */
export default withApi(["POST"], async (request, response) => {
  const body = readJsonBody<Partial<ValidateDiscountRequest>>(request);

  if (typeof body.code !== "string" || !body.code.trim()) {
    throw new ApiError(400, "validation_error", "code is required.");
  }

  const resolvedLines = await resolveValidateLines(body.lines);
  const lookup = await findDiscount(body.code);

  if ("reason" in lookup) {
    ok<ValidateDiscountResponse>(response, { valid: false, reason: lookup.reason });
    return;
  }

  const breakdown = priceCart(resolvedLines, {
    discount: lookup.discount,
    shippingMethod: "domestic",
    country: shopConfig.shipping.domesticCountry
  });

  ok<ValidateDiscountResponse>(response, { valid: true, discount: lookup.discount, breakdown });
});
