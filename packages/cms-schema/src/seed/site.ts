import { serializeImageValue } from "../images";
import type { CmsRecord, CmsRecordValue } from "../types";
import { authorSlugs, productCategorySlugs, productSlugs, seedBrand, staticPagePaths } from "./keys";
import { createRandom, daysAgo, seedRecord, type SeedCollections } from "./types";

/**
 * Site seed: the settings screens and operational data of the "Three Acts"
 * demo brand — the template selling itself. Sitewide SEO defaults, per-page
 * SEO for every static route, redirects carried over from the old
 * Gumroad/Lemon Squeezy-era storefront and marketing site, the media library
 * and inbound form submissions.
 *
 * `site-settings` and `page-settings` are editorial (publish workflow).
 * `redirect-rules` and `media-library` are `data` and `form-submissions` is
 * `readonly`: like records the API creates, they sit at `not_published` with
 * no live snapshot.
 */

const origin = `https://${seedBrand.domain}`;
const rand = createRandom(20260901);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function int(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/** picsum placeholder, seeded so the same asset always renders the same photo. */
function photo(seed: string, width = 1600, height = 1067): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

function ogImage(seed: string, fileName: string, alt: string): string {
  return serializeImageValue({ src: photo(seed, 1200, 630), fileName, size: 180_000 + (seed.length * 7_919) % 140_000, width: 1200, height: 630, alt });
}

function jsonLd(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** Title-cases a slug for placeholder copy, e.g. "cms-app" -> "Cms App". Good enough for seed alt text. */
function titleCase(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Records in `data`/`readonly` collections: no publish workflow, no live snapshot. */
function dataRecord(id: string, createdAt: string, values: Record<string, CmsRecordValue>, modifiedAt?: string): CmsRecord {
  return seedRecord({ id, publishStatus: "not_published", createdAt, modifiedAt: modifiedAt ?? createdAt, values, liveValues: null });
}

// --- Site settings -------------------------------------------------------------

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${origin}/#organization`,
  name: seedBrand.name,
  url: origin,
  logo: `${origin}/brand/three-acts-logo.png`,
  email: `hello@${seedBrand.domain}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: seedBrand.city,
    addressRegion: "Western Cape",
    addressCountry: "ZA"
  },
  sameAs: ["https://github.com/three-acts", "https://x.com/threeacts", "https://www.linkedin.com/company/three-acts"]
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${origin}/#website`,
  name: seedBrand.name,
  url: origin,
  inLanguage: "en-US",
  publisher: { "@id": `${origin}/#organization` },
  potentialAction: { "@type": "SearchAction", target: `${origin}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" }
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${origin}/#software`,
  name: seedBrand.name,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: origin,
  softwareVersion: "1.0",
  publisher: { "@id": `${origin}/#organization` },
  offers: { "@type": "Offer", price: "149", priceCurrency: "USD", url: `${origin}/shop/complete-template-bundle` }
};

const siteSettingsValues: Record<string, CmsRecordValue> = {
  siteName: seedBrand.name,
  titleTemplate: "%s · Three Acts",
  defaultMetaDescription:
    "The Astro + CMS template we use to ship client sites: static-first pages, a private editorial workspace and a typed API bridge, ready to fork.",
  defaultOgImage: ogImage("og-default-template", "og-default-template.jpg", "The Three Acts public site and CMS editorial workspace side by side"),
  favicon: serializeImageValue({ src: `${origin}/favicon.svg`, fileName: "favicon.svg", size: 1_184 }),
  twitterHandle: "@threeacts",
  locale: "en_US",
  allowIndexing: true,
  schemaMarkup: jsonLd([organizationLd, websiteLd, softwareLd])
};

const siteSettings: CmsRecord[] = [
  // Draft edit: rewording the default description and swapping the default
  // share image; the site still renders the older launch copy.
  seedRecord({
    id: "site-settings-main",
    publishStatus: "draft",
    createdAt: daysAgo(210),
    modifiedAt: daysAgo(2, 3),
    values: siteSettingsValues,
    liveValues: {
      ...siteSettingsValues,
      defaultMetaDescription: "A static-first Astro site with an optional private CMS and API bridge. Buy the pieces you need, or the complete bundle.",
      defaultOgImage: ogImage("og-launch-2026", "og-launch-2026.jpg", "Three Acts launch banner"),
      schemaMarkup: jsonLd([{ ...organizationLd, sameAs: ["https://github.com/three-acts"] }, websiteLd])
    }
  })
];

// --- Page settings -------------------------------------------------------------

type PageInput = {
  path: (typeof staticPagePaths)[number];
  name: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  searchTitle?: string;
  searchDescription?: string;
  searchImage?: string;
  schemaMarkup?: unknown;
  canonicalUrl?: string;
};

function pageId(path: string): string {
  return `page-settings-${path === "/" ? "home" : path.slice(1)}`;
}

function pageValues(input: PageInput): Record<string, CmsRecordValue> {
  return {
    pageName: input.name,
    pagePath: input.path,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    canonicalUrl: input.canonicalUrl ?? `${origin}${input.path === "/" ? "/" : input.path}`,
    ogTitle: input.ogTitle ?? "",
    ogDescription: input.ogDescription ?? "",
    ogImage: input.ogImage ?? "",
    searchTitle: input.searchTitle ?? "",
    searchDescription: input.searchDescription ?? "",
    searchImage: input.searchImage ?? "",
    schemaMarkup: input.schemaMarkup === undefined ? "" : jsonLd(input.schemaMarkup)
  };
}

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    [
      "What's included in the Three Acts template?",
      "A static-first Astro public site, a private React CMS, a typed API bridge and four domain packages (content, ecommerce, auth, forms) you configure instead of rewrite."
    ],
    [
      "Do I need the CMS and API, or can I just use the static site?",
      "Either. The Lightweight Path runs apps/web alone with mock or file-backed content — no database, auth or third-party provider required. Add the CMS and API when a project needs editorial content or server-side behaviour."
    ],
    [
      "Can I use Three Acts on client projects?",
      "Yes. A single-site licence covers one production domain; an agency licence covers unlimited client builds under one studio. See /licenses for the full terms."
    ],
    [
      "How do updates work after I've forked the template?",
      "You own the fork — pull specific commits or releases from the template repository when you want them. Nothing phones home."
    ]
  ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } }))
};

