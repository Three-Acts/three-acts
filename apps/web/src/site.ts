export type NavLink = { label: string; href: string };

export type FooterNavGroup = { title: string; links: NavLink[] };

export type OpeningHours = { days: string; hours: string };

/**
 * Brand fallbacks for a Cape Town specialty coffee roaster. These mirror the
 * `site-settings`/`page-settings` organisation JSON-LD in
 * `packages/cms-schema/src/seed/site.ts` (`organizationLd`/`roasteryLd`) so
 * the layout renders sensible chrome even before the content wave wires
 * `SiteSettings` through `@three-acts/content`. `lib/seo.ts` and
 * `page-meta.ts` read `name`/`url`/`description`/`defaultImage`/`locale`/
 * `twitter` — keep those keys stable.
 */
export const site = {
  name: "Fynbos & Fire",
  // `site` from astro.config.mjs (sourced from VITE_SITE_URL at build time,
  // derived from the Vercel project on production, or thrown on a
  // misconfigured production build — see astro.config.mjs `resolveSiteUrl`).
  url: import.meta.env.SITE.replace(/\/+$/, ""),
  description:
    "Small-batch specialty coffee roasted in Observatory, Cape Town. Single origins, house blends and brewing gear, delivered fresh across South Africa.",
  /** Local raster (compressed to AVIF at build) used as the default social image. */
  defaultImage: "/og-default.png",
  locale: "en_ZA",
  twitter: "@fynbosandfire",
  email: "hello@fynbosandfire.co.za",
  phone: "+27 21 447 1290",
  phoneHref: "+27214471290",
  address: {
    street: "14 Lower Main Road",
    locality: "Observatory, Cape Town",
    postalCode: "7925",
    region: "Western Cape",
    country: "South Africa"
  },
  hours: [
    { days: "Monday – Friday", hours: "7:00 – 15:00" },
    { days: "Saturday", hours: "8:00 – 13:00" }
  ],
  social: [
    { label: "Instagram", href: "https://www.instagram.com/fynbosandfire" },
    { label: "X", href: "https://x.com/fynbosandfire" },
    { label: "Facebook", href: "https://www.facebook.com/fynbosandfire" }
  ]
} as const;

/** Public primary navigation, decoupled from the page files so content routes can appear too. */
export const navLinks: NavLink[] = [
  { label: "Shop", href: "/shop" },
  { label: "Journal", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Contact", href: "/contact" }
];

/** Footer nav columns: Shop / Journal / Company / Help. */
export const footerNav: FooterNavGroup[] = [
  {
    title: "Shop",
    links: [
      { label: "All coffee", href: "/shop" },
      { label: "Single origin", href: "/shop/category/single-origin" },
      { label: "Blends", href: "/shop/category/blends" },
      { label: "Decaf", href: "/shop/category/decaf" },
      { label: "Brewers", href: "/shop/category/brewers" },
      { label: "Grinders", href: "/shop/category/grinders" },
      { label: "Accessories", href: "/shop/category/accessories" },
      { label: "Merch", href: "/shop/category/merch" },
      { label: "Gift sets", href: "/shop/category/gift-sets" }
    ]
  },
  {
    title: "Journal",
    links: [{ label: "The brewing journal", href: "/blog" }]
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Visit the roastery", href: "/visit-the-roastery" },
      { label: "Careers", href: "/careers" },
      { label: "Wholesale", href: "/wholesale" }
    ]
  },
  {
    title: "Help",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
      { label: "Contact", href: "/contact" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" }
    ]
  }
];
