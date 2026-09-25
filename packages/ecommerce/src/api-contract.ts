import type { CartLine, Discount, Order, PaymentMethod, PriceBreakdown, ShippingMethod } from "./models";

/**
 * Path builders for the shop routes under `apps/api` (mounted at
 * `/api/shop/*`; these paths omit the `/api` prefix, matching
 * `shopApiPaths.products()` -> `/shop/products`). Every builder is annotated
 * `` `/${string}` `` (matching `@three-acts/auth`'s `authApiPaths`) so the
 * return type is narrow enough to pass straight into `apiFetch`'s
 * `` path: `/${string}` `` parameter without a cast at every call site —
 * without it, a plain arrow function's string-literal body widens to
 * `string`.
 */
export const shopApiPaths = {
  products: (): `/${string}` => "/shop/products",
  product: (slug: string): `/${string}` => `/shop/products/${slug}`,
  reviews: (slug: string): `/${string}` => `/shop/products/${slug}/reviews`,
  validateDiscount: (): `/${string}` => "/shop/discounts/validate",
  checkout: (): `/${string}` => "/shop/checkout",
  orders: (): `/${string}` => "/shop/orders",
  order: (orderNumber: string): `/${string}` => `/shop/orders/${orderNumber}`
};

export type CheckoutRequest = {
  lines: CartLine[];
  customer: { name: string; email: string; phone?: string };
  shipping: { name: string; address: string; city: string; postalCode: string; country: string; method: ShippingMethod };
  discountCode?: string;
  paymentMethod: PaymentMethod;
  marketingOptIn?: boolean;
  notes?: string;
};

export type CheckoutResponse = { order: Order };

export type ValidateDiscountRequest = { code: string; lines: CartLine[] };

export type ValidateDiscountResponse = {
  valid: boolean;
  discount?: Discount;
  reason?: string;
  breakdown?: PriceBreakdown;
};

export type SubmitReviewRequest = {
  title: string;
  customerName: string;
  customerEmail?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
};

export type ListOrdersResponse = { orders: Order[] };
