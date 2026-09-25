import { collectionRegistry } from "../registry";
import { serializeFileValue, serializeVideoValue } from "../files";
import { serializeImageGallery, serializeImageValue, parseImageGallery } from "../images";
import type { CmsRecord, CmsRecordValue, PublishStatus } from "../types";
import { productCategorySlugs, productSlugs, seedBrand } from "./keys";
import { createRandom, daysAgo, seedNow, seedRecord, type SeedCollections } from "./types";

/**
 * Shop seed for "Three Acts": the template selling its own pieces — apps,
 * packages, modules, themes, integrations, licences, services and bundles —
 * as digital products, priced in USD. A catalogue of ~40 products, 150
 * customers (mostly agencies/freelancers/product teams worldwide), 400
 * orders over the last 12 months (Black Friday/Cyber Monday spike),
 * reviews, testimonials and the discount codes those orders redeemed.
 *
 * Everything derived (customer order aggregates, discount `timesUsed`, order
 * money) is computed from the generated orders so the collections agree.
 *
 * Money model (orders): every product is a digital download, so this mirrors
 * `@three-acts/ecommerce`'s `shopConfig` exactly — `vatRate` and every
 * `shipping` rate are `0`. An order's `subtotal` therefore equals its gross
 * merchandise total, `discountTotal` comes off that, `taxTotal` and
 * `shippingTotal` are always `0`, and `total = subtotal − discount` exact to
 * the cent. A customer's `lifetimeValue` is the sum of totals of their orders
 * with paymentStatus "paid"; `totalOrders` counts all their orders.
 */

type Values = Record<string, CmsRecordValue>;

const DAY = 86_400_000;
const nowMs = seedNow.getTime();
const rand = createRandom(0x5eed_c0ff);

function int(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function chance(p: number): boolean {
  return rand() < p;
}
function weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;
  for (const [value, w] of entries) {
    roll -= w;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1][0];
}
const iso = (ms: number) => new Date(ms).toISOString();
const money = (cents: number) => Math.round(cents) / 100;

/** Fills every registry field the record didn't set with the API's normalized empty value. */
function complete(collectionId: string, values: Values): Values {
  const collection = collectionRegistry.find((c) => c.id === collectionId);
  if (!collection) throw new Error(`Unknown collection ${collectionId}`);
  const out: Values = {};
  for (const field of collection.fields) {
    const given = values[field.key];
    if (given !== undefined) {
      out[field.key] = given;
    } else if (field.type === "number") {
      out[field.key] = 0;
    } else if (field.type === "boolean") {
      out[field.key] = false;
    } else if (field.type === "image-gallery") {
      out[field.key] = "[]";
    } else {
      out[field.key] = "";
    }
  }
  for (const key of Object.keys(values)) {
    if (!(key in out)) throw new Error(`${collectionId}: unknown field "${key}"`);
  }
  return out;
}

function gallery(slug: string, title: string, count: number): string {
  return serializeImageGallery(
    Array.from({ length: count }, (_, i) => ({
      src: `https://picsum.photos/seed/${slug}-${i + 1}/1200/1200`,
      fileName: `${slug}-${i + 1}.jpg`,
      width: 1200,
      height: 1200,
      alt: i === 0 ? title : `${title} — screen ${i + 1}`
    }))
  );
}

// --- Product categories ------------------------------------------------------

const categoryCopy: Record<(typeof productCategorySlugs)[number], { name: string; description: string }> = {
  apps: {
    name: "Apps",
    description: "The three deployable applications the template ships: the public Astro site, the private CMS workspace, and the API app that bridges them both."
  },
  packages: {
    name: "Packages",
    description: "The framework-agnostic domain packages — content, ecommerce, auth and forms — plus the shared schema and utility packages every app is built on."
  },
  modules: {
    name: "Modules",
    description: "Page-level feature modules: storefront, journal, forms, account, FAQ, SEO and more, each wired to its matching package and ready to drop into a page."
  },
  themes: {
    name: "Themes",
    description: "Complete visual skins for the public site — swap tokens, typography and component styling without touching the underlying markup or logic."
  },
  integrations: {
    name: "Integrations",
    description: "Provider implementations for the Data Store, Blob Store, deploy hook, payments and email interfaces — Supabase, Neon, Vercel, Stripe, PayFast, Cloudflare R2, Resend and more."
  },
  licenses: {
    name: "Licenses",
    description: "Usage rights for the template itself, from a single production site to unlimited agency use."
  },
  services: {
    name: "Services",
    description: "Hands-on help from the team that builds the template: setup, migration, ongoing support and training."
  },
  bundles: {
    name: "Bundles",
    description: "Curated packs of apps, packages, modules, a theme and a licence at a lower combined price than buying each piece separately."
  }
};

const productCategoryRecords: CmsRecord[] = productCategorySlugs.map((slug, index) =>
  seedRecord({
    id: `category-${slug}`,
    createdAt: daysAgo(520 - index * 3),
    modifiedAt: daysAgo(90 - index * 4),
    values: complete("product-categories", {
      name: categoryCopy[slug].name,
      slug,
      description: categoryCopy[slug].description,
      image: serializeImageValue({
        src: `https://picsum.photos/seed/category-${slug}/1600/900`,
        fileName: `category-${slug}.jpg`,
        width: 1600,
        height: 900,
        alt: `${categoryCopy[slug].name} — Three Acts`
      }),
      sortOrder: (index + 1) * 10
    })
  })
);

// --- Products ----------------------------------------------------------------

type Category = (typeof productCategorySlugs)[number];
type Availability = "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "discontinued";

type ProductDef = {
  slug: string;
  title: string;
  sku: string;
  category: Category;
  price: number;
  compareAtPrice?: number;
  inventory: number;
  availability: Availability;
  short: string;
  description: string;
  images: number;
  tags: string;
  featured?: boolean;
  spec?: { fileName: string; size: number };
  video?: { fileName: string; size: number };
  /** Relative popularity in orders. */
  popularity?: number;
  createdDaysAgo: number;
  modifiedDaysAgo?: number;
  status?: PublishStatus;
  /** For a draft of an already-live product: the older live snapshot differs by these values. */
  liveOverrides?: Values;
};

function def(input: {
  slug: string;
  title: string;
  sku: string;
  category: Category;
  price: number;
  compareAtPrice?: number;
  inventory?: number;
  availability?: Availability;
  short: string;
  description: string;
  images?: number;
  tags: string;
  featured?: boolean;
  spec?: { fileName: string; size: number };
  video?: { fileName: string; size: number };
  popularity?: number;
  createdDaysAgo: number;
  modifiedDaysAgo?: number;
  status?: PublishStatus;
  liveOverrides?: Values;
}): ProductDef {
  return { inventory: 999, availability: "in_stock", images: 2, popularity: 1, ...input };
}

/** kind used to pick review/testimonial copy — services read very differently from everything else, which is delivered as a repo/download. */
function kindOf(category: Category): "digital" | "service" {
  return category === "services" ? "service" : "digital";
}

// --- Apps ---

const appDefs: ProductDef[] = [
  def({
    slug: "web-app",
    title: "Web App (Astro Static Site)",
    sku: "TA-APP-WEB",
    category: "apps",
    price: 149,
    compareAtPrice: 189,
    short: "The public Astro site: static-first pages, React islands only where interaction is required, and the storefront/blog/account routes wired to the API.",
    description:
      "The core of the template — an Astro app that prerenders to zero-JS static HTML by default, with React islands hydrated individually where a page genuinely needs interactivity. Ships the full public route set: home, shop, blog, FAQ, contact, account, cart and checkout.\n\nRequires Node 20+ and the rest of the monorepo's workspace tooling (npm workspaces, TypeScript 5). Runs standalone against mock content with zero configuration, or against the API app's public content route for a live build.\n\nWhat you get: a private GitHub repo invite scoped to `apps/web`, the docs, and updates for the version line you're on. Current version: 4.2.0.",
    images: 3,
    tags: "astro,islands,seo,static",
    featured: true,
    video: { fileName: "web-app-overview.mp4", size: 21_204_880 },
    popularity: 8,
    createdDaysAgo: 480,
    modifiedDaysAgo: 15
  }),
  def({
    slug: "cms-app",
    title: "CMS App (Editorial Workspace)",
    sku: "TA-APP-CMS",
    category: "apps",
    price: 129,
    short: "A private, desktop-first React/Vite editorial workspace with a pluggable backend, publish workflow and Webflow-style record editing.",
    description:
      "The editorial workspace editors actually use: a compact, desktop-first collection browser and split-pane record editor, built on the shared collection registry so every field matches what the API validates.\n\nBacked by a pluggable `CmsBackend` — `mock` runs entirely in the browser with no server, `rest` talks to the API app's REST bridge. Publish flips queued records live and triggers a Vercel deploy.\n\nWhat you get: a private GitHub repo invite scoped to `apps/cms`, the docs, and updates for the version line you're on. Current version: 3.6.1.",
    images: 3,
    tags: "cms,react,vite,editorial",
    featured: true,
    video: { fileName: "cms-app-walkthrough.mp4", size: 18_804_112 },
    popularity: 5,
    createdDaysAgo: 470,
    modifiedDaysAgo: 20
  }),
  def({
    slug: "api-app",
    title: "API App (Vercel Functions)",
    sku: "TA-APP-API",
    category: "apps",
    price: 129,
    short: "Vercel serverless functions and a matching local dev server: auth, shop, forms, CMS routes and the public content route.",
    description:
      "The privileged bridge every browser write and every auth call goes through. Sign-up/sign-in/session/account, the shop (products, reviews, discounts, checkout, orders), form submissions, redirects, uploads and Vercel publish orchestration — all in one deployable app.\n\nShips with a File Data Store and an in-process Memory store for zero-config local development; Supabase is an included persistent Data Store/Blob Store implementation.\n\nWhat you get: a private GitHub repo invite scoped to `apps/api`, the route reference, and updates for the version line you're on. Current version: 3.9.0.",
    images: 2,
    tags: "api,vercel,auth,checkout",
    spec: { fileName: "api-app-route-reference.pdf", size: 512_004 },
    popularity: 5,
    createdDaysAgo: 470,
    modifiedDaysAgo: 18
  })
];

// --- Packages ---