const pages: Record<(typeof staticPagePaths)[number], PageInput> = {
  "/": {
    path: "/",
    name: "Home",
    metaTitle: "Three Acts — the Astro + CMS template that sells itself",
    metaDescription:
      "A static-first Astro site, a private React CMS and a typed API bridge — the foundation we use to ship client sites, now yours to fork or buy piece by piece.",
    ogTitle: "Three Acts · The Astro + CMS template that sells itself",
    ogImage: ogImage("og-home", "og-home.jpg", "The Three Acts homepage rendered in a browser window"),
    schemaMarkup: websiteLd
  },
  "/about": {
    path: "/about",
    name: "About",
    metaTitle: "Why we built Three Acts",
    metaDescription:
      "Three Acts started as the codebase we kept rebuilding for every client. Now it's a template: static-first, CMS-optional, and typed end to end.",
    ogImage: ogImage("og-about", "og-about-team.jpg", "The Three Acts team on a video call, reviewing a client build")
  },
  "/shop": {
    path: "/shop",
    name: "Shop",
    metaTitle: "Shop the template — apps, packages & licences",
    metaDescription:
      "Buy the pieces of Three Acts individually — apps, domain packages, page modules, themes, integrations — or the complete bundle with a single-site or agency licence.",
    ogImage: ogImage("og-shop", "og-shop.jpg", "The Three Acts shop grid showing template pieces and bundles"),
    searchTitle: "Buy the Three Acts template, piece by piece",
    schemaMarkup: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Shop the Three Acts template",
      url: `${origin}/shop`,
      isPartOf: { "@id": `${origin}/#website` },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: productSlugs.slice(0, 6).map((slug, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            name: titleCase(slug),
            url: `${origin}/shop/${slug}`,
            offers: { "@type": "Offer", url: `${origin}/shop/${slug}`, priceCurrency: "USD", availability: "https://schema.org/InStock" }
          }
        }))
      }
    }
  },
  "/blog": {
    path: "/blog",
    name: "Journal",
    metaTitle: "The engineering journal",
    metaDescription: "Architecture notes, migration write-ups and release notes from building Three Acts — and the client sites built on it.",
    ogImage: ogImage("og-journal", "og-journal.jpg", "A laptop showing a pull request diff next to a coffee cup"),
    schemaMarkup: { "@context": "https://schema.org", "@type": "Blog", name: "The Three Acts engineering journal", url: `${origin}/blog`, publisher: { "@id": `${origin}/#organization` } }
  },
  "/contact": {
    path: "/contact",
    name: "Contact",
    metaTitle: "Contact us",
    metaDescription: "Questions about a licence, an order or the API bridge? Email hello@threeacts.dev — we usually reply within a day.",
    schemaMarkup: { "@context": "https://schema.org", "@type": "ContactPage", name: "Contact Three Acts", url: `${origin}/contact` }
  },
  "/faq": {
    path: "/faq",
    name: "FAQ",
    metaTitle: "Frequently asked questions",
    metaDescription: "Licensing, the CMS, deployment and support — answered.",
    schemaMarkup: faqLd
  },
  "/agencies": {
    path: "/agencies",
    name: "Agencies",
    metaTitle: "Three Acts for agencies",
    metaDescription:
      "Ship client sites faster on a foundation you don't rebuild every time. Apply for an agency licence and tell us about your studio.",
    ogTitle: "Three Acts for agencies · Ship client sites faster",
    ogImage: ogImage("og-agencies", "og-agencies.jpg", "Two designers reviewing a client site build on a shared screen")
  },
  "/docs": {
    path: "/docs",
    name: "Docs",
    metaTitle: "Documentation",
    metaDescription:
      "Architecture, the collection registry, the domain packages and the API bridge — everything you need to fork Three Acts with confidence."
  },
  "/licenses": {
    path: "/licenses",
    name: "Licences",
    metaTitle: "Licences",
    metaDescription: "Single-site, agency and complete-bundle licences for Three Acts, explained in plain language."
  },
  "/refunds": {
    path: "/refunds",
    name: "Refunds",
    metaTitle: "Refunds",
    metaDescription: "Our refund policy for template purchases and services."
  },
  "/terms": {
    path: "/terms",
    name: "Terms",
    metaTitle: "Terms & conditions",
    metaDescription: "The terms that apply when you buy or use Three Acts, including licensing, orders and support."
  },
  "/privacy": {
    path: "/privacy",
    name: "Privacy",
    metaTitle: "Privacy policy",
    metaDescription: "How Three Acts collects, uses and protects your personal information."
  },
  "/careers": {
    path: "/careers",
    name: "Careers",
    metaTitle: "Work with us",
    metaDescription: "We're hiring a founding front-end engineer and a part-time technical writer. See open roles and how to apply.",
    ogImage: ogImage("og-careers", "og-careers.jpg", "An open laptop showing a code review on the Three Acts repository")
  },
  "/changelog": {
    path: "/changelog",
    name: "Changelog",
    metaTitle: "Changelog",
    metaDescription: "Release notes for Three Acts — coming soon."
  }
};

