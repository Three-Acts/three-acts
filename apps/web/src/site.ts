export type NavLink = { label: string; href: string };

export type FooterNavGroup = { title: string; links: NavLink[] };

export type OpeningHours = { days: string; hours: string };

/**
 * Brand fallbacks for the Three Acts template's own site — the template
 * selling itself. These mirror the organisation JSON-LD in
 * `packages/cms-schema/src/seed/site.ts` so the layout renders sensible
 * chrome even when the API returns no `site-settings` record. `lib/seo.ts`
 * and `page-meta` read `name`/`url`/`description`/`defaultImage`/`locale`/
 * `twitter` — keep those keys stable. A client fork edits this file.
 */
export const site = {
  name: "Three Acts",
  // `site` from astro.config.mjs (sourced from VITE_SITE_URL at build time,
  // derived from the Vercel project on production, or thrown on a
  // misconfigured production build — see astro.config.mjs `resolveSiteUrl`).
  url: import.meta.env.SITE.replace(/\/+$/, ""),
  description:
    "A static-first client website template: an Astro site, a private CMS and an API bridge, with a storefront, journal, forms and accounts built in. Fork it, configure the registry, ship.",
  /** Local raster (compressed to AVIF at build) used as the default social image. */
  defaultImage: "/og-default.png",
  locale: "en_US",
  twitter: "@threeacts",
  email: "hello@threeacts.dev",
  phone: "+27 21 000 0000",
  phoneHref: "+27210000000",
  address: {
    street: "Woodstock Exchange, 66 Albert Road",
    locality: "Woodstock, Cape Town",
    postalCode: "7925",
    region: "Western Cape",
    country: "South Africa"
  },
  /** Support hours (SAST). */
  hours: [
    { days: "Monday – Friday", hours: "9:00 – 17:00 SAST" },
    { days: "Weekends", hours: "Email only" }
  ],
  social: [
    { label: "GitHub", href: "https://github.com/Three-Acts" },
    { label: "X", href: "https://x.com/threeacts" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/threeacts" }
  ]
} as const;

/** Public primary navigation, decoupled from the page files so content routes can appear too. */
export const navLinks: NavLink[] = [
  { label: "Shop", href: "/shop" },
  { label: "Journal", href: "/blog" },
  { label: "Docs", href: "/docs" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Agencies", href: "/agencies" },
  { label: "Contact", href: "/contact" }
];

/** Footer nav columns: Shop / Journal / Company / Help. */
export const footerNav: FooterNavGroup[] = [
  {
    title: "Shop",
    links: [
      { label: "Everything", href: "/shop" },
      { label: "Apps", href: "/shop/category/apps" },
      { label: "Packages", href: "/shop/category/packages" },
      { label: "Modules", href: "/shop/category/modules" },
      { label: "Themes", href: "/shop/category/themes" },
      { label: "Integrations", href: "/shop/category/integrations" },
      { label: "Licences", href: "/shop/category/licenses" },
      { label: "Services", href: "/shop/category/services" },
      { label: "Bundles", href: "/shop/category/bundles" }
    ]
  },
  {
    title: "Journal",
    links: [
      { label: "All posts", href: "/blog" },
      { label: "Guides", href: "/blog/category/guides" },
      { label: "Architecture", href: "/blog/category/architecture" },
      { label: "Release notes", href: "/blog/category/release-notes" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Docs", href: "/docs" },
      { label: "Changelog", href: "/changelog" },
      { label: "Careers", href: "/careers" },
      { label: "Agencies", href: "/agencies" }
    ]
  },
  {
    title: "Help",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Licences", href: "/licenses" },
      { label: "Refunds", href: "/refunds" },
      { label: "Contact", href: "/contact" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" }
    ]
  }
];