const packageDefs: ProductDef[] = [
  def({
    slug: "content-package",
    title: "Content Package",
    sku: "TA-PKG-CONTENT",
    category: "packages",
    price: 59,
    short: "Typed read models and a fetch client for editorial collections, with a seed-backed fetch implementation for zero-config builds.",
    description:
      "`@three-acts/content`: typed models and a fetch client for articles, authors, categories, FAQs, testimonials and site/page settings, consumed through the API's public content route.\n\nShips a `createSeedContentFetch` implementation so a build runs the same client code against the shared seed with no server at all — useful for a lightweight fork with no CMS.\n\nWhat you get: a private GitHub repo invite scoped to `packages/content`, the docs, and updates for the version line you're on. Current version: 2.3.0.",
    tags: "content,typescript,fetch-client",
    popularity: 3,
    createdDaysAgo: 460,
    modifiedDaysAgo: 40
  }),
  def({
    slug: "ecommerce-package",
    title: "Ecommerce Package",
    sku: "TA-PKG-ECOMMERCE",
    category: "packages",
    price: 79,
    compareAtPrice: 99,
    short: "Product/order/customer models, VAT/shipping/discount pricing, a storage-agnostic cart store, and the shop API contract.",
    description:
      "`@three-acts/ecommerce`: the models and pure pricing functions behind the storefront (this catalogue included). `shopConfig` is the one file a fork edits to retarget currency, tax, shipping and order numbering — nothing else hardcodes those values.\n\nThe cart store is storage-agnostic (persists to `localStorage` in the browser) so it survives navigation between static pages.\n\nWhat you get: a private GitHub repo invite scoped to `packages/ecommerce`, the docs, and updates for the version line you're on. Current version: 2.5.0.",
    tags: "ecommerce,pricing,cart,typescript",
    popularity: 4,
    createdDaysAgo: 460,
    modifiedDaysAgo: 10
  }),
  def({
    slug: "auth-package",
    title: "Auth Package",
    sku: "TA-PKG-AUTH",
    category: "packages",
    price: 59,
    short: "Session and user models, a storage-agnostic session store, a sign-up/sign-in client, and server-only token signing and password hashing.",
    description:
      "`@three-acts/auth`: everything the API and CMS share for authentication — session/user models on the client side, and (via `./server`) signed session tokens and password hashing on the server side.\n\nScopes a session to either the Storefront or the Editorial Workspace, never both, and never puts a password hash anywhere a `customers` CMS record could expose it.\n\nWhat you get: a private GitHub repo invite scoped to `packages/auth`, the docs, and updates for the version line you're on. Current version: 2.1.0.",
    tags: "auth,sessions,typescript",
    popularity: 3,
    createdDaysAgo: 455,
    modifiedDaysAgo: 50
  }),
  def({
    slug: "forms-package",
    title: "Forms Package",
    sku: "TA-PKG-FORMS",
    category: "packages",
    price: 39,
    short: "The contact/newsletter/inquiry form contract, validation, lead scoring, and a submission hook.",
    description:
      "`@three-acts/forms`: a small, focused package covering the three public form types — contact, newsletter, inquiry — with shared validation and a lead-scoring function the API applies before writing a `form-submissions` record.\n\nWhat you get: a private GitHub repo invite scoped to `packages/forms`, the docs, and updates for the version line you're on. Current version: 1.8.0.",
    images: 1,
    tags: "forms,validation,typescript",
    popularity: 2,
    createdDaysAgo: 450,
    modifiedDaysAgo: 60
  }),
  def({
    slug: "cms-schema-package",
    title: "CMS Schema Package",
    sku: "TA-PKG-SCHEMA",
    category: "packages",
    price: 69,
    short: "The provider-neutral collection registry, field types, typed errors, REST wire contract and column-mapping helpers behind the CMS.",
    description:
      "`@three-acts/cms-schema`: the single source of truth for every table the CMS, API and schema tooling know about. Add, remove or retype a collection here and the database schema/migrations, the editor UI and the REST bridge all follow.\n\nIncludes the schema-diff tooling that turns a registry change into reviewable `CREATE TABLE`/`ALTER TABLE` SQL against a committed snapshot.\n\nWhat you get: a private GitHub repo invite scoped to `packages/cms-schema`, the docs, and updates for the version line you're on. Current version: 3.0.0.",
    tags: "cms,schema,typescript",
    popularity: 2,
    createdDaysAgo: 445,
    modifiedDaysAgo: 12
  }),
  def({
    slug: "utils-package",
    title: "Utils Package",
    sku: "TA-PKG-UTILS",
    category: "packages",
    price: 29,
    short: "Shared, provider-neutral utility helpers — `cn`, `clsx`, `cv` and friends — used across every app.",
    description:
      "`@three-acts/utils`: the small, dependency-light helpers every app in the monorepo imports instead of re-inventing. No provider or framework assumptions baked in.\n\nWhat you get: a private GitHub repo invite scoped to `packages/utils`, the docs, and updates for the version line you're on. Current version: 1.4.0.",
    images: 1,
    tags: "utils,typescript",
    popularity: 1,
    createdDaysAgo: 500,
    modifiedDaysAgo: 100
  })
];

// --- Modules ---

const moduleDefs: ProductDef[] = [
  def({
    slug: "storefront-module",
    title: "Storefront Module",
    sku: "TA-MOD-STOREFRONT",
    category: "modules",
    price: 79,
    short: "Shop, cart, checkout and account UI, pre-wired to the Ecommerce Package and the API app's shop routes.",
    description:
      "The page-level UI layer over `ecommerce-package`: product grid and detail pages, cart and checkout client routes, order history, and the add-to-cart/review-form islands.\n\nRequires `ecommerce-package` and `api-app` (or an equivalent shop backend implementing the same contract).\n\nWhat you get: a private GitHub repo invite scoped to the storefront views/components, the docs, and updates for the version line you're on. Current version: 2.2.0.",
    tags: "storefront,cart,checkout,react",
    featured: true,
    popularity: 5,
    createdDaysAgo: 440,
    modifiedDaysAgo: 25
  }),
  def({
    slug: "journal-module",
    title: "Journal Module",
    sku: "TA-MOD-JOURNAL",
    category: "modules",
    price: 49,
    short: "Blog listing, detail, category and author pages, wired to the Content Package's typed read models.",
    description:
      "Everything the public site needs to run an editorial blog: `/blog`, `/blog/[slug]`, `/blog/category/[slug]`, `/authors/[slug]`, with byline, reading time, related-article and featured-article logic already built.\n\nRequires `content-package`.\n\nWhat you get: a private GitHub repo invite scoped to the journal views/components, the docs, and updates for the version line you're on. Current version: 2.0.0.",
    tags: "blog,journal,react",
    popularity: 3,
    createdDaysAgo: 435,
    modifiedDaysAgo: 45
  }),
  def({
    slug: "forms-module",
    title: "Forms Module",
    sku: "TA-MOD-FORMS",
    category: "modules",
    price: 39,
    short: "Contact, newsletter and inquiry form islands, pre-wired to the Forms Package and its submission endpoint.",
    description:
      "Drop-in Astro islands for every public form type, with client-side validation mirroring the Forms Package's server-side rules and a honeypot field baked in.\n\nRequires `forms-package`.\n\nWhat you get: a private GitHub repo invite scoped to the form islands, the docs, and updates for the version line you're on. Current version: 1.6.0.",
    images: 1,
    tags: "forms,contact,newsletter",
    popularity: 2,
    createdDaysAgo: 430,
    modifiedDaysAgo: 55
  }),
  def({
    slug: "account-module",
    title: "Account Module",
    sku: "TA-MOD-ACCOUNT",
    category: "modules",
    price: 49,
    short: "Sign-in, sign-up, profile edit and order-history UI for the client-rendered account routes.",
    description:
      "The client routes that need live data at runtime: `/sign-in`, `/sign-up`, `/account`, each server-rendering a static SEO shell before hydrating and calling the API.\n\nRequires `auth-package` and, for order history, `ecommerce-package`.\n\nWhat you get: a private GitHub repo invite scoped to the account views/components, the docs, and updates for the version line you're on. Current version: 1.9.0.",
    tags: "account,auth,orders",
    popularity: 2,
    createdDaysAgo: 425,
    modifiedDaysAgo: 35
  }),
  def({
    slug: "faq-module",
    title: "FAQ Module",
    sku: "TA-MOD-FAQ",
    category: "modules",
    price: 29,
    short: "A topic-grouped FAQ page with FAQPage JSON-LD, reading straight from the FAQs collection.",
    description:
      "Renders `/faq` grouped by topic with the right structured data for search results, and can be embedded on individual product pages for product-specific questions.\n\nWhat you get: a private GitHub repo invite scoped to the FAQ view/component, the docs, and updates for the version line you're on. Current version: 1.3.0.",
    images: 1,
    tags: "faq,seo,json-ld",
    popularity: 1,
    createdDaysAgo: 400,
    modifiedDaysAgo: 90
  }),
  def({
    slug: "seo-module",
    title: "SEO Module",
    sku: "TA-MOD-SEO",
    category: "modules",
    price: 39,
    short: "Per-page SEO, sitemap, robots.txt and llms.txt metadata plumbing with sane fallbacks.",
    description:
      "Centralizes per-page SEO + AEO metadata (JSON-LD, sitemap entries, `robots.txt`, `llms.txt`) so a fork configures fallback chains once instead of duplicating meta tags across every page.\n\nWhat you get: a private GitHub repo invite scoped to the SEO metadata layer, the docs, and updates for the version line you're on. Current version: 1.5.0.",
    images: 1,
    tags: "seo,sitemap,aeo",
    popularity: 1,
    createdDaysAgo: 395,
    modifiedDaysAgo: 70
  }),
  def({
    slug: "auth-ui-module",
    title: "Auth UI Module",
    sku: "TA-MOD-AUTHUI",
    category: "modules",
    price: 39,
    short: "The sign-in/sign-up form shell and session-aware navigation state, pairing with the Auth Package.",
    description:
      "A thinner alternative to the full Account Module for a fork that only needs sign-in/sign-up, not order history — the form shell, error states and session-aware header/nav.\n\nRequires `auth-package`.\n\nWhat you get: a private GitHub repo invite scoped to the auth UI components, the docs, and updates for the version line you're on. Current version: 1.2.0.",
    images: 1,
    tags: "auth,sign-in,sign-up",
    popularity: 1,
    createdDaysAgo: 380,
    modifiedDaysAgo: 65
  }),
  def({
    slug: "search-module",
    title: "Search Module",
    sku: "TA-MOD-SEARCH",
    category: "modules",
    price: 59,
    inventory: 0,
    availability: "preorder",
    short: "Sitewide search across products and articles. In active development — pre-order to be notified the moment it ships.",
    description:
      "A sitewide search box indexing products and articles client-side, with keyboard navigation and category filtering. Currently in development against the Content and Ecommerce packages' read models.\n\nPre-orders are charged now and the module ships to every pre-order buyer the day it's released, at no extra cost for point releases.\n\nWhat you get on release: a private GitHub repo invite scoped to the search module, the docs, and updates for the version line you're on.",
    images: 1,
    tags: "search,upcoming",
    popularity: 1,
    status: "queued_to_publish",
    createdDaysAgo: 25,
    modifiedDaysAgo: 20
  }),
  def({
    slug: "changelog-module",
    title: "Changelog Module",
    sku: "TA-MOD-CHANGELOG",
    category: "modules",
    price: 29,
    short: "A versioned /changelog page reading release notes straight from the CMS.",
    description:
      "Renders the public `/changelog` route from a simple release-notes collection — one record per version, grouped by month, with an RSS feed for anyone who wants to subscribe.\n\nWhat you get: a private GitHub repo invite scoped to the changelog view/component, the docs, and updates for the version line you're on. Current version: 1.1.0.",
    images: 1,
    tags: "changelog,versioning",
    popularity: 1,
    createdDaysAgo: 300,
    modifiedDaysAgo: 80
  }),
  def({
    slug: "docs-module",
    title: "Docs Module",
    sku: "TA-MOD-DOCS",
    category: "modules",
    price: 49,
    short: "Versioned documentation pages with sidebar navigation, reading straight from Markdown in the repo.",
    description:
      "Renders `/docs` from Markdown files in the repo rather than the CMS, so documentation can live alongside the code it documents and ship through the same pull request.\n\nWhat you get: a private GitHub repo invite scoped to the docs module, the docs (yes, for the docs module), and updates for the version line you're on. Current version: 1.7.0.",
    tags: "docs,versioned",
    popularity: 1,
    createdDaysAgo: 290,
    modifiedDaysAgo: 40
  }),
  def({
    slug: "legacy-blog-module",
    title: "Legacy Blog Module (v1)",
    sku: "TA-MOD-LEGACYBLOG",
    category: "modules",
    price: 39,
    inventory: 0,
    availability: "discontinued",
    short: "The original single-page blog module. Superseded by the Journal Module; kept here only for existing buyers' records.",
    description:
      "The first version of the blog module, before it split into listing/detail/category/author pages. Discontinued in favour of the Journal Module, which covers the same ground with proper pagination and structured data.\n\nNo new sales; existing buyers keep their repo access and can still request the source for reference.",
    images: 1,
    tags: "blog,legacy",
    popularity: 0,
    status: "not_published",
    createdDaysAgo: 500,
    modifiedDaysAgo: 145
  })
];