const pageSettings: CmsRecord[] = staticPagePaths.map((path, index) => {
  const values = pageValues(pages[path]);
  const createdAt = daysAgo(200 - index, index);
  const id = pageId(path);

  switch (path) {
    // Brand-new page, never live yet: queued for the next deploy.
    case "/careers":
      return seedRecord({ id, publishStatus: "queued_to_publish", createdAt: daysAgo(6), modifiedAt: daysAgo(1, 4), values });
    // Published page with an unpublished edit: the site keeps the old copy.
    case "/agencies":
      return seedRecord({
        id,
        publishStatus: "draft",
        createdAt,
        modifiedAt: daysAgo(3, 2),
        values,
        liveValues: {
          ...values,
          metaTitle: "Wholesale for agencies",
          metaDescription: "Bring Three Acts to your studio. Get in touch for our agency licensing terms.",
          ogTitle: "",
          ogImage: ""
        }
      });
    // Published page with a queued edit: refreshed refund window language ships next deploy.
    case "/refunds":
      return seedRecord({
        id,
        publishStatus: "queued_to_publish",
        createdAt,
        modifiedAt: daysAgo(1, 7),
        values,
        liveValues: { ...values, metaDescription: "Unopened licences can be refunded within 14 days of purchase if you haven't deployed the template." }
      });
    // Coming soon: exists in the CMS but is not on the site.
    case "/changelog":
      return seedRecord({ id, publishStatus: "not_published", createdAt: daysAgo(40), modifiedAt: daysAgo(9), values });
    default:
      return seedRecord({ id, createdAt, modifiedAt: daysAgo(60 - index * 3, index), values });
  }
});

// --- Redirect rules ------------------------------------------------------------

