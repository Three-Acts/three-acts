/**
 * Fork-time shop configuration for the Fynbos & Fire storefront.
 *
 * This is the one file a client fork edits to retarget the whole package:
 * currency, VAT handling, shipping rates/thresholds, the order number
 * prefix and the low-stock threshold. Nothing else in `@three-acts/ecommerce`
 * (or in `apps/api`'s shop routes) should hardcode these values — they all
 * read from `shopConfig`.
 */
export const shopConfig = {
  /** ISO 4217 currency code every price, cart and order is denominated in. */
  currency: "ZAR",
  /** VAT rate as a fraction (0.15 = 15%). */
  vatRate: 0.15,
  /** Whether `Product.price` / `compareAtPrice` already include VAT. */
  pricesIncludeVat: true,
  shipping: {
    /** Discounted merchandise total, VAT-inclusive, at or above which shipping is free. */
    freeOverInclVat: 600,
    /** Flat domestic shipping rate. */
    domestic: 95,
    /** Flat international shipping rate. */
    international: 450,
    /** ISO country code treated as "domestic" for tax and shipping purposes. */
    domesticCountry: "ZA",
    /** Roastery collection: always free. */
    collection: 0
  },
  /** Prefix for generated order numbers, e.g. "FF" -> "FF-10822". */
  orderNumberPrefix: "FF",
  /** Inventory at or below which an in-stock product is shown as low stock. */
  lowStockThreshold: 5
} as const;

export type ShopConfig = typeof shopConfig;
