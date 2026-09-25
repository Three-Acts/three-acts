/**
 * Cross-collection reference keys shared by every seed file, so references
 * (articles.author → authors.slug, orders.customerEmail → customers.email, …)
 * always resolve. Seed files must only reference keys listed here.
 *
 * Demo brand: "Three Acts" — the template selling itself. The public site is
 * the template's own site: the shop sells the template's pieces (apps,
 * packages, page modules, themes, integrations, licences, services), the
 * journal is engineering and design notes about building client sites with
 * it, and the FAQs, testimonials and forms are about buying and using it.
 * Nothing here is a fictitious third-party business.
 */

export const seedBrand = {
  name: "Three Acts",
  domain: "threeacts.dev",
  city: "Cape Town",
  country: "South Africa",
  currency: "USD"
} as const;

/** authors.slug (owned by content seed): the team that builds the template. */
export const authorSlugs = ["nico-de-wet", "thandi-mokoena", "sarah-lindqvist", "kabelo-sithole", "maya-rosenberg", "daniel-okoye", "lena-fischer", "ruben-adams"] as const;

/** article-categories.slug (owned by content seed). */
export const articleCategorySlugs = ["guides", "architecture", "design-system", "cms", "release-notes", "case-studies"] as const;

/** product-categories.slug (owned by shop seed). */
export const productCategorySlugs = ["apps", "packages", "modules", "themes", "integrations", "licenses", "services", "bundles"] as const;

/**
 * products.slug (owned by shop seed). Content (articles/testimonials) and site
 * (redirects, page settings) seeds may reference these. The shop seed may add
 * more generated products but must include every slug listed here.
 */
export const productSlugs = [
  "web-app",
  "cms-app",
  "api-app",
  "content-package",
  "ecommerce-package",
  "auth-package",
  "forms-package",
  "storefront-module",
  "journal-module",
  "forms-module",
  "account-module",
  "wireframe-theme",
  "supabase-data-store",
  "vercel-deploy-integration",
  "single-site-license",
  "agency-license",
  "complete-template-bundle",
  "setup-service"
] as const;

/** Static site routes (owned by site seed via page-settings). */
export const staticPagePaths = ["/", "/about", "/shop", "/blog", "/contact", "/faq", "/agencies", "/docs", "/licenses", "/refunds", "/terms", "/privacy", "/careers", "/changelog"] as const;