// --- Themes ---

const cloudflareR2LiveDescription =
  "The Blob Store implementation for Cloudflare R2 — S3-compatible object storage for CMS asset uploads.\n\nRequires an R2 bucket and its access keys in `apps/api/.env`.\n\nWhat you get: a private GitHub repo invite scoped to the R2 adapter, the setup docs, and updates for the version line you're on. Current version: 1.0.0.";

const themeDefs: ProductDef[] = [
  def({
    slug: "wireframe-theme",
    title: "Wireframe Theme",
    sku: "TA-THM-WIREFRAME",
    category: "themes",
    price: 59,
    short: "The default, deliberately unopinionated skin — paper-and-ink, minimal decoration, and the easiest theme to restyle from.",
    description:
      "The theme every fork starts from: neutral type, restrained color, no baked-in personality to fight. Every token lives in `theme.css`, so restyling never means touching component markup.\n\nWhat you get: the theme's token/CSS files, a private GitHub repo invite, and updates for the version line you're on. Current version: 3.0.0.",
    images: 3,
    tags: "theme,wireframe,minimal",
    featured: true,
    popularity: 6,
    createdDaysAgo: 510,
    modifiedDaysAgo: 30
  }),
  def({
    slug: "editorial-theme",
    title: "Editorial Theme",
    sku: "TA-THM-EDITORIAL",
    category: "themes",
    price: 79,
    short: "A type-led, magazine-style theme for content-heavy sites — generous line length, pull quotes, a serif display face.",
    description:
      "Built for sites where the Journal Module carries the homepage: a serif display face, wide measure, and article-card treatments that read like a magazine rather than a SaaS landing page.\n\nWhat you get: the theme's token/CSS files, a private GitHub repo invite, and updates for the version line you're on. Current version: 1.4.0.",
    images: 3,
    tags: "theme,editorial,typography",
    popularity: 2,
    createdDaysAgo: 380,
    modifiedDaysAgo: 60
  }),
  def({
    slug: "studio-theme",
    title: "Studio Theme",
    sku: "TA-THM-STUDIO",
    category: "themes",
    price: 79,
    short: "A quiet, portfolio-leaning theme with generous whitespace and a monochrome-plus-one-accent palette.",
    description:
      "Designed for agencies showing off client work: large image grids, a monochrome base with a single configurable accent, and case-study-friendly long-form layouts.\n\nWhat you get: the theme's token/CSS files, a private GitHub repo invite, and updates for the version line you're on. Current version: 2.1.0.",
    tags: "theme,studio,portfolio",
    popularity: 2,
    status: "draft",
    liveOverrides: { price: 69 },
    createdDaysAgo: 350,
    modifiedDaysAgo: 3
  }),
  def({
    slug: "commerce-theme",
    title: "Commerce Theme",
    sku: "TA-THM-COMMERCE",
    category: "themes",
    price: 89,
    compareAtPrice: 109,
    short: "A shop-forward theme tuned for product grids, compare-at pricing and a fast, sticky checkout flow.",
    description:
      "Optimized for the Storefront Module: denser product grids, prominent price/compare-at treatment, and a checkout layout that keeps the order summary visible on scroll.\n\nWhat you get: the theme's token/CSS files, a private GitHub repo invite, and updates for the version line you're on. Current version: 1.6.0.",
    images: 3,
    tags: "theme,commerce,shop",
    popularity: 2,
    createdDaysAgo: 320,
    modifiedDaysAgo: 50
  }),
  def({
    slug: "classic-theme",
    title: "Classic Theme (v1)",
    sku: "TA-THM-CLASSIC",
    category: "themes",
    price: 49,
    inventory: 0,
    availability: "discontinued",
    short: "The original launch theme. Superseded by the Wireframe Theme; kept here only for existing buyers' records.",
    description:
      "The template's very first theme, before the token system was pulled out into its own file. Discontinued in favour of the Wireframe Theme, which covers the same neutral starting point with a cleaner token structure.\n\nNo new sales; existing buyers keep their repo access.",
    images: 1,
    tags: "theme,legacy",
    popularity: 0,
    status: "not_published",
    createdDaysAgo: 500,
    modifiedDaysAgo: 160
  })
];

// --- Integrations ---

