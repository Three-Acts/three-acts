import type { CartLine, Discount, Order, PaymentMethod, PriceBreakdown, ShippingMethod } from "./models";

/** Path builders for the shop routes under `apps/api` (mounted at `/api/shop/*`; these paths omit the `/api` prefix, matching `shopApiPaths.products()` -> `/shop/products`). */
export const shopApiPaths = {
  products: () => "/shop/products",
  product: (slug: string) => `/shop/products/${slug}`,
  reviews: (slug: string) => `/shop/products/${slug}/reviews`,
  validateDiscount: () => "/shop/discounts/validate",
  checkout: () => "/shop/checkout",
  orders: () => "/shop/orders",
  order: (orderNumber: string) => `/shop/orders/${orderNumber}`
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
