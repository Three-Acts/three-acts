/**
 * Shipping-destination countries for the checkout form's country select.
 * ISO 3166-1 alpha-2 codes, matching what `validateCheckout` expects
 * (`shipping.country`). South Africa is listed first — it's `shopConfig`'s
 * `domesticCountry` and the common case for this storefront.
 */
export const SHIPPING_COUNTRIES: readonly { code: string; name: string }[] = [
  { code: "ZA", name: "South Africa" },
  { code: "NA", name: "Namibia" },
  { code: "BW", name: "Botswana" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "LS", name: "Lesotho" },
  { code: "SZ", name: "Eswatini" },
  { code: "MZ", name: "Mozambique" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" }
];