type RedirectInput = {
  source: string;
  target: string;
  code?: "301" | "302" | "307" | "308";
  notes?: string;
  hits?: number;
  evidence?: string;
};

const legacyAuditExport = `https://cdn.${seedBrand.domain}/documents/redirect-audit-2026-03.csv`;

/** Old Gumroad-style permalinks ("gumroad.com/l/<slug>") for every template piece, before the storefront moved onto the site itself. */
const legacyProductLinks: Array<[string, (typeof productSlugs)[number]]> = [
  ["three-acts-web-app", "web-app"],
  ["three-acts-cms", "cms-app"],
  ["three-acts-api-bridge", "api-app"],
  ["content-domain-package", "content-package"],
  ["ecommerce-domain-package", "ecommerce-package"],
  ["auth-domain-package", "auth-package"],
  ["forms-domain-package", "forms-package"],
  ["storefront-page-module", "storefront-module"],
  ["journal-page-module", "journal-module"],
  ["forms-page-module", "forms-module"],
  ["account-page-module", "account-module"],
  ["wireframe-starter-theme", "wireframe-theme"],
  ["supabase-integration", "supabase-data-store"],
  ["vercel-deploy-integration", "vercel-deploy-integration"],
  ["single-site-licence-key", "single-site-license"],
  ["agency-licence-key", "agency-license"],
  ["the-complete-bundle", "complete-template-bundle"],
  ["done-for-you-setup", "setup-service"]
];

const redirectInputs: RedirectInput[] = [
  ...legacyProductLinks.map(([oldName, slug], index): RedirectInput => ({
    source: `l/${oldName}`,
    target: `/shop/${slug}`,
    hits: 300 + ((index * 1_783) % 9_000),
    evidence: index % 6 === 0 ? legacyAuditExport : undefined
  })),
  { source: "l/the-complete-bundle/", target: "/shop/complete-template-bundle", hits: 214, notes: "Trailing-slash variant still linked from an old newsletter." },
  // Old Lemon Squeezy category collections, before the shop grew a real category taxonomy.
  ...productCategorySlugs.map((slug, index): RedirectInput => ({
    source: `collections/${slug}`,
    target: `/shop?category=${slug}`,
    hits: 400 + ((index * 977) % 6_000)
  })),
  { source: "documentation", target: "/docs", hits: 8_240, notes: "Top organic landing page from the old docs subdomain — keep permanently." },
  { source: "documentation/getting-started", target: "/docs", hits: 3_105 },
  { source: "partners", target: "/agencies", hits: 1_412 },
  { source: "pricing", target: "/shop/category/licenses", hits: 5_680, notes: "Old single pricing page; licensing is now its own category." },
  { source: "blog/posts/static-first-astro-build", target: "/blog/ship-a-client-site-in-an-afternoon", hits: 2_960, notes: "Old blog path had an extra /posts/ segment." },
  { source: "blog/posts/typed-api-bridge-for-the-cms", target: "/blog/the-api-is-the-only-door-auth-checkout-and-forms", hits: 1_744 },
  { source: "blog/posts/domain-packages-not-a-monolith", target: "/blog/the-collection-registry-is-the-only-source-of-truth", hits: 980 },
  { source: "pages/contact-us", target: "/contact", hits: 4_560 },
  { source: "pages/about-us", target: "/about", hits: 2_108 },
  { source: "pages/faqs", target: "/faq", hits: 1_734 },
  { source: "policies/terms-of-service", target: "/terms", hits: 233 },
  { source: "policies/privacy-policy", target: "/privacy", hits: 301 },
  { source: "pages/refund-policy", target: "/refunds", hits: 507 },
  { source: "pages/careers", target: "/careers", hits: 640 },
  {
    source: "account/sign-in",
    target: "/shop",
    code: "302",
    hits: 980,
    notes: "Customer accounts are being rebuilt. Temporary until the new sign-in flow ships."
  },
  {
    source: "?ls_webhook=lemonsqueezy_legacy",
    target: "/contact",
    code: "302",
    hits: 37,
    notes: "Query-string source from the retired Lemon Squeezy webhook callback. Hit by stale payment notifications — review after Q4."
  },
  { source: "product-category/software", target: "/shop?category=apps", hits: 1_511, notes: "WordPress-era category path from the pre-2024 marketing site." },
  {
    source: "shop/legacy-icon-pack",
    target: "/shop",
    hits: 96,
    notes: "Discontinued add-on with no direct replacement. Consider serving 410 Gone instead of redirecting to the shop."
  },
  { source: "black-friday", target: "/shop?campaign=black-friday-2026", code: "302", hits: 0, notes: "Campaign vanity URL for social posts. Switch off in December." },
  { source: "quickstart-guide", target: "https://cdn.threeacts.dev/downloads/three-acts-quickstart-guide.pdf", code: "302", hits: 3_318, notes: "QR code in the repo README. External CDN target." },
  { source: "agencies/apply", target: "/agency-application", code: "302", hits: 58, notes: "LOOP RISK: /agency-application points back here. Keep only one of the pair." },
  { source: "agency-application", target: "/agencies/apply", code: "302", hits: 61, notes: "LOOP RISK: pairs with /agencies/apply. Delete once the new form URL is confirmed." },
  {
    source: "old/pricing/legacy/2024/agency/very/deep/path",
    target: `${origin}/shop/category/licenses?utm_source=legacy&utm_medium=redirect&utm_campaign=pricing-page-2024-reprint`,
    code: "308",
    hits: 124,
    notes: "Deep path and long query string from a 2024 email campaign; stresses column truncation and CSV export.",
    evidence: legacyAuditExport
  }
];

