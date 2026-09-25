/**
 * Typed read models for the storefront domain, mapped from `CmsRecord`s by
 * `./mappers` and priced by `./pricing`.
 *
 * `ImageRef` intentionally mirrors `@three-acts/content`'s type of the same
 * name (`{ src; alt; width?; height? }`) rather than depending on that
 * package, so `@three-acts/ecommerce` stays independently installable.
 */
export type ImageRef = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export type ProductAvailability = "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "discontinued";

export type Product = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  categorySlug: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  inventory: number;
  availability: ProductAvailability;
  shortDescription: string;
  description: string;
  images: ImageRef[];
  video?: { src: string; contentType: string };
  specSheet?: { src: string; fileName: string };
  weightGrams: number;
  tags: string[];
  featured: boolean;
};

export type ProductCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image?: ImageRef;
  sortOrder: number;
};

export type ProductReview = {
  id: string;
  productSlug: string;
  title: string;
  customerName: string;
  rating: number;
  body: string;
  verifiedPurchase: boolean;
  submittedAt: string;
};

export type CartLine = { slug: string; quantity: number };

export type Cart = { lines: CartLine[]; discountCode?: string; updatedAt: string };

export type OrderLineItem = {
  slug: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: string;
  image?: string;
};

export type ShippingMethod = "domestic" | "international" | "collection";

export type DiscountKind = "percentage" | "fixed_amount" | "free_shipping";

export type Discount = {
  code: string;
  kind: DiscountKind;
  amount: number;
  minimumSubtotal: number;
};

/** A cart or order's computed money breakdown. Every amount is rounded to the cent. */
export type PriceBreakdown = {
  currency: string;
  itemCount: number;
  /** Undiscounted merchandise total, VAT-inclusive: Σ unitPrice × qty. */
  merchandiseInclVat: number;
  /** Merchandise total, ex VAT, before discount. */
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  /** Whether shipping came to R0 (threshold, a free-shipping discount, or roastery collection). */
  freeShipping: boolean;
};

export type OrderStatus = "pending" | "paid" | "fulfilled" | "shipped" | "refunded" | "cancelled";

export type OrderPaymentStatus = "awaiting" | "authorized" | "paid" | "partially_refunded" | "refunded" | "failed";

export type PaymentMethod = "card" | "eft" | "paypal" | "apple_pay" | "gift_card";

export type Order = PriceBreakdown & {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: PaymentMethod;
  items: OrderLineItem[];
  discountCode: string;
  placedAt: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  trackingNumber: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  marketingOptIn: boolean;
  totalOrders: number;
  lifetimeValue: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
};