const integrationDefs: ProductDef[] = [
  def({
    slug: "supabase-data-store",
    title: "Supabase Integration",
    sku: "TA-INT-SUPABASE",
    category: "integrations",
    price: 49,
    short: "A Data Store and Blob Store implementation on Supabase Postgres and Storage — the most-used persistent backend.",
    description:
      "Implements the Data Store and Blob Store interfaces against a Supabase project: Postgres for CMS records, Storage for asset uploads. The default recommendation for a project that needs real persistence without running its own database.\n\nRequires a Supabase project, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env`.\n\nWhat you get: a private GitHub repo invite scoped to the Supabase adapter, the setup docs, and updates for the version line you're on. Current version: 2.4.0.",
    tags: "supabase,data-store,blob-store",
    featured: true,
    popularity: 5,
    createdDaysAgo: 470,
    modifiedDaysAgo: 20
  }),
  def({
    slug: "neon-data-store",
    title: "Neon Postgres Integration",
    sku: "TA-INT-NEON",
    category: "integrations",
    price: 49,
    short: "A Data Store implementation on Neon's serverless Postgres — branch-per-preview friendly.",
    description:
      "Implements the Data Store interface against Neon: serverless Postgres with instant branching, useful for a project that wants a database branch per pull-request preview.\n\nRequires a Neon project and its connection string in `apps/api/.env`.\n\nWhat you get: a private GitHub repo invite scoped to the Neon adapter, the setup docs, and updates for the version line you're on. Current version: 1.2.0.",
    images: 1,
    tags: "neon,postgres,data-store",
    popularity: 2,
    createdDaysAgo: 200,
    modifiedDaysAgo: 30
  }),
  def({
    slug: "postgres-integration",
    title: "Plain Postgres Integration",
    sku: "TA-INT-POSTGRES",
    category: "integrations",
    price: 39,
    inventory: 0,
    availability: "preorder",
    short: "A packaged Data Store adapter for any plain Postgres instance. The interface is documented today; the packaged adapter is still being finalized.",
    description:
      "The Data Store interface already supports plain Postgres (via `pg` or Drizzle) by implementing it yourself, documented in the schema README. This product packages that implementation as a drop-in adapter instead of a from-scratch build.\n\nPre-order to get it the day it ships, at the pre-order price.\n\nWhat you get on release: a private GitHub repo invite scoped to the Postgres adapter and the setup docs.",
    images: 1,
    tags: "postgres,data-store,upcoming",
    popularity: 1,
    createdDaysAgo: 60,
    modifiedDaysAgo: 40
  }),
  def({
    slug: "vercel-deploy-integration",
    title: "Vercel Deploy Integration",
    sku: "TA-INT-VERCEL",
    category: "integrations",
    price: 39,
    short: "The deploy-hook and status-polling wiring behind the CMS's Publish button.",
    description:
      "Implements `POST /api/deploy` and `GET /api/deploy-status`: triggers a Vercel Deploy Hook and normalizes deployment state so the CMS can show queued → building → deployed progress.\n\nRequires `VERCEL_DEPLOY_HOOK_URL`, `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` in `apps/api/.env`.\n\nWhat you get: a private GitHub repo invite scoped to the deploy routes, the setup docs, and updates for the version line you're on. Current version: 1.3.0.",
    images: 1,
    tags: "vercel,deploy",
    popularity: 2,
    createdDaysAgo: 460,
    modifiedDaysAgo: 15
  }),
  def({
    slug: "stripe-payments-integration",
    title: "Stripe Payments Integration",
    sku: "TA-INT-STRIPE",
    category: "integrations",
    price: 79,
    short: "A PaymentProvider implementation for card, Apple Pay and other Stripe-supported methods at checkout.",
    description:
      "Implements the `PaymentProvider` interface checkout charges through, backed by Stripe. Card and Apple Pay settle immediately server-side; the checkout route stays the same regardless of which provider is wired in.\n\nRequires a Stripe account and its API keys in `apps/api/.env`.\n\nWhat you get: a private GitHub repo invite scoped to the Stripe adapter, the setup docs, and updates for the version line you're on. Current version: 2.0.0.",
    tags: "stripe,payments",
    popularity: 3,
    createdDaysAgo: 300,
    modifiedDaysAgo: 25
  }),
  def({
    slug: "payfast-integration",
    title: "PayFast Payments Integration",
    sku: "TA-INT-PAYFAST",
    category: "integrations",
    price: 69,
    short: "A PaymentProvider implementation for PayFast, for a fork selling into the South African market.",
    description:
      "Implements the `PaymentProvider` interface against PayFast's redirect + ITN webhook flow, for a fork whose customers are primarily in South Africa.\n\nRequires a PayFast merchant account and its credentials in `apps/api/.env`.\n\nWhat you get: a private GitHub repo invite scoped to the PayFast adapter, the setup docs, and updates for the version line you're on. Current version: 1.1.0.",
    images: 1,
    tags: "payfast,payments",
    popularity: 1,
    createdDaysAgo: 280,
    modifiedDaysAgo: 90
  }),
  def({
    slug: "cloudflare-r2-integration",
    title: "Cloudflare R2 Blob Store Integration",
    sku: "TA-INT-R2",
    category: "integrations",
    price: 49,
    short: "A Blob Store implementation for Cloudflare R2 — S3-compatible object storage, billed with no egress fees.",
    description:
      "Implements the Blob Store interface against Cloudflare R2 for CMS asset uploads, an alternative to Supabase Storage for a fork already on Cloudflare's platform.\n\nRequires an R2 bucket, its access keys, and (for public assets) a configured custom domain in `apps/api/.env`.\n\nWhat you get: a private GitHub repo invite scoped to the R2 adapter, the setup docs, and updates for the version line you're on. Current version: 1.1.0.",
    images: 1,
    tags: "cloudflare,r2,blob-store",
    popularity: 1,
    status: "draft",
    liveOverrides: { price: 45, description: cloudflareR2LiveDescription },
    createdDaysAgo: 260,
    modifiedDaysAgo: 2
  }),
  def({
    slug: "resend-email-integration",
    title: "Resend Email Integration",
    sku: "TA-INT-RESEND",
    category: "integrations",
    price: 39,
    short: "A transactional-email provider implementation for order confirmations, password resets and form notifications.",
    description:
      "Wires Resend into every place the API app sends transactional email: order confirmations, password reset links, and staff notifications for new form submissions.\n\nRequires a Resend account and its API key in `apps/api/.env`.\n\nWhat you get: a private GitHub repo invite scoped to the Resend adapter, the setup docs, and updates for the version line you're on. Current version: 1.0.0.",
    images: 1,
    tags: "resend,email",
    popularity: 1,
    createdDaysAgo: 240,
    modifiedDaysAgo: 45
  })
];

// --- Licenses ---

const licenseDefs: ProductDef[] = [
  def({
    slug: "single-site-license",
    title: "Single-Site License",
    sku: "TA-LIC-SINGLE",
    category: "licenses",
    price: 249,
    short: "Use the template for one production site — your own project, or one client's.",
    description:
      "Covers a single production deployment. Fork it, rebrand it, ship it — the license doesn't expire and there's no recurring fee for that one site.\n\nDelivered as a signed license record and a receipt — no separate download; it governs the use of everything else you buy from Three Acts.",
    images: 1,
    tags: "license,single-site",
    popularity: 4,
    createdDaysAgo: 500,
    modifiedDaysAgo: 5
  }),
  def({
    slug: "agency-license",
    title: "Agency License",
    sku: "TA-LIC-AGENCY",
    category: "licenses",
    price: 799,
    short: "Use the template across unlimited client projects for one agency — the license most studios on this catalogue actually buy.",
    description:
      "Covers every client project one agency ships, with no per-site fee. Pays for itself after two or three client builds for most studios.\n\nDelivered as a signed license record and a receipt — no separate download; it governs the use of everything else the agency buys from Three Acts.",
    images: 1,
    tags: "license,agency",
    featured: true,
    popularity: 3,
    createdDaysAgo: 500,
    modifiedDaysAgo: 5
  }),
  def({
    slug: "unlimited-license",
    title: "Unlimited License",
    sku: "TA-LIC-UNLIMITED",
    category: "licenses",
    price: 1_999,
    short: "Unlimited sites, unlimited seats, plus a year of priority support baked in.",
    description:
      "The top tier: unlimited sites under any number of brands, unlimited team seats, and a year of priority support included (equivalent to the Support Retainer, at no extra cost).\n\nDelivered as a signed license record and a receipt — no separate download.",
    images: 1,
    tags: "license,unlimited,support",
    popularity: 1,
    createdDaysAgo: 250,
    modifiedDaysAgo: 60
  })
];

// --- Services ---

const serviceDefs: ProductDef[] = [
  def({
    slug: "setup-service",
    title: "Setup Service",
    sku: "TA-SVC-SETUP",
    category: "services",
    price: 1_200,
    inventory: 4,
    availability: "low_stock",
    short: "A 1:1 kickoff session: Supabase/Vercel/CMS configuration and your first deploy, done alongside you. Limited onboarding slots each month.",
    description:
      "Two hours live with the team plus follow-up async support: Data Store and Blob Store provider setup, CMS backend configuration, environment variables reviewed together, and your first production deploy watched end to end.\n\nDelivered as scheduled time with the team, not a download — you'll get a calendar invite after checkout. We only take a handful of setup sessions a month, so this occasionally sells out.",
    images: 1,
    spec: { fileName: "setup-service-agreement.pdf", size: 284_010 },
    tags: "service,setup,onboarding",
    popularity: 2,
    createdDaysAgo: 480,
    modifiedDaysAgo: 8
  }),
  def({
    slug: "migration-service",
    title: "Migration Service",
    sku: "TA-SVC-MIGRATION",
    category: "services",
    price: 900,
    inventory: 2,
    availability: "low_stock",
    short: "We migrate an existing site's content and catalogue into the template's CMS schema for you. A handful of slots per quarter.",
    description:
      "For a team moving off a legacy CMS or a hand-rolled site: we map your existing content model onto the Collection Registry, write the import scripts, and hand back a working CMS with your real data in it.\n\nDelivered as scheduled project work, not a download — timeline confirmed after a short discovery call.",
    images: 1,
    tags: "service,migration",
    popularity: 1,
    createdDaysAgo: 300,
    modifiedDaysAgo: 20
  }),
  def({
    slug: "support-retainer-service",
    title: "Support Retainer (Quarterly)",
    sku: "TA-SVC-RETAINER",
    category: "services",
    price: 349,
    short: "A quarter of priority support hours with the team — bug triage, upgrade help, and architecture questions answered fast.",
    description:
      "Priority access to the team for a quarter: faster response times on support questions, help with major-version upgrades, and a standing monthly office-hours call.\n\nDelivered as an ongoing arrangement, not a download — renews automatically unless cancelled before the quarter ends.",
    images: 1,
    tags: "service,support,retainer",
    popularity: 1,
    createdDaysAgo: 260,
    modifiedDaysAgo: 30
  }),
  def({
    slug: "training-workshop-service",
    title: "Training Workshop",
    sku: "TA-SVC-TRAINING",
    category: "services",
    price: 650,
    inventory: 0,
    availability: "out_of_stock",
    short: "A half-day live workshop for a client's dev team on the template's architecture and conventions. Sold out for the current cohort.",
    description:
      "A live, half-day session walking a team through the domain-package architecture, the CMS collection model, and the conventions that keep a fork upgrade-friendly — recorded for anyone who can't make it live.\n\nDelivered as scheduled time with the team, not a download. This cohort is sold out; the next date will be announced on the changelog.",
    images: 1,
    video: { fileName: "training-workshop-trailer.mp4", size: 9_004_112 },
    tags: "service,training,workshop",
    popularity: 1,
    createdDaysAgo: 150,
    modifiedDaysAgo: 10
  })
];

// --- Bundles ---

const bundleDefs: ProductDef[] = [
  def({
    slug: "complete-template-bundle",
    title: "Complete Template Bundle",
    sku: "TA-BUN-COMPLETE",
    category: "bundles",
    price: 499,
    compareAtPrice: 699,
    short: "Every app, every package, every module, the Wireframe theme and a single-site license — the whole template, one price.",
    description:
      "All three apps, all six packages, every module, the Wireframe theme, and a Single-Site License bundled together at a lower combined price than buying each piece separately. The starting point most solo developers and small studios actually buy.\n\nWhat you get: repo access to every piece listed above, plus the included license, delivered as separate GitHub repo invites.",
    images: 4,
    spec: { fileName: "complete-template-bundle-contents.pdf", size: 198_552 },
    video: { fileName: "complete-template-bundle-overview.mp4", size: 24_501_990 },
    tags: "bundle,complete,starter-kit",
    featured: true,
    popularity: 6,
    createdDaysAgo: 500,
    modifiedDaysAgo: 12
  }),
  def({
    slug: "starter-bundle",
    title: "Starter Bundle",
    sku: "TA-BUN-STARTER",
    category: "bundles",
    price: 199,
    short: "The web app, the Wireframe theme, the Content Package and a single-site license — the smallest complete stack for a lightweight site.",
    description:
      "For a project that only needs the lightweight path: the web app, the Wireframe theme, the Content Package, and a Single-Site License. No CMS, no API, no shop — add those later if the project grows into them.\n\nWhat you get: repo access to every piece listed above, plus the included license, delivered as separate GitHub repo invites.",
    tags: "bundle,starter",
    popularity: 3,
    createdDaysAgo: 400,
    modifiedDaysAgo: 35
  }),
  def({
    slug: "agency-bundle",
    title: "Agency Bundle",
    sku: "TA-BUN-AGENCY",
    category: "bundles",
    price: 1_499,
    compareAtPrice: 1_799,
    short: "Everything in the Complete Template Bundle, plus the Agency License and the Setup Service — the whole stack, ready for client work.",
    description:
      "Every piece in the Complete Template Bundle, upgraded to an Agency License, plus a Setup Service session to get the first client project off the ground fast.\n\nWhat you get: repo access to every piece listed above, plus the included license and a calendar invite for the setup session.",
    images: 3,
    tags: "bundle,agency",
    popularity: 2,
    createdDaysAgo: 350,
    modifiedDaysAgo: 7
  })
];

