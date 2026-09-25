import { shopConfig } from "./config";
import type { Discount, PriceBreakdown, Product, ShippingMethod } from "./models";

/** Rounds a raw money value to the cent. Every field on `PriceBreakdown` goes through this exactly once, at the end of its own computation. */
export function money(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function discountApplies(subtotal: number, discount: Discount | undefined): discount is Discount {
  return discount !== undefined && subtotal >= discount.minimumSubtotal;
}

/**
 * Raw (unrounded) discount amount off a raw (unrounded) subtotal.
 * `percentage` takes a percentage of the subtotal; `fixed_amount` is capped
 * at the subtotal (a discount can never make the merchandise total negative);
 * `free_shipping` discounts nothing off merchandise — see `shippingFor`.
 * Returns 0 when there is no discount or the cart is under its `minimumSubtotal`.
 */
export function applyDiscount(subtotal: number, discount: Discount | undefined): number {
  if (!discountApplies(subtotal, discount)) {
    return 0;
  }
  if (discount.kind === "percentage") {
    return subtotal * (discount.amount / 100);
  }
  if (discount.kind === "fixed_amount") {
    return Math.min(discount.amount, subtotal);
  }
  return 0;
}

/**
 * Raw (unrounded) shipping cost. Collection is always free. Otherwise
 * shipping is free once the discounted merchandise total (VAT-inclusive)
 * reaches `shopConfig.shipping.freeOverInclVat`, or when a `free_shipping`
 * discount applies; otherwise it's the flat domestic/international rate.
 */
export function shippingFor(options: {
  shippingMethod: ShippingMethod;
  /** (subtotal − discount) × (1 + vatRate) — the merchandise total the customer actually pays VAT on. */
  discountedMerchandiseInclVat: number;
  freeShippingDiscount: boolean;
}): number {
  const { shippingMethod, discountedMerchandiseInclVat, freeShippingDiscount } = options;
  if (shippingMethod === "collection") {
    return shopConfig.shipping.collection;
  }
  if (freeShippingDiscount || discountedMerchandiseInclVat >= shopConfig.shipping.freeOverInclVat) {
    return 0;
  }
  return shippingMethod === "domestic" ? shopConfig.shipping.domestic : shopConfig.shipping.international;
}

/**
 * Prices a cart of resolved product lines. Pure and side-effect free —
 * mirrors the seed's money model in `@three-acts/cms-schema/seed` exactly:
 * merchandise is VAT-inclusive, `subtotal` is ex VAT, discount comes off the
 * subtotal, tax is 15% VAT on the discounted subtotal for domestic orders
 * only (exports are zero-rated), and shipping is free at/above the
 * threshold, for a `free_shipping` discount, or for roastery collection.
 *
 * Every intermediate value is kept unrounded until it's assigned to its own
 * field on the returned `PriceBreakdown`, each rounded independently via
 * `money()` — rounding the subtotal before computing tax from it would lose
 * a cent versus the original VAT-inclusive price on many carts.
 */
export function priceCart(
  lines: Array<{ product: Product; quantity: number }>,
  options: { discount?: Discount; shippingMethod: ShippingMethod; country: string }
): PriceBreakdown {
  const currency = lines[0]?.product.currency ?? shopConfig.currency;
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const merchandiseInclVatRaw = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  const vat = shopConfig.vatRate;
  const subtotalRaw = shopConfig.pricesIncludeVat ? merchandiseInclVatRaw / (1 + vat) : merchandiseInclVatRaw;

  const discountRaw = applyDiscount(subtotalRaw, options.discount);
  const taxableRaw = subtotalRaw - discountRaw;

  const isDomestic = options.country === shopConfig.shipping.domesticCountry;
  const taxRaw = isDomestic ? vat * taxableRaw : 0;

  const discountedMerchandiseInclVatRaw = taxableRaw * (1 + vat);
  const freeShippingDiscount = discountApplies(subtotalRaw, options.discount) && options.discount.kind === "free_shipping";
  const shippingRaw = shippingFor({
    shippingMethod: options.shippingMethod,
    discountedMerchandiseInclVat: discountedMerchandiseInclVatRaw,
    freeShippingDiscount
  });

  const totalRaw = taxableRaw + taxRaw + shippingRaw;

  return {
    currency,
    itemCount,
    merchandiseInclVat: money(merchandiseInclVatRaw),
    subtotal: money(subtotalRaw),
    discountTotal: money(discountRaw),
    taxTotal: money(taxRaw),
    shippingTotal: money(shippingRaw),
    total: money(totalRaw),
    freeShipping: shippingRaw === 0
  };
}

/** Formats a money amount for display, e.g. `formatMoney(1234, "USD")` -> "$1,234.00" (exact grouping/decimal glyphs depend on the ICU data available). */
export function formatMoney(amount: number, currency: string, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

/** Human label for a product's stock state, folding "in stock but at/under the low-stock threshold" into "Low stock". */
export function availabilityLabel(product: Product): string {
  switch (product.availability) {
    case "in_stock":
      return product.inventory > 0 && product.inventory <= shopConfig.lowStockThreshold ? "Low stock" : "In stock";
    case "low_stock":
      return "Low stock";
    case "out_of_stock":
      return "Out of stock";
    case "preorder":
      return "Available for pre-order";
    case "discontinued":
      return "Discontinued";
    default:
      return "";
  }
}

/** Whether a product can be added to the cart: in stock, low stock or preorder, and (in-stock/low-stock cases) actually has inventory. */
export function isPurchasable(product: Product): boolean {
  if (product.availability !== "in_stock" && product.availability !== "low_stock" && product.availability !== "preorder") {
    return false;
  }
  return product.availability === "preorder" || product.inventory > 0;
}