const redirectRules: CmsRecord[] = redirectInputs.map((input, index) => {
  const code = input.code ?? "301";
  const id = `redirect-${String(index + 1).padStart(3, "0")}`;
  const createdAt = daysAgo(180 - Math.floor(index / 4), index % 6);
  const hits = input.hits ?? 0;
  return dataRecord(
    id,
    createdAt,
    {
      sourcePath: input.source,
      targetUrl: input.target,
      notes: input.notes ?? "",
      statusCode: code,
      hits,
      permanent: code === "301" || code === "308",
      evidence: input.evidence ?? "",
      lastHitAt: hits > 0 ? daysAgo(index % 9, index % 24) : "",
      ruleId: id
    },
    daysAgo(Math.max(0, 150 - index * 3), index % 5)
  );
});

// --- Media library -------------------------------------------------------------

type MediaInput = {
  id: string;
  name: string;
  alt: string;
  license?: "owned" | "licensed" | "creative_commons" | "unknown";
  width?: number;
  height?: number;
  sensitive?: boolean;
  /** Non-image file URL (PDF/video); images use a picsum URL. */
  file?: string;
};

const cdn = `https://cdn.${seedBrand.domain}`;

const productShots: MediaInput[] = productSlugs.map((slug) => ({
  id: `media-product-${slug}`,
  name: `${slug}.jpg`,
  alt: `${titleCase(slug)} preview screenshot`,
  width: 1600,
  height: 1000
}));

const teamPhotos: MediaInput[] = authorSlugs.map((slug) => ({
  id: `media-team-${slug}`,
  name: `team-${slug}.jpg`,
  alt: `${titleCase(slug)} headshot`,
  width: 1200,
  height: 1500
}));