const productDefs: ProductDef[] = [...appDefs, ...packageDefs, ...moduleDefs, ...themeDefs, ...integrationDefs, ...licenseDefs, ...serviceDefs, ...bundleDefs];

function productValues(p: ProductDef): Values {
  return complete("products", {
    title: p.title,
    slug: p.slug,
    sku: p.sku,
    category: p.category,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? 0,
    currency: seedBrand.currency,
    inventory: p.inventory,
    availability: p.availability,
    shortDescription: p.short,
    description: p.description,
    images: gallery(p.slug, p.title, p.images),
    productVideo: p.video
      ? serializeVideoValue({ src: `https://cdn.${seedBrand.domain}/videos/${p.video.fileName}`, fileName: p.video.fileName, size: p.video.size, contentType: "video/mp4" })
      : "",
    specSheet: p.spec
      ? serializeFileValue({ src: `https://cdn.${seedBrand.domain}/docs/${p.spec.fileName}`, fileName: p.spec.fileName, size: p.spec.size, contentType: "application/pdf" })
      : "",
    weightGrams: 0,
    tags: p.tags,
    featured: p.featured ?? false
  });
}

const productRecords: CmsRecord[] = productDefs.map((p) => {
  const values = productValues(p);
  const status = p.status ?? "published";
  let liveValues: Values | null | undefined;
  if (status === "draft" && p.liveOverrides) {
    liveValues = { ...values, ...p.liveOverrides };
  }
  return seedRecord({
    id: `product-${p.slug}`,
    publishStatus: status,
    createdAt: daysAgo(p.createdDaysAgo),
    modifiedAt: daysAgo(Math.min(p.modifiedDaysAgo ?? p.createdDaysAgo, p.createdDaysAgo)),
    values,
    liveValues
  });
});

// --- Customers ---------------------------------------------------------------

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  optIn: boolean;
  weight: number;
  /** Agency/reseller account: buys licenses and services in bulk rather than a single product. */
  reseller: boolean;
  notes: string;
};

const firstNames = [
  "Thandiwe", "Sipho", "Lerato", "Themba", "Nomvula", "Kagiso", "Ayanda", "Bongani", "Palesa", "Lwazi",
  "Naledi", "Tshepo", "Zinhle", "Mandla", "Refilwe", "Nompumelelo", "Karabo", "Siyabonga", "Busisiwe", "Lungile",
  "Pieter", "Annelie", "Johan", "Marelize", "Hennie", "Elna", "Riaan", "Carien", "Wian", "Liezl",
  "Priya", "Rajesh", "Ayesha", "Yusuf", "Fatima", "Zaid", "Nadia", "Imran", "Shreya", "Kiran",
  "Emma", "James", "Sarah", "Michael", "Jessica", "Liam", "Chloé", "Daniel", "Megan", "Ryan",
  "Tamsin", "Craig", "Kayla", "Tristan", "Zoë", "Luca", "Amahle", "Kea", "Xolani", "Anathi"
] as const;

const lastNames = [
  "Dlamini", "Nkosi", "Mokoena", "Ndlovu", "Khumalo", "Mahlangu", "Zulu", "Mthembu", "Sithole", "Molefe",
  "Naidoo", "Pillay", "Govender", "Moodley", "Reddy", "Chetty", "Patel", "Essop", "Adams", "Jacobs",
  "van der Merwe", "Botha", "du Plessis", "Pretorius", "Venter", "Nel", "Joubert", "Coetzee", "le Roux", "Steyn",
  "Smith", "Williams", "O'Connor", "Fourie", "Kruger", "Meyer", "Hendricks", "Abrahams", "Petersen", "Daniels",
  "Mabuza", "Maseko", "Radebe", "Cele", "Shabalala", "Baloyi", "Makhanya", "Tshabalala", "Ferreira", "Gouws"
] as const;

/** [city, ISO-2 country, weight] — a global mix of the cities agencies/freelancers/product teams buying a dev template actually come from. */
const cities: ReadonlyArray<readonly [string, string, number]> = [
  ["Cape Town", "ZA", 10], ["Johannesburg", "ZA", 6],
  ["London", "GB", 14], ["Bristol", "GB", 4], ["Manchester", "GB", 4],
  ["Berlin", "DE", 10], ["Munich", "DE", 4],
  ["Amsterdam", "NL", 8], ["Rotterdam", "NL", 3],
  ["New York", "US", 16], ["San Francisco", "US", 12], ["Austin", "US", 8], ["Minneapolis", "US", 5], ["Seattle", "US", 6], ["Chicago", "US", 5],
  ["Toronto", "CA", 6], ["Vancouver", "CA", 3],
  ["Sydney", "AU", 8], ["Melbourne", "AU", 6],
  ["Stockholm", "SE", 5], ["Paris", "FR", 5], ["Lisbon", "PT", 4],
  ["São Paulo", "BR", 4], ["Nairobi", "KE", 3], ["Bangalore", "IN", 4], ["Tokyo", "JP", 3], ["Singapore", "SG", 3]
];

/** One representative postal code per city — real seeded data doesn't need street-level precision. */
const cityPostalCodes: Record<string, string> = {
  "Cape Town": "8001",
  Johannesburg: "2000",
  London: "EC1A 1BB",
  Bristol: "BS1 4DJ",
  Manchester: "M1 1AE",
  Berlin: "10115",
  Munich: "80331",
  Amsterdam: "1012 AB",
  Rotterdam: "3011 AD",
  "New York": "10001",
  "San Francisco": "94103",
  Austin: "73301",
  Minneapolis: "55401",
  Seattle: "98101",
  Chicago: "60601",
  Toronto: "M5H 2N2",
  Vancouver: "V6B 1A1",
  Sydney: "2000",
  Melbourne: "3000",
  Stockholm: "111 22",
  Paris: "75001",
  Lisbon: "1100-048",
  "São Paulo": "01310-100",
  Nairobi: "00100",
  Bangalore: "560001",
  Tokyo: "100-0001",
  Singapore: "018956"
};

const streetNames = [
  "Main Street", "Market Street", "High Street", "Broadway", "Station Road", "Mill Lane", "Park Avenue", "River Road",
  "Church Street", "King Street", "Queen Street", "Oxford Road", "Commerce Street", "Union Street", "Bridge Street", "Franklin Avenue"
];

function streetAddress(city: string): string {
  return `${int(1, 199)} ${pick(streetNames)}, ${city}`;
}

const emailDomains: ReadonlyArray<readonly [string, number]> = [
  ["gmail.com", 28], ["outlook.com", 10], ["icloud.com", 8], ["proton.me", 4],
  ["studio.io", 10], ["agency.dev", 8], ["build.co", 6], ["makers.studio", 6], ["ventures.io", 4], ["labs.dev", 6], ["digital.agency", 4], ["works.co", 4]
];

function emailLocal(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

const handCustomers: Array<Omit<Customer, "id">> = [
  // Agency/reseller accounts — heavy repeat buyers of licenses and services.
  { name: "Kloof Street Studio", email: "projects@kloofstreetstudio.co.za", phone: "+27 21 555 0187", address: "38 Kloof Street", city: "Cape Town", postalCode: "8001", country: "ZA", optIn: true, weight: 6, reseller: true, notes: "Agency partner account. Buys an agency-license renewal most quarters and bills client builds through us." },
  { name: "Bramblewood Digital", email: "hello@bramblewooddigital.com", phone: "+1 415 555 0133", address: "142 Valencia Street", city: "San Francisco", postalCode: "94103", country: "US", optIn: true, weight: 5, reseller: true, notes: "Agency partner — buys a single-site license per client engagement." },
  { name: "North Loop Studio", email: "studio@northloopstudio.com", phone: "+1 612 555 0199", address: "8 Washington Avenue N", city: "Minneapolis", postalCode: "55401", country: "US", optIn: false, weight: 3, reseller: true, notes: "" },
  { name: "Nordvik Studio", email: "team@nordvikstudio.se", phone: "+46 8 555 0120", address: "5 Sveavägen", city: "Stockholm", postalCode: "111 22", country: "SE", optIn: true, weight: 3, reseller: true, notes: "" },
  { name: "Osei Digital", email: "accounts@oseidigital.co.uk", phone: "+44 20 7946 0958", address: "22 Shoreditch High Street", city: "London", postalCode: "E1 6PJ", country: "GB", optIn: true, weight: 4, reseller: true, notes: "Agency partner; standing quarterly review call with support." }
];

const CUSTOMER_COUNT = 150;

const customers: Customer[] = (() => {
  const list: Customer[] = [];
  const emails = new Set<string>();
  const names = new Set<string>();
  handCustomers.forEach((c) => {
    emails.add(c.email);
    names.add(c.name);
    list.push({ ...c, id: "" });
  });
  while (list.length < CUSTOMER_COUNT) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const name = `${first} ${last}`;
    if (names.has(name)) continue;
    names.add(name);
    const f = emailLocal(first);
    const l = emailLocal(last);
    const domain = weighted(emailDomains);
    const pattern = int(0, 5);
    let local = pattern <= 2 ? `${f}.${l}` : pattern === 3 ? `${f}${l}` : pattern === 4 ? `${f[0]}${l}` : `${f}.${l}${int(70, 99)}`;
    while (emails.has(`${local}@${domain}`)) local += int(1, 9);
    const email = `${local}@${domain}`;
    emails.add(email);
    const index = list.length;
    const noPhone = index % 23 === 7;
    const phone = noPhone ? "" : `+${int(1, 99)} ${int(10, 99)} ${int(100, 999)} ${String(int(0, 9999)).padStart(4, "0")}`;
    const [city, country] = weighted(cities.map(([c, co, w]) => [[c, co], w] as const));
    // Pareto-ish: most shoppers buy once or twice, a few are regulars; ~10% never ordered.
    const r = rand();
    const weight = index % 10 === 3 ? 0 : r < 0.12 ? 3 + rand() * 3 : r < 0.4 ? 1 + rand() : 0.25 + rand() * 0.5;
    // Browsers-only customers (never ordered) never had a billing address collected.
    const address = weight === 0 ? "" : streetAddress(city);
    const postalCode = weight === 0 ? "" : (cityPostalCodes[city] ?? "");
    list.push({
      id: "",
      name,
      email,
      phone,
      address,
      city,
      postalCode,
      country,
      optIn: chance(0.62),
      weight,
      reseller: false,
      notes: noPhone ? "Declined to share a phone number at checkout." : ""
    });
  }
  return list.map((c, i) => ({ ...c, id: `customer-${String(i + 1).padStart(4, "0")}` }));
})();

