/**
 * Cross-collection reference keys shared by every seed file, so references
 * (articles.author → authors.slug, orders.customerEmail → customers.email, …)
 * always resolve. Seed files must only reference keys listed here.
 *
 * Demo brand: "Fynbos & Fire" — a Cape Town specialty coffee roaster that sells
 * beans, brewing gear and merch online and publishes a brewing journal.
 */

export const seedBrand = {
  name: "Fynbos & Fire",
  domain: "fynbosandfire.co.za",
  city: "Cape Town",
  country: "South Africa",
  currency: "ZAR"
} as const;

/** authors.slug (owned by content seed). */
export const authorSlugs = ["lindiwe-khumalo", "pieter-van-wyk", "ama-mensah", "jordan-le-roux", "zanele-ndlovu", "marco-ferreira", "fatima-patel", "sam-okafor"] as const;

/** article-categories.slug (owned by content seed). */
export const articleCategorySlugs = ["brew-guides", "origins", "gear-reviews", "recipes", "roastery-news", "sustainability"] as const;

/** product-categories.slug (owned by shop seed). */
export const productCategorySlugs = ["single-origin", "blends", "decaf", "brewers", "grinders", "accessories", "merch", "gift-sets"] as const;

/**
 * products.slug (owned by shop seed). Content (articles/testimonials) and site
 * (redirects, page settings) seeds may reference these. The shop seed may add
 * more generated products but must include every slug listed here.
 */
export const productSlugs = [
  "ethiopia-yirgacheffe-kochere",
  "kenya-nyeri-gatomboya",
  "colombia-huila-la-esperanza",
  "rwanda-huye-mountain",
  "brazil-cerrado-natural",
  "house-espresso-blend",
  "table-mountain-filter-blend",
  "swiss-water-decaf-peru",
  "v60-ceramic-dripper",
  "chemex-six-cup",
  "aeropress-go",
  "comandante-c40-grinder",
  "baratza-encore-esp",
  "gooseneck-kettle-900ml",
  "digital-brew-scale",
  "enamel-camp-mug",
  "roastery-tote-bag",
  "brew-at-home-gift-set"
] as const;

/** Static site routes (owned by site seed via page-settings). */
export const staticPagePaths = ["/", "/about", "/shop", "/blog", "/contact", "/faq", "/wholesale", "/subscriptions", "/shipping", "/returns", "/terms", "/privacy", "/careers", "/visit-the-roastery"] as const;