const mediaInputs: MediaInput[] = [
  { id: "media-hero-homepage", name: "hero-homepage-screenshot.jpg", alt: "The Three Acts homepage rendered full-bleed in a browser" },
  { id: "media-hero-cms", name: "hero-cms-editorial-workspace.jpg", alt: "The private CMS editorial workspace, record editor pane open" },
  { id: "media-hero-api-bridge", name: "hero-api-bridge-diagram.jpg", alt: "Architecture diagram of the API bridge between the web app, CMS and data stores" },
  { id: "media-hero-shop", name: "hero-shop-storefront.jpg", alt: "The shop grid showing template pieces and licence tiers" },
  ...productShots,
  { id: "media-product-lineup", name: "product-lineup-overview.jpg", alt: "All eighteen template pieces laid out as a single overview graphic" },
  { id: "media-article-astro-build", name: "article-static-first-astro-build.jpg", alt: "Terminal output of an Astro static build finishing successfully" },
  { id: "media-article-cms-schema", name: "article-cms-schema-registry.jpg", alt: "Code editor showing the collection registry file" },
  { id: "media-article-api-bridge", name: "article-typed-api-bridge.jpg", alt: "Diagram of a typed request flowing from the CMS through the API bridge" },
  { id: "media-article-domain-packages", name: "article-domain-packages.jpg", alt: "Folder tree of the four domain packages in an editor sidebar" },
  { id: "media-article-neon-migration", name: "article-neon-postgres-migration.jpg", alt: "A schema diff ready to review before a migration" },
  { id: "media-article-deploy-pipeline", name: "article-deploy-pipeline.jpg", alt: "" },
  { id: "media-article-design-tokens", name: "article-design-system-tokens.jpg", alt: "Swatches of the paper-and-ink theme tokens next to the dark CMS theme" },
  { id: "media-article-auth-package", name: "article-auth-package-sessions.jpg", alt: "Sequence diagram of a sign-in request issuing a session token" },
  { id: "media-article-checkout-flow", name: "article-checkout-flow.jpg", alt: "The storefront checkout flow, cart to confirmation" },
  { id: "media-article-forms-package", name: "article-forms-package-lead-scoring.jpg", alt: "" },
  { id: "media-article-release-notes", name: "article-release-notes-banner.jpg", alt: "A changelog entry list with version tags" },
  { id: "media-article-case-study", name: "article-agency-case-study.jpg", alt: "Split screen of a client site before and after moving onto Three Acts", license: "licensed" },
  { id: "media-team-group", name: "team-group-call-2026.jpg", alt: "The whole Three Acts team on a video call", sensitive: true },
  { id: "media-team-offsite", name: "IMG_5502.HEIC.jpg", alt: "", sensitive: true, license: "unknown" },
  ...teamPhotos,
  { id: "media-logo-primary", name: "three-acts-logo.png", alt: "Three Acts logo", width: 1024, height: 1024 },
  { id: "media-logo-mono", name: "three-acts-logo-mono.png", alt: "Three Acts logo, single colour", width: 1024, height: 1024 },
  { id: "media-logo-wordmark", name: "three-acts-wordmark.png", alt: "Three Acts wordmark", width: 2400, height: 600 },
  { id: "media-og-default", name: "og-default-template.jpg", alt: "The Three Acts public site and CMS editorial workspace side by side", width: 1200, height: 630 },
  { id: "media-og-launch", name: "og-launch-2026.jpg", alt: "Three Acts launch banner", width: 1200, height: 630 },
  { id: "media-partner-studio-cape-town", name: "partner-studio-cape-town.jpg", alt: "A partner agency's studio in Cape Town, working on a client build", license: "licensed" },
  { id: "media-partner-case-study-site", name: "partner-case-study-storefront.jpg", alt: "A client storefront built on Three Acts" },
  { id: "media-lifestyle-laptop-desk", name: "lifestyle-laptop-standing-desk.jpg", alt: "A laptop open to the CMS on a standing desk" },
  { id: "media-lifestyle-pair-programming", name: "lifestyle-pair-programming.jpg", alt: "Two developers pair programming on a client build" },
  { id: "media-lifestyle-coffee-code", name: "lifestyle-coffee-and-code.jpg", alt: "A cup of coffee next to a laptop showing a pull request" },
  { id: "media-infra-vercel-dashboard", name: "infra-vercel-deploy-dashboard.jpg", alt: "The Vercel deploy dashboard mid-build" },
  { id: "media-infra-supabase-dashboard", name: "infra-supabase-table-editor.jpg", alt: "The Supabase table editor showing the collection registry's tables" },
  { id: "media-instagram-grid-01", name: "ig-grid-01.jpg", alt: "", width: 1080, height: 1080, license: "unknown" },
  {
    id: "media-pdf-agency-licence",
    name: "agency-licence-agreement-2026.pdf",
    alt: "",
    width: 0,
    height: 0,
    sensitive: true,
    file: `${cdn}/documents/agency-licence-agreement-2026.pdf`
  },
  { id: "media-pdf-quickstart", name: "three-acts-quickstart-guide.pdf", alt: "", width: 0, height: 0, file: `${cdn}/documents/three-acts-quickstart-guide.pdf` },
  { id: "media-pdf-api-reference", name: "api-bridge-reference.pdf", alt: "", width: 0, height: 0, file: `${cdn}/documents/api-bridge-reference.pdf` },
  {
    id: "media-pdf-company-registration",
    name: "three-acts-company-registration.pdf",
    alt: "",
    width: 0,
    height: 0,
    sensitive: true,
    file: `${cdn}/documents/three-acts-company-registration.pdf`
  },
  {
    id: "media-video-product-walkthrough",
    name: "product-walkthrough-demo.mp4",
    alt: "Screen recording walking through the shop, cart and checkout flow",
    width: 1920,
    height: 1080,
    file: `${cdn}/video/product-walkthrough-demo.mp4`
  },
  { id: "media-svg-brand-mark", name: "brand-mark.svg", alt: "", width: 48, height: 48, file: `${cdn}/brand/brand-mark.svg` }
];