// --- Discount codes ----------------------------------------------------------

type DiscountDef = {
  code: string;
  description: string;
  discountType: "percentage" | "fixed_amount" | "free_shipping";
  amount: number;
  minimumSubtotal: number;
  usageLimit: number;
  /** Days-ago window; `endsDaysAgo` null = never expires. */
  startsDaysAgo: number;
  endsDaysAgo: number | null;
  active: boolean;
  /** Probability an eligible order uses it. */
  uptake: number;
  resellerOnly?: boolean;
  firstOrderOnly?: boolean;
};

/** Days before seedNow for a UTC calendar date. */
function daysBefore(y: number, m: number, d: number): number {
  return (nowMs - Date.UTC(y, m - 1, d)) / DAY;
}

const discountDefs: DiscountDef[] = [
  { code: "WELCOME10", description: "Evergreen 10% off a first order — shown in the newsletter sign-up popup.", discountType: "percentage", amount: 10, minimumSubtotal: 0, usageLimit: 0, startsDaysAgo: 540, endsDaysAgo: null, active: true, uptake: 0.35, firstOrderOnly: true },
  { code: "BLACKFRIDAY25", description: "Black Friday → Cyber Monday 2025, 25% off sitewide.", discountType: "percentage", amount: 25, minimumSubtotal: 0, usageLimit: 0, startsDaysAgo: daysBefore(2025, 11, 28), endsDaysAgo: daysBefore(2025, 12, 2), active: false, uptake: 0.75 },
  { code: "FESTIVE100", description: "$100 off orders over $400 — December 2025 year-end licensing push.", discountType: "fixed_amount", amount: 100, minimumSubtotal: 400, usageLimit: 0, startsDaysAgo: daysBefore(2025, 12, 2), endsDaysAgo: daysBefore(2025, 12, 25), active: true, uptake: 0.35 },
  { code: "FREESHIP", description: "Legacy free-shipping code from before delivery was digital-only. Still redeemable; changes nothing at checkout now.", discountType: "free_shipping", amount: 0, minimumSubtotal: 75, usageLimit: 0, startsDaysAgo: 400, endsDaysAgo: null, active: true, uptake: 0.08 },
  { code: "MIDYEAR15", description: "Mid-year campaign 2026 — 15% off. Window closed end of July; nobody remembered to deactivate it.", discountType: "percentage", amount: 15, minimumSubtotal: 100, usageLimit: 0, startsDaysAgo: daysBefore(2026, 6, 1), endsDaysAgo: daysBefore(2026, 8, 1), active: true, uptake: 0.25 },
  { code: "LAUNCHWEEK50", description: "Launch-week discount from the original site opening: $50 off, first 20 redemptions.", discountType: "fixed_amount", amount: 50, minimumSubtotal: 150, usageLimit: 20, startsDaysAgo: daysBefore(2026, 3, 14), endsDaysAgo: daysBefore(2026, 4, 30), active: true, uptake: 0.8 },
  { code: "AGENCY15", description: "Trade discount for agency/reseller accounts buying multiple licenses. Paused June 2026 — trade pricing now handled directly.", discountType: "percentage", amount: 15, minimumSubtotal: 500, usageLimit: 0, startsDaysAgo: 420, endsDaysAgo: null, active: false, uptake: 0.9, resellerOnly: true },
  { code: "REFERAFRIEND", description: "Refer-a-friend reward, $30 off — referral reward for existing licence holders.", discountType: "fixed_amount", amount: 30, minimumSubtotal: 75, usageLimit: 0, startsDaysAgo: 300, endsDaysAgo: null, active: true, uptake: 0.04 },
  { code: "GIFT-WINNER-2026", description: "100% off — social media giveaway winner (one use).", discountType: "percentage", amount: 100, minimumSubtotal: 0, usageLimit: 1, startsDaysAgo: daysBefore(2026, 4, 1), endsDaysAgo: daysBefore(2026, 5, 1), active: true, uptake: 0 },
  { code: "SPRING2026", description: "Spring launch, 10% off — scheduled, starts next week.", discountType: "percentage", amount: 10, minimumSubtotal: 0, usageLimit: 500, startsDaysAgo: -7, endsDaysAgo: -37, active: true, uptake: 0 }
];

// --- Orders ------------------------------------------------------------------

type LineItem = { slug: string; qty: number; unitCents: number };
type Order = {
  number: string;
  placedMs: number;
  customer: Customer;
  items: LineItem[];
  values: Values;
  modifiedMs: number;
};

const ORDER_COUNT = 400;
const FIRST_ORDER_NUMBER = 10421;

function dayWeight(d: number): number {
  const date = new Date(nowMs - d * DAY);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  let w = 1 + 0.6 * (1 - d / 365); // steady growth as the template gains traction
  if (month === 11 && day >= 28) w *= 9; // Black Friday weekend
  if (month === 12 && day === 1) w *= 5; // Cyber Monday
  if (month === 12 && day <= 23) w *= 1.6; // year-end budget spend
  else if (month === 12) w *= 0.6; // dead week between Christmas and New Year
  if (month === 1) w *= 1.3; // new year, new project
  if (month === 9) w *= 1.2; // back-to-business in September
  return w;
}

const orderPlacements: number[] = (() => {
  const weights = Array.from({ length: 365 }, (_, i) => dayWeight(365 - i - 0.5));
  const total = weights.reduce((a, b) => a + b, 0);
  const placements: number[] = [];
  let cumulative = 0;
  let dayIndex = 0;
  for (let i = 0; i < ORDER_COUNT; i += 1) {
    const target = ((i + rand()) / ORDER_COUNT) * total;
    while (dayIndex < 364 && cumulative + weights[dayIndex] < target) {
      cumulative += weights[dayIndex];
      dayIndex += 1;
    }
    const dayStart = nowMs - (365 - dayIndex) * DAY;
    const midnight = dayStart - (dayStart % DAY);
    // 06:00–22:00 in a mixed set of timezones — treat placements as loosely UTC daytime.
    let placed = midnight + (4 + rand() * 16) * 3_600_000;
    if (placed > nowMs - 600_000) placed = nowMs - (10 + rand() * 180) * 60_000;
    placements.push(Math.round(placed / 1000) * 1000);
  }
  return placements.sort((a, b) => a - b);
})();

const sellable = productDefs.filter((p) => p.status !== "queued_to_publish");
const productDefBySlug = new Map(productDefs.map((p) => [p.slug, p]));
/** First gallery image of each product, read back from the already-built product records so it always matches what shipped. */
const productImageBySlug = new Map(productRecords.map((r) => [String(r.values.slug), parseImageGallery(r.values.images)[0]?.src ?? ""]));

/** Serializes an order's line items to the `OrderLineItem[]` shape from `@three-acts/ecommerce`. */
function serializeOrderItems(items: LineItem[]): string {
  return JSON.stringify(
    items.map((item) => {
      const product = productDefBySlug.get(item.slug)!;
      const image = productImageBySlug.get(item.slug);
      return {
        slug: item.slug,
        sku: product.sku,
        title: product.title,
        quantity: item.qty,
        unitPrice: money(item.unitCents),
        lineTotal: money(item.unitCents * item.qty),
        currency: seedBrand.currency,
        ...(image ? { image } : {})
      };
    })
  );
}

function priceCentsAt(p: ProductDef): number {
  // Drafted price changes aren't live yet: orders were charged the live price.
  const live = p.liveOverrides?.price;
  return Math.round((typeof live === "number" ? live : p.price) * 100);
}

function pickItems(customer: Customer, d: number): LineItem[] {
  const available = sellable.filter((p) => p.createdDaysAgo >= d);
  if (customer.reseller) {
    const items: LineItem[] = [{ slug: "agency-license", qty: 1, unitCents: 0 }];
    if (chance(0.5)) {
      const extra = pick(["single-site-license", "complete-template-bundle"] as const);
      items.push({ slug: extra, qty: int(1, 3), unitCents: 0 });
    }
    if (chance(0.3)) items.push({ slug: "setup-service", qty: 1, unitCents: 0 });
    return items.map((item) => ({ ...item, unitCents: priceCentsAt(productDefBySlug.get(item.slug)!) }));
  }
  const lineCount = weighted([[1, 45], [2, 32], [3, 16], [4, 7]] as const);
  const chosen = new Map<string, LineItem>();
  let guard = 0;
  while (chosen.size < lineCount && guard < 20) {
    guard += 1;
    const p = weighted(available.map((x) => [x, x.popularity ?? 1] as const));
    if (chosen.has(p.slug)) continue;
    const qty = p.category === "licenses" ? weighted([[1, 70], [2, 20], [3, 10]] as const) : 1;
    chosen.set(p.slug, { slug: p.slug, qty, unitCents: priceCentsAt(p) });
  }
  return [...chosen.values()];
}

