/**
 * Maps a `POST /shop/checkout` `validation_error` message (see
 * `apps/api/api/_lib/shop/checkout.ts`'s `validateCheckout`, which always
 * fails on the *first* problem it finds, dot-prefixed by request shape —
 * `"customer.email must be..."`, `"shipping.postalCode is required."`) onto
 * one of this form's field ids, so the error can render next to the input
 * it's about instead of only in the top-level banner.
 *
 * Order matters: longer/more specific prefixes are checked before their
 * shorter siblings (`shipping.postalCode` before a hypothetical `shipping`).
 * Messages this can't place (a cart-line problem, a bad discount code, a
 * currency mismatch) return `undefined` — the caller shows those in the
 * top-level banner only.
 */
const FIELD_PREFIXES: readonly { prefix: string; field: string }[] = [
  { prefix: "customer.email", field: "email" },
  { prefix: "customer.name", field: "name" },
  { prefix: "shipping.name", field: "shippingName" },
  { prefix: "shipping.address", field: "address" },
  { prefix: "shipping.city", field: "city" },
  { prefix: "shipping.postalCode", field: "postalCode" },
  { prefix: "shipping.country", field: "country" },
  { prefix: "shipping.method", field: "method" },
  { prefix: "paymentMethod", field: "paymentMethod" }
];

export function checkoutErrorField(message: string): string | undefined {
  return FIELD_PREFIXES.find(({ prefix }) => message.startsWith(prefix))?.field;
}