const mediaLibrary: CmsRecord[] = mediaInputs.map((input, index) => {
  const width = input.width ?? 1600;
  const height = input.height ?? 1067;
  const uploadedAt = daysAgo(Math.floor(190 - index * 2.3), index % 12);
  return dataRecord(
    input.id,
    uploadedAt,
    {
      assetName: input.name,
      altText: input.alt,
      license: input.license ?? "owned",
      width,
      height,
      sensitive: input.sensitive ?? false,
      file: input.file ?? photo(input.id, width, height),
      uploadedAt,
      assetId: input.id
    },
    daysAgo(Math.max(0, Math.floor(185 - index * 2.3) - (index % 4) * 10), index % 7)
  );
});

// --- Form submissions ----------------------------------------------------------

type Source = "contact" | "newsletter" | "product_enquiry" | "agency" | "support";

const people = [
  "Thandiwe Mokoena",
  "Johan Botha",
  "Aisha Davids",
  "Sipho Dlamini",
  "Megan O'Reilly",
  "Ruan Pretorius",
  "Naledi Sithole",
  "Chloé Dubois",
  "Kagiso Molefe",
  "Lerato Nkosi",
  "Yusuf Adams",
  "Anri Venter",
  "Ntombi Zulu",
  "Bongani Mahlangu",
  "Priya Naidoo",
  "Zoë François-Louw",
  "Émile Joubert",
  "Siyabonga Cele",
  "Karabo Mothibi",
  "Jéssica Gonçalves",
  "Liam Fourie",
  "Nomvula Khoza",
  "Tariq Hendricks",
  "Ayanda Mthembu",
  "Hannah Schäfer",
  "Mandla Ngcobo",
  "Rosa Martínez",
  "Wandile Shabalala",
  "Gugu Mabaso",
  "Nikolai Petrov"
];

const messages: Record<Source, string[]> = {
  contact: [
    "Do single-site licences cover a staging subdomain too, or do I need a second seat?",
    "Can I upgrade from a single-site licence to the agency licence later, or do I have to buy fresh?",
    "Is there a trial before I buy the complete bundle?",
    "Do you offer student or open-source pricing?",
    "Can I get an invoice instead of a card receipt, for our accounting?",
    "Is the CMS included with every licence or is it a separate purchase?"
  ],
  product_enquiry: [
    "Does the auth package support magic links, or just email and password?",
    "Can the ecommerce package run without a payment provider configured, for a demo build?",
    "Will the forms module work if I'm not using the CMS at all?",
    "Does the Supabase data store integration ship with row-level security policies out of the box?",
    "Is the Vercel deploy integration required, or can I self-host on another platform?",
    "Can I swap the wireframe theme for my own without touching the domain packages?",
    "Does the account module include order history, or just profile details?"
  ],
  agency: [
    "We're a 12-person agency in Cape Town shipping four to six client sites a quarter and want to standardise on Three Acts. What does the agency licence cover?",
    "Studio of six in London. We'd fork this for every client build — is white-labelling the CMS allowed under the agency licence?",
    "We run a small dev shop and want to trial Three Acts on one client project before committing to the agency tier. Is that possible?",
    "Boutique agency, three devs, mostly Webflow migrations. Interested in a call about the agency licence and support SLA.",
    "We manage twenty-plus client sites and want a volume quote for the agency licence across the team.",
    "Freelance collective of four — does the agency licence apply to a collective, or only to registered companies?"
  ],
  support: [
    "Order #TA-10482 shows as paid but I never got the licence key email — can you resend it?",
    "Charged twice for order #TA-10517. Please refund one of them.",
    "The discount code WELCOME10 isn't applying at checkout — is it expired?",
    "My download link for order #TA-10758 says it expired after only two days — screenshot attached.",
    "I bought the wrong licence tier on order #TA-10603. Can you swap it to the agency licence and I'll pay the difference?",
    "Repo access for order #TA-10491 hasn't come through yet, it's been three days.",
    "Can I change the billing email on an order I placed this morning?"
  ],
  newsletter: [""]
};