const orders: Order[] = (() => {
  const result: Order[] = [];
  const uses = new Map<string, number>();
  const ordersByCustomer = new Map<string, number>();
  const zeroValueIndex = orderPlacements.findIndex((ms) => ms >= nowMs - daysBefore(2026, 4, 8) * DAY);
  const buyers = customers.filter((c) => c.weight > 0);
  const buyerEntries = buyers.map((c) => [c, c.weight] as const);
  // Every buyer orders at least once; the remaining slots follow the weights. Shuffled across the year.
  const assignments: Customer[] = [...buyers];
  while (assignments.length < ORDER_COUNT) assignments.push(weighted(buyerEntries));
  for (let i = assignments.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [assignments[i], assignments[j]] = [assignments[j], assignments[i]];
  }
  const giveawayWinner = customers[20];

  orderPlacements.forEach((placedMs, index) => {
    const d = (nowMs - placedMs) / DAY;
    const isGiveaway = index === zeroValueIndex;
    const customer = isGiveaway ? giveawayWinner : assignments[index];
    const priorOrders = ordersByCustomer.get(customer.email) ?? 0;
    ordersByCustomer.set(customer.email, priorOrders + 1);

    const items = isGiveaway ? [{ slug: "complete-template-bundle", qty: 1, unitCents: 49_900 }] : pickItems(customer, d);
    const grossCents = items.reduce((sum, item) => sum + item.unitCents * item.qty, 0);
    const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
    // shopConfig.vatRate is 0, so subtotal equals the gross merchandise total exactly.
    const subtotal = grossCents;

    // Discount selection: first eligible code whose dice roll succeeds.
    let code: DiscountDef | undefined;
    if (isGiveaway) {
      code = discountDefs.find((c) => c.code === "GIFT-WINNER-2026");
    } else {
      for (const c of discountDefs) {
        if (c.uptake === 0) continue;
        if (d > c.startsDaysAgo || (c.endsDaysAgo !== null && d < c.endsDaysAgo)) continue;
        if (c.resellerOnly !== customer.reseller && c.resellerOnly) continue;
        if (c.resellerOnly && d < 90) continue; // paused in June
        if (!c.resellerOnly && customer.reseller) continue;
        if (c.firstOrderOnly && priorOrders > 0) continue;
        if (subtotal < c.minimumSubtotal * 100) continue;
        if (c.usageLimit > 0 && (uses.get(c.code) ?? 0) >= c.usageLimit) continue;
        if (chance(c.uptake)) {
          code = c;
          break;
        }
      }
    }
    if (code) uses.set(code.code, (uses.get(code.code) ?? 0) + 1);

    let discount = 0;
    if (code?.discountType === "percentage") discount = Math.round((subtotal * code.amount) / 100);
    if (code?.discountType === "fixed_amount") discount = Math.min(code.amount * 100, subtotal);
    const taxable = subtotal - discount;
    // shopConfig.vatRate and every shopConfig.shipping rate are 0 — every product is a digital download.
    const tax = 0;
    const shipping = 0;
    const total = taxable + tax + shipping;

    // Lifecycle by age.
    let status: string;
    let paymentStatus: string;
    let paymentMethod = weighted([["card", 62], ["paypal", 20], ["apple_pay", 12], ["eft", 6]] as const);
    if (customer.reseller) paymentMethod = "eft";
    const roll = rand();
    if (d < 1.5) {
      if (paymentMethod === "eft" && roll < 0.6) [status, paymentStatus] = ["pending", "awaiting"];
      else if (roll < 0.15) [status, paymentStatus] = ["pending", "authorized"];
      else [status, paymentStatus] = ["paid", "paid"];
    } else if (d < 4) {
      [status, paymentStatus] = roll < 0.35 ? ["paid", "paid"] : ["shipped", "paid"];
    } else if (d < 10) {
      [status, paymentStatus] = roll < 0.7 ? ["shipped", "paid"] : ["fulfilled", "paid"];
    } else if (roll < 0.035 && !isGiveaway) {
      [status, paymentStatus] = ["refunded", "refunded"];
    } else if (roll < 0.055 && !isGiveaway) {
      [status, paymentStatus] = ["cancelled", paymentMethod === "eft" ? "awaiting" : "failed"];
    } else {
      [status, paymentStatus] = ["fulfilled", "paid"];
    }
    if (isGiveaway) {
      paymentMethod = "card";
      [status, paymentStatus] = ["fulfilled", "paid"];
    }

    // "shipped" here means the download link / repo invite has been sent but the customer hasn't
    // yet confirmed access; "fulfilled" means they have. trackingNumber carries the invite reference.
    const hasDeliveryReference = status === "shipped" || status === "fulfilled" || status === "refunded";
    const trackingNumber = hasDeliveryReference ? `REPO-${int(100_000, 999_999)}` : "";

    const noteOptions = [
      "Customer asked for an invoice made out to their company.",
      "Requested the private GitHub repo invite be sent to a teammate's address instead.",
      "Purchased on behalf of a client; billing address is the agency's, not the end client's.",
      "Asked about the refund window before purchasing — confirmed 14 days.",
      "Upgraded from a single-site license after a second client signed on."
    ];
    let notes = "";
    if (isGiveaway) notes = "Social media giveaway prize — 100% discount code, no payment captured.";
    else if (status === "refunded") notes = pick(["Refunded in full — accidental duplicate purchase.", "Refunded — customer needed a higher license tier, repurchased separately.", "Refunded per request, within the 14-day window."]);
    else if (status === "cancelled") notes = paymentStatus === "failed" ? "Card declined twice — auto-cancelled after 48h." : "EFT never received — cancelled after 5 days.";
    else if (customer.reseller) notes = "Agency account — invoiced separately for the client rollout.";
    else if (chance(0.06)) notes = pick(noteOptions);

    const fulfilmentDays = status === "fulfilled" || status === "refunded" ? int(0, 3) : status === "shipped" ? rand() : status === "cancelled" ? 5 : 0;
    const modifiedMs = Math.min(placedMs + fulfilmentDays * DAY + int(1, 120) * 60_000, nowMs);
    const orderNumber = `TA-${FIRST_ORDER_NUMBER + index}`;

    result.push({
      number: orderNumber,
      placedMs,
      customer,
      items,
      modifiedMs,
      values: complete("orders", {
        orderNumber,
        customerEmail: customer.email,
        customerName: customer.name,
        status,
        paymentStatus,
        paymentMethod,
        itemCount,
        items: serializeOrderItems(items),
        subtotal: money(subtotal),
        discountTotal: money(discount),
        discountCode: code?.code ?? "",
        taxTotal: money(tax),
        shippingTotal: money(shipping),
        total: money(total),
        currency: seedBrand.currency,
        placedAt: iso(placedMs),
        shippingCity: customer.city,
        shippingCountry: customer.country,
        trackingNumber,
        notes,
        shippingName: customer.name,
        shippingAddress: customer.address,
        shippingPostalCode: customer.postalCode,
        customerPhone: customer.phone
      })
    });
  });
  return result;
})();

const orderRecords: CmsRecord[] = orders.map((o) =>
  seedRecord({ id: `order-${o.number}`, publishStatus: "not_published", createdAt: iso(o.placedMs), modifiedAt: iso(o.modifiedMs), values: o.values, liveValues: null })
);

const discountRecords: CmsRecord[] = discountDefs.map((c) => {
  const timesUsed = orders.filter((o) => o.values.discountCode === c.code).length;
  const created = Math.max(c.startsDaysAgo + 14, 20);
  return seedRecord({
    id: `discount-${c.code.toLowerCase()}`,
    createdAt: daysAgo(created),
    modifiedAt: daysAgo(c.code === "AGENCY15" ? 88 : c.endsDaysAgo !== null && c.endsDaysAgo > 0 ? c.endsDaysAgo : Math.min(created, 3)),
    publishStatus: "not_published",
    liveValues: null,
    values: complete("discount-codes", {
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      amount: c.amount,
      minimumSubtotal: c.minimumSubtotal,
      usageLimit: c.usageLimit,
      timesUsed,
      startsAt: iso(Math.round((nowMs - c.startsDaysAgo * DAY) / 60_000) * 60_000),
      endsAt: c.endsDaysAgo === null ? "" : iso(Math.round((nowMs - c.endsDaysAgo * DAY) / 60_000) * 60_000),
      active: c.active
    })
  });
});

const customerRecords: CmsRecord[] = customers.map((c, index) => {
  const own = orders.filter((o) => o.customer.email === c.email);
  const first = own[0]?.placedMs;
  const last = own[own.length - 1]?.placedMs;
  const lifetimeCents = own.filter((o) => o.values.paymentStatus === "paid").reduce((sum, o) => sum + Math.round(Number(o.values.total) * 100), 0);
  // Account created at (or shortly before) the first checkout; browsers-only signed up any time.
  const createdMs = first !== undefined ? first - (index % 3 === 0 ? 0 : (index % 17) * DAY) - 60_000 : nowMs - (20 + ((index * 53) % 340)) * DAY;
  const modifiedMs = last !== undefined ? Math.max(last, createdMs) : createdMs + ((index * 7) % 15) * DAY;
  return seedRecord({
    id: c.id,
    createdAt: iso(createdMs),
    modifiedAt: iso(Math.min(modifiedMs, nowMs)),
    publishStatus: "not_published",
    liveValues: null,
    values: complete("customers", {
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      postalCode: c.postalCode,
      country: c.country,
      marketingOptIn: c.optIn,
      totalOrders: own.length,
      lifetimeValue: money(lifetimeCents),
      firstOrderAt: first !== undefined ? iso(first) : "",
      lastOrderAt: last !== undefined ? iso(last) : "",
      notes: c.notes || (own.length === 0 ? "Created an account but hasn't ordered yet." : "")
    })
  });
});

// --- Product reviews ---------------------------------------------------------

type Tone = "great" | "good" | "meh" | "bad";

