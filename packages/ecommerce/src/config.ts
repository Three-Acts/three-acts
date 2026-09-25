/**
 * Fork-time shop configuration for the Three Acts storefront — the template
 * selling its own pieces (apps, packages, modules, themes, integrations,
 * licences, services and bundles) as digital products.
 *
 * This is the one file a client fork edits to retarget the whole package:
 * currency, VAT handling, shipping rates/thresholds, the order number
 * prefix and the low-stock threshold. Nothing else in `@three-acts/ecommerce`
 * (or in `apps/api`'s shop routes) should hardcode these values — they all
 * read from `shopConfig`.
 */
export const shopConfig = {
  /** ISO 4217 currency code every price, cart and order is denominated in. */
  currency: "USD",
  /**
   * VAT rate as a fraction (0.15 = 15%). The demo sells digital products with
   * no tax charged at checkout; a fork selling into a taxed jurisdiction sets
   * this back to a real rate (e.g. `0.15` for South African VAT, or a
   * US-state sales-tax equivalent computed upstream and passed in as if it
   * were VAT).
   */
  vatRate: 0,
  /**
   * Whether `Product.price` / `compareAtPrice` already include VAT. Moot
   * while `vatRate` is `0` (dividing by `1 + 0` is a no-op), kept so the
   * knob is already in the right shape for a fork that re-enables tax.
   */
  pricesIncludeVat: true,
  shipping: {
    /**
     * Discounted merchandise total, VAT-inclusive, at or above which
     * shipping is free. `0` means every order clears the threshold, which is
     * correct here since every product is a download — see `domestic`.
     */
    freeOverInclVat: 0,
    /** Flat domestic shipping rate. `0`: nothing physically ships. */
    domestic: 0,
    /** Flat international shipping rate. `0`: nothing physically ships. */
    international: 0,
    /** ISO country code treated as "domestic" for tax and shipping purposes. */
    domesticCountry: "US",
    /** In-person/local collection: always free, same as every other method here. */
    collection: 0
  },
  /** Prefix for generated order numbers, e.g. "TA" -> "TA-10822". */
  orderNumberPrefix: "TA",
  /** Inventory at or below which an in-stock product is shown as low stock. */
  lowStockThreshold: 5
} as const;

export type ShopConfig = typeof shopConfig;