const sources: Source[] = ["contact", "newsletter", "product_enquiry", "agency", "support"];

/** Maps the internal source taxonomy onto the registry's `form` options: agency enquiries alone use `inquiry`. */
const formForSource: Record<Source, "contact" | "newsletter" | "inquiry"> = {
  contact: "contact",
  newsletter: "newsletter",
  product_enquiry: "contact",
  agency: "inquiry",
  support: "contact"
};

/** Index-aligned with `messages.agency`, so a message about a specific studio gets that studio's name. */
const agencyCompanies = ["Cape Coast Digital", "Foreshore Studio", "Bramble & Co", "Southbound Agency", "Dial Tone Collective", "Harbourline Creative"];

/** Company is only realistic for the agency-derived inquiries; product/support enquiries stay personal. */
function companyFor(source: Source, index: number): string {
  if (source !== "agency") return "";
  return agencyCompanies[index % agencyCompanies.length];
}

function phoneFor(): string {
  return `+27 ${pick(["60", "61", "71", "72", "73", "74", "76", "79", "81", "82", "83", "84"])} ${int(100, 999)} ${String(int(0, 9999)).padStart(4, "0")}`;
}

function emailFor(name: string, index: number): string {
  const local = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim()
    .replace(/\s+/g, pick([".", "", "_"]));
  const domain = pick(["gmail.com", "outlook.com", "icloud.com", "protonmail.com", "webmail.co.za", "yahoo.com"]);
  return index % 7 === 0 ? `${local}${index}@${domain}` : `${local}@${domain}`;
}

const formSubmissions: CmsRecord[] = [];

for (let index = 0; index < 78; index += 1) {
  const source = sources[index % sources.length];
  const name = people[(index * 7) % people.length];
  const id = `form-${String(index + 1).padStart(3, "0")}`;
  const submittedAt = daysAgo(Math.floor((index * 181) / 78), int(0, 23));
  const pool = messages[source];
  const message = source === "newsletter" ? "" : pool[index % pool.length];
  const wantsAttachment = (source === "support" && message.includes("screenshot attached")) || (source === "agency" && index % 10 === 3);
  const attachment = wantsAttachment
    ? `${cdn}/uploads/form-submissions/${id}-${source === "support" ? "checkout-error-screenshot.png" : "studio-portfolio.pdf"}`
    : "";
  const baseScore = { agency: 70, product_enquiry: 45, contact: 30, support: 20, newsletter: 10 }[source];
  const form = formForSource[source];

  formSubmissions.push(
    dataRecord(id, submittedAt, {
      submittedBy: source === "newsletter" && index % 3 === 0 ? "Newsletter subscriber" : name,
      email: emailFor(name, index),
      message,
      form,
      company: companyFor(source, index),
      phone: form === "inquiry" ? phoneFor() : "",
      score: Math.min(100, baseScore + int(0, 30)),
      consent: source === "newsletter" ? true : rand() > 0.35,
      attachment,
      submittedAt,
      submissionId: id
    })
  );
}

// Spam that slipped past the honeypot.
formSubmissions.push(
  dataRecord("form-spam-seo", daysAgo(12, 3), {
    submittedBy: "SEO Expert",
    email: "rank1.guaranteed@seo-growth-pros.biz",
    message: "Dear Sir/Madam, I checked threeacts.dev and found 47 SEO errors!!! We guarantee page 1 on Google in 7 days. Reply for FREE audit >>> http://bit.ly/xx",
    form: "contact",
    company: "",
    phone: "",
    score: 0,
    consent: false,
    attachment: "",
    submittedAt: daysAgo(12, 3),
    submissionId: "form-spam-seo"
  }),
  dataRecord("form-spam-crypto", daysAgo(33, 18), {
    submittedBy: "Мария",
    email: "xq7f2k@mail-temp.ru",
    message: "Crypto investment opportunity 300% monthly returns — WhatsApp +44 7700 900000 now",
    form: "inquiry",
    company: "",
    phone: "",
    score: 0,
    consent: false,
    attachment: "",
    submittedAt: daysAgo(33, 18),
    submissionId: "form-spam-crypto"
  })
);

export const siteSeed: SeedCollections = {
  "site-settings": siteSettings,
  "page-settings": pageSettings,
  "redirect-rules": redirectRules,
  "media-library": mediaLibrary,
  "form-submissions": formSubmissions
};