const reviewCopy: Record<"digital" | "service", Record<Tone, { titles: string[]; bodies: string[] }>> = {
  digital: {
    great: {
      titles: ["Saved us a week", "Exactly what we needed", "Worth every dollar", "Clean, well-documented code", "Our new default starting point"],
      bodies: [
        "Dropped this into a new client project and had a working build the same afternoon. Saved us a week of boilerplate.",
        "The types are exactly what you want from a template — nothing fights you, nothing is hand-wavy.",
        "Docs are thorough and the code reads like something our own team wrote. Genuinely impressed.",
        "We've shipped three client sites on this now. Every fork has been painless.",
        "Clean separation of concerns, no framework lock-in tax. Exactly what was promised."
      ]
    },
    good: {
      titles: ["Solid piece", "Does what it says", "Good value", "Would recommend"],
      bodies: [
        "Does exactly what the listing says. Took a bit of reading to understand the conventions, but worth it.",
        "Good quality code, sensible defaults. Wanted a couple more examples in the docs.",
        "Straightforward to wire up. Support answered a config question the same day."
      ]
    },
    meh: {
      titles: ["Fine, not quite a fit for us", "Okay", "Works, needed adjusting"],
      bodies: [
        "Works as advertised but we ended up rewriting a fair bit to match our own stack.",
        "Decent starting point. Docs could be better in a couple of places — had to read the source.",
        "Good code, just more opinionated about structure than we wanted."
      ]
    },
    bad: {
      titles: ["Not ready for our use case", "Rougher than expected", "Needed more polish"],
      bodies: [
        "Ran into a bug in an edge case that wasn't covered in the docs. Support fixed it but it cost us a day.",
        "More setup than the listing implied. Got there in the end.",
        "A couple of the examples were out of date against the current version."
      ]
    }
  },
  service: {
    great: {
      titles: ["Worth every cent", "Smooth from kickoff to launch", "They know this template inside out"],
      bodies: [
        "The setup call alone paid for itself — caught two config mistakes before we'd even started building.",
        "Migration was painless. They handled the data mapping we'd been dreading.",
        "Clear communication throughout and delivered ahead of schedule."
      ]
    },
    good: {
      titles: ["Good experience", "Would book again"],
      bodies: [
        "Useful session, answered everything we asked. A little pricier than expected but fair for the time saved.",
        "Solid onboarding call. Would have liked a written follow-up summary."
      ]
    },
    meh: {
      titles: ["Fine", "Adequate"],
      bodies: ["Got us unstuck but felt rushed in the second half of the session."]
    },
    bad: {
      titles: ["Rescheduled twice", "Slower than expected"],
      bodies: ["Had to reschedule the workshop twice before it happened. The content itself was good once it did."]
    }
  }
};

function displayName(fullName: string): string {
  const parts = fullName.split(" ");
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.` : fullName;
}

const REVIEW_COUNT = 120;
const UNVERIFIED_REVIEWS = 14;

const reviewRecords: CmsRecord[] = (() => {
  const records: CmsRecord[] = [];
  const seen = new Set<string>();
  const eligible = orders.filter((o) => !o.customer.reseller && (o.values.status === "fulfilled" || o.values.status === "shipped") && o.placedMs < nowMs - 6 * DAY);

  const toneFor = (): { rating: string; tone: Tone } => {
    const rating = weighted([["5", 56], ["4", 25], ["3", 10], ["2", 5], ["1", 4]] as const);
    return { rating, tone: rating === "5" ? "great" : rating === "4" ? "good" : rating === "3" ? "meh" : "bad" };
  };

  const push = (input: { product: ProductDef; name: string; email: string; verified: boolean; submittedMs: number }) => {
    const { rating, tone } = toneFor();
    const copy = reviewCopy[kindOf(input.product.category)][tone];
    const recent = input.submittedMs > nowMs - 10 * DAY;
    const approved = recent ? chance(0.4) : rating === "1" ? chance(0.7) : chance(0.96);
    const index = records.length + 1;
    records.push(
      seedRecord({
        id: `review-${String(index).padStart(4, "0")}`,
        createdAt: iso(input.submittedMs),
        modifiedAt: iso(Math.min(input.submittedMs + (approved ? int(2, 48) * 3_600_000 : 0), nowMs)),
        publishStatus: "not_published",
        liveValues: null,
        values: complete("product-reviews", {
          title: pick(copy.titles),
          product: input.product.slug,
          customerName: input.name,
          customerEmail: input.email,
          rating,
          body: pick(copy.bodies),
          verifiedPurchase: input.verified,
          approved,
          submittedAt: iso(input.submittedMs)
        })
      })
    );
  };

  let guard = 0;
  while (records.length < REVIEW_COUNT - UNVERIFIED_REVIEWS && guard < 5000) {
    guard += 1;
    const order = pick(eligible);
    const item = pick(order.items);
    const key = `${order.customer.email}|${item.slug}`;
    if (seen.has(key)) continue;
    const submittedMs = Math.round((order.placedMs + (5 + rand() * 25) * DAY) / 1000) * 1000;
    if (submittedMs >= nowMs) continue;
    seen.add(key);
    push({ product: productDefBySlug.get(item.slug)!, name: displayName(order.customer.name), email: order.customer.email, verified: true, submittedMs });
  }

  const guestNames = ["Thabo", "Megan R.", "Anonymous", "Backend dev from Joburg", "Riana", "Sizwe M.", "Kate", "Nkosi", "Hannah P.", "Faiez", "Lindo", "Bianca", "Jean-Pierre", "Owethu"];
  const reviewable = productDefs.filter((p) => p.status !== "queued_to_publish" && p.status !== "not_published");
  for (let i = 0; i < UNVERIFIED_REVIEWS; i += 1) {
    const product = pick(reviewable);
    const submittedMs = nowMs - Math.round((1 + rand() * Math.min(300, product.createdDaysAgo - 1)) * DAY);
    push({ product, name: guestNames[i % guestNames.length], email: "", verified: false, submittedMs });
  }
  return records
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r, i) => ({
      ...r,
      id: `review-${String(i + 1).padStart(4, "0")}`,
      // ~10 of the 120 reviews were emailed in and added by staff; the rest came through the site form.
      values: { ...r.values, source: i % 12 === 0 ? "manual" : "site" }
    }));
})();

// --- Testimonials ------------------------------------------------------------

const testimonialDefs: Array<{ name: string; quote: string; title: string; company?: string; rating: string; product?: (typeof productSlugs)[number]; featured?: boolean; status?: PublishStatus; daysAgo: number }> = [
  { name: "Marcus Chen", title: "Founder, Chen & Co. (Seattle)", quote: "We used to spin up every client site from scratch. Now we fork Three Acts and ship the storefront in the first week instead of the fourth.", rating: "5", product: "complete-template-bundle", featured: true, daysAgo: 300 },
  { name: "Freya Lindqvist", title: "Lead developer, Nordvik Studio (Stockholm)", quote: "The CMS app is the first admin panel I haven't wanted to rebuild. Editors picked it up in a day.", rating: "5", product: "cms-app", featured: true, daysAgo: 280 },
  { name: "Tariq Osei", title: "Agency owner, Osei Digital (London)", quote: "The domain packages are the real win — swap the payment provider, keep everything else. We've used the same ecommerce package on four client shops now.", company: "Osei Digital", rating: "5", product: "ecommerce-package", featured: true, daysAgo: 250 },
  { name: "Priya Raman", title: "Freelance developer, Bangalore", quote: "Worth the price just for the auth package. Session handling and password hashing done properly on day one.", rating: "5", product: "auth-package", daysAgo: 210 },
  { name: "Jonas Berg", title: "CTO, Berg Interactive (Berlin)", quote: "Bought the agency license the week it launched. We've since recouped it many times over across client builds.", rating: "5", product: "agency-license", daysAgo: 200 },
  { name: "Aiko Tanaka", title: "Product designer, Loop Studio (Tokyo)", quote: "The wireframe theme is the best starting point for client presentations — unopinionated enough to reskin fast.", rating: "4", product: "wireframe-theme", daysAgo: 160 },
  { name: "Lucas Ferreira", title: "Founder, Ferreira Labs (São Paulo)", quote: "The setup service saved our team a full sprint. They had Supabase and the Vercel deploy hook configured before our first standup.", rating: "5", product: "setup-service", daysAgo: 120 },
  { name: "Naledi Khumalo", title: "Engineering lead, Mzansi Digital (Cape Town)", quote: "We fork the API app for every client and never touch the auth or checkout routes again. It just works.", rating: "4", product: "api-app", featured: true, daysAgo: 90 },
  { name: "Ben Whitfield", title: "Solo developer, Bristol", quote: "Good documentation, honest pricing, no dark patterns in the checkout flow. Refreshing.", rating: "4", daysAgo: 60 },
  {
    name: "Grace Oduya",
    title: "Studio director, Oduya Creative (Nairobi)",
    quote: "Our client asked for a blog with real editorial workflow. The CMS delivered on day one — no plugin roulette, no rebuilding the same admin panel for the fifth time.",
    rating: "5",
    product: "cms-app",
    daysAgo: 45,
    status: "draft"
  },
  { name: "Diego Martins", title: "Agency partner, Overtone Studio (Lisbon)", quote: "Two years in and we're still the only agency in our city offering same-week launches, because of this template.", company: "Overtone Studio", rating: "5", daysAgo: 14, status: "queued_to_publish" },
  { name: "Sophie Laurent", title: "Freelancer, Montreal", quote: "Loved the packages, wasn't sold on paying extra for every integration separately.", rating: "3", product: "supabase-data-store", daysAgo: 45, status: "not_published" }
];

const testimonialRecords: CmsRecord[] = testimonialDefs.map((t, index) => {
  const values = complete("testimonials", {
    customerName: t.name,
    quote: t.quote,
    customerTitle: t.title,
    company: t.company ?? "",
    avatar: serializeImageValue({
      src: `https://picsum.photos/seed/testimonial-${index + 1}/400/400`,
      fileName: `testimonial-${index + 1}.jpg`,
      width: 400,
      height: 400,
      alt: t.name
    }),
    rating: t.rating,
    product: t.product ?? "",
    featured: t.featured ?? false,
    sortOrder: (index + 1) * 10
  });
  const status = t.status ?? "published";
  return seedRecord({
    id: `testimonial-${String(index + 1).padStart(2, "0")}`,
    publishStatus: status,
    createdAt: daysAgo(t.daysAgo),
    modifiedAt: daysAgo(Math.max(t.daysAgo - 7, 1)),
    values,
    // The draft edits a published quote: the site still shows the shorter original.
    liveValues: status === "draft" ? { ...values, quote: "Our client asked for a blog. The CMS delivered on day one." } : undefined
  });
});

export const shopSeed: SeedCollections = {
  "product-categories": productCategoryRecords,
  products: productRecords,
  testimonials: testimonialRecords,
  customers: customerRecords,
  orders: orderRecords,
  "product-reviews": reviewRecords,
  "discount-codes": discountRecords
};
