import { serializeImageValue } from "../images";
import type { CmsRecord, CmsRecordValue } from "../types";
import { authorSlugs, productSlugs, seedBrand, staticPagePaths } from "./keys";
import { createRandom, daysAgo, seedRecord, type SeedCollections } from "./types";

/**
 * Site seed: the settings screens and operational data of the launched
 * Fynbos & Fire website — sitewide SEO defaults, per-page SEO for every static
 * route, redirects carried over from the old Shopify store, the media library,
 * inbound form submissions and the CMS team.
 *
 * `site-settings` and `page-settings` are editorial (publish workflow).
 * `redirect-rules`, `media-library` and `cms-users` are `data` and
 * `form-submissions` is `readonly`: like records the API creates, they sit at
 * `not_published` with no live snapshot.
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
  logo: `${origin}/brand/fynbos-and-fire-logo.png`,
  email: "hello@fynbosandfire.co.za",
  telephone: "+27 21 447 1290",
  address: {
    "@type": "PostalAddress",
    streetAddress: "14 Lower Main Road",
    addressLocality: "Observatory, Cape Town",
    postalCode: "7925",
    addressRegion: "Western Cape",
    addressCountry: "ZA"
  },
  sameAs: ["https://www.instagram.com/fynbosandfire", "https://x.com/fynbosandfire", "https://www.facebook.com/fynbosandfire"]
};

const siteSettingsValues: Record<string, CmsRecordValue> = {
  siteName: seedBrand.name,
  titleTemplate: "%s · Fynbos & Fire",
  defaultMetaDescription:
    "Small-batch specialty coffee roasted in Observatory, Cape Town. Single origins, house blends and brewing gear, delivered fresh across South Africa.",
  defaultOgImage: ogImage("og-default-roastery", "og-default-roastery.jpg", "Fresh coffee beans cooling on the roaster tray at Fynbos & Fire"),
  favicon: serializeImageValue({ src: `${origin}/favicon.svg`, fileName: "favicon.svg", size: 1_184 }),
  twitterHandle: "@fynbosandfire",
  locale: "en_ZA",
  allowIndexing: true,
  schemaMarkup: jsonLd(organizationLd)
};

const siteSettings: CmsRecord[] = [
  // Draft edit: the marketing team is rewording the default description and
  // swapping the default share image; the site still renders the launch copy.
  seedRecord({
    id: "site-settings-main",
    publishStatus: "draft",
    createdAt: daysAgo(210),
    modifiedAt: daysAgo(2, 3),
    values: siteSettingsValues,
    liveValues: {
      ...siteSettingsValues,
      defaultMetaDescription: "Specialty coffee roasted in Cape Town. Shop single origins, blends and brewing gear online.",
      defaultOgImage: ogImage("og-launch-2026", "og-launch-2026.jpg", "Fynbos & Fire launch banner"),
      schemaMarkup: jsonLd({ ...organizationLd, sameAs: ["https://www.instagram.com/fynbosandfire"] })
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
    ["How fresh is the coffee when it arrives?", "We roast Monday to Thursday and ship within 48 hours of roasting, so most orders arrive 3–5 days off roast."],
    ["Do you grind beans to order?", "Yes. Choose whole bean or a grind for espresso, AeroPress, V60, Chemex, plunger or moka pot at checkout."],
    ["How much is delivery?", "Standard delivery is R95 anywhere in South Africa and free on orders over R750. Cape Town same-day courier is R65."],
    ["Can I pause or cancel a subscription?", "Any time from your account page, up to two days before your next roast date."]
  ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } }))
};

const roasteryLd = {
  "@context": "https://schema.org",
  "@type": "CafeOrCoffeeShop",
  "@id": `${origin}/visit-the-roastery#cafe`,
  name: "Fynbos & Fire Roastery & Espresso Bar",
  image: photo("media-hero-roastery"),
  url: `${origin}/visit-the-roastery`,
  telephone: "+27 21 447 1290",
  priceRange: "R",
  servesCuisine: "Coffee",
  address: organizationLd.address,
  geo: { "@type": "GeoCoordinates", latitude: -33.9383, longitude: 18.4713 },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "07:00", closes: "15:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "08:00", closes: "13:00" }
  ],
  parentOrganization: { "@id": `${origin}/#organization` }
};

const pages: Record<(typeof staticPagePaths)[number], PageInput> = {
  "/": {
    path: "/",
    name: "Home",
    metaTitle: "Specialty coffee roasted in Cape Town",
    metaDescription: "Fresh-roasted single origins and house blends from our Observatory roastery, plus the gear to brew them well. Free delivery over R750.",
    ogTitle: "Fynbos & Fire · Specialty coffee roasted in Cape Town",
    ogImage: ogImage("og-home", "og-home.jpg", "Pour-over coffee on a wooden counter at the Fynbos & Fire roastery"),
    schemaMarkup: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: seedBrand.name,
      url: origin,
      inLanguage: "en-ZA",
      publisher: { "@id": `${origin}/#organization` },
      potentialAction: { "@type": "SearchAction", target: `${origin}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" }
    }
  },
  "/about": {
    path: "/about",
    name: "About",
    metaTitle: "Our story",
    metaDescription: "Started on a 5 kg Toper in a Woodstock garage in 2019, Fynbos & Fire now roasts direct-trade coffee for homes and cafés across South Africa.",
    ogImage: ogImage("og-about", "og-about-team.jpg", "The Fynbos & Fire team outside the roastery")
  },
  "/shop": {
    path: "/shop",
    name: "Shop",
    metaTitle: "Shop coffee beans & brewing gear",
    metaDescription: "Single origins, espresso blends, Swiss Water decaf, grinders, drippers and gift sets. Roasted to order and shipped within 48 hours.",
    ogImage: ogImage("og-shop", "og-shop.jpg", "Bags of Fynbos & Fire coffee lined up on a shelf"),
    searchTitle: "Buy fresh coffee beans online | South Africa",
    schemaMarkup: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Shop coffee beans & brewing gear",
      url: `${origin}/shop`,
      isPartOf: { "@id": `${origin}/#website` },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: productSlugs.slice(0, 6).map((slug, index) => ({ "@type": "ListItem", position: index + 1, url: `${origin}/shop/${slug}` }))
      }
    }
  },
  "/blog": {
    path: "/blog",
    name: "Journal",
    metaTitle: "The brewing journal",
    metaDescription: "Brew guides, origin stories, gear reviews and news from the roastery floor.",
    ogImage: ogImage("og-journal", "og-journal.jpg", "Notebook and V60 on a café table"),
    schemaMarkup: { "@context": "https://schema.org", "@type": "Blog", name: "The Fynbos & Fire brewing journal", url: `${origin}/blog`, publisher: { "@id": `${origin}/#organization` } }
  },
  "/contact": {
    path: "/contact",
    name: "Contact",
    metaTitle: "Contact us",
    metaDescription: "Questions about an order, a grinder or a wholesale account? Email hello@fynbosandfire.co.za or call +27 21 447 1290, weekdays 8am–4pm.",
    schemaMarkup: { "@context": "https://schema.org", "@type": "ContactPage", name: "Contact Fynbos & Fire", url: `${origin}/contact` }
  },
  "/faq": {
    path: "/faq",
    name: "FAQ",
    metaTitle: "Frequently asked questions",
    metaDescription: "Roast dates, grind options, delivery costs, subscriptions and returns — answered.",
    schemaMarkup: faqLd
  },
  "/wholesale": {
    path: "/wholesale",
    name: "Wholesale",
    metaTitle: "Wholesale coffee for cafés & offices",
    metaDescription:
      "Roasted-to-order espresso and filter coffee for Western Cape cafés, restaurants and offices, with barista training, equipment support and weekly delivery.",
    ogTitle: "Wholesale coffee partners · Fynbos & Fire",
    ogImage: ogImage("og-wholesale", "og-wholesale.jpg", "Barista pulling a shot on a La Marzocco at a partner café")
  },
  "/subscriptions": {
    path: "/subscriptions",
    name: "Subscriptions",
    metaTitle: "Coffee subscriptions",
    metaDescription: "Fresh coffee on your schedule: choose a roast, a grind and a delivery rhythm, and skip or pause whenever you like. Launching soon.",
    ogImage: ogImage("og-subscriptions", "og-subscriptions.jpg", "Monthly subscription box with two bags of coffee")
  },
  "/shipping": {
    path: "/shipping",
    name: "Shipping",
    metaTitle: "Shipping & delivery",
    metaDescription: "R95 standard delivery nationwide, free over R750. Same-day courier in the Cape Town metro for orders placed before 11am."
  },
  "/returns": {
    path: "/returns",
    name: "Returns",
    metaTitle: "Returns & refunds",
    metaDescription: "Unopened gear can be returned within 30 days. If your coffee isn't right, tell us and we'll make it right."
  },
  "/terms": {
    path: "/terms",
    name: "Terms",
    metaTitle: "Terms & conditions",
    metaDescription: "The terms that apply when you shop with Fynbos & Fire (Pty) Ltd, including orders, pricing, delivery and subscriptions."
  },
  "/privacy": {
    path: "/privacy",
    name: "Privacy",
    metaTitle: "Privacy policy",
    metaDescription: "How Fynbos & Fire collects, uses and protects your personal information in line with POPIA."
  },
  "/careers": {
    path: "/careers",
    name: "Careers",
    metaTitle: "Work with us",
    metaDescription: "We're hiring a production roaster and a weekend barista at our Observatory roastery. See open roles and how to apply.",
    ogImage: ogImage("og-careers", "og-careers.jpg", "Roaster checking a bean sample from the trier")
  },
  "/visit-the-roastery": {
    path: "/visit-the-roastery",
    name: "Visit the roastery",
    metaTitle: "Visit our roastery & espresso bar in Observatory",
    metaDescription: "Coffee, cupping sessions and fresh bags straight off the roaster at 14 Lower Main Road, Observatory. Open weekdays 7am–3pm, Saturdays 8am–1pm.",
    ogImage: ogImage("og-roastery", "og-roastery.jpg", "The espresso bar and roaster at 14 Lower Main Road"),
    searchTitle: "Coffee roastery & café in Observatory, Cape Town",
    schemaMarkup: roasteryLd
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
    case "/wholesale":
      return seedRecord({
        id,
        publishStatus: "draft",
        createdAt,
        modifiedAt: daysAgo(3, 2),
        values,
        liveValues: {
          ...values,
          metaTitle: "Wholesale coffee",
          metaDescription: "Fresh-roasted coffee for Cape Town cafés and offices. Get in touch for our wholesale price list.",
          ogTitle: "",
          ogImage: ""
        }
      });
    // Published page with a queued edit: new delivery pricing ships next deploy.
    case "/shipping":
      return seedRecord({
        id,
        publishStatus: "queued_to_publish",
        createdAt,
        modifiedAt: daysAgo(1, 7),
        values,
        liveValues: { ...values, metaDescription: "R85 standard delivery nationwide, free over R650. Same-day courier in the Cape Town metro." }
      });
    // Coming soon: exists in the CMS but is not on the site.
    case "/subscriptions":
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

const shopifyExport = "https://cdn.fynbosandfire.co.za/documents/shopify-url-export-2026-03.csv";

const oldProductNames: Array<[string, (typeof productSlugs)[number]]> = [
  ["yirgacheffe-250g", "ethiopia-yirgacheffe-kochere"],
  ["ethiopian-yirgacheffe", "ethiopia-yirgacheffe-kochere"],
  ["kenya-aa-nyeri", "kenya-nyeri-gatomboya"],
  ["colombia-huila", "colombia-huila-la-esperanza"],
  ["rwanda-single-origin", "rwanda-huye-mountain"],
  ["brazil-natural-1kg", "brazil-cerrado-natural"],
  ["espresso-blend", "house-espresso-blend"],
  ["mountain-blend-filter", "table-mountain-filter-blend"],
  ["decaf-swiss-water", "swiss-water-decaf-peru"],
  ["hario-v60-02-ceramic", "v60-ceramic-dripper"],
  ["chemex-classic-6-cup", "chemex-six-cup"],
  ["aeropress-go-travel", "aeropress-go"],
  ["comandante-c40-mk4", "comandante-c40-grinder"],
  ["baratza-encore-esp-grinder", "baratza-encore-esp"],
  ["fellow-style-kettle", "gooseneck-kettle-900ml"],
  ["coffee-scale-timer", "digital-brew-scale"],
  ["enamel-mug", "enamel-camp-mug"],
  ["canvas-tote", "roastery-tote-bag"],
  ["gift-box-brew-kit", "brew-at-home-gift-set"]
];

const redirectInputs: RedirectInput[] = [
  { source: "collections/coffee", target: "/shop", hits: 18_420, notes: "Main coffee collection on the old Shopify store." },
  { source: "collections/coffee/", target: "/shop", hits: 912, notes: "Trailing-slash variant still linked from old Instagram bio." },
  { source: "collections/all", target: "/shop", hits: 6_103 },
  { source: "collections/equipment", target: "/shop?category=brewers", hits: 3_877 },
  { source: "collections/grinders", target: "/shop?category=grinders", hits: 1_945 },
  { source: "collections/gifts", target: "/shop?category=gift-sets", hits: 2_210 },
  { source: "collections/merch", target: "/shop?category=merch", hits: 488 },
  ...oldProductNames.map(([oldName, slug], index): RedirectInput => ({
    source: `products/${oldName}`,
    target: `/shop/${slug}`,
    hits: 300 + ((index * 1_783) % 9_000),
    evidence: index % 5 === 0 ? shopifyExport : undefined
  })),
  { source: "blogs/news/how-to-brew-v60", target: "/blog/v60-brew-guide", hits: 7_604, notes: "Top organic landing page on the old blog — keep permanently." },
  { source: "blogs/news/aeropress-recipe-competition", target: "/blog/three-aeropress-recipes", hits: 1_322 },
  { source: "blogs/news/meet-our-farmers-huye", target: "/blog/cupping-table-our-rwanda-huye-mountain", hits: 640 },
  { source: "blogs/news/grinder-buying-guide", target: "/blog/comandante-c40-vs-baratza-encore-esp", hits: 2_987 },
  { source: "blogs/news/our-new-roaster-has-arrived", target: "/blog/meet-tannie-our-new-roaster", hits: 415 },
  { source: "blogs/news", target: "/blog", hits: 3_450 },
  { source: "blogs/news/tagged/brew-guide", target: "/blog?category=brew-guides", hits: 211 },
  { source: "pages/contact-us", target: "/contact", hits: 4_560 },
  { source: "pages/about-us", target: "/about", hits: 2_108 },
  { source: "pages/faqs", target: "/faq", hits: 1_734 },
  { source: "pages/wholesale-enquiries", target: "/wholesale", hits: 1_089 },
  { source: "pages/shipping-policy", target: "/shipping", hits: 820 },
  { source: "pages/refund-policy", target: "/returns", hits: 507 },
  { source: "policies/terms-of-service", target: "/terms", hits: 233 },
  { source: "policies/privacy-policy", target: "/privacy", hits: 301 },
  { source: "pages/find-us", target: "/visit-the-roastery", hits: 1_266 },
  { source: "cart", target: "/shop", code: "302", hits: 2_044, notes: "Old Shopify cart URL; carts didn't migrate so send people to the shop." },
  { source: "account/login", target: "/shop", code: "302", hits: 980, notes: "Customer accounts are being rebuilt. Temporary until the new login ships." },
  {
    source: "?wc-api=wc_gateway_payfast",
    target: "/contact",
    code: "302",
    hits: 37,
    notes: "Query-string source from the older WooCommerce PayFast callback. Hit by stale payment notifications — review after Q4."
  },
  { source: "product-category/coffee-beans", target: "/shop?category=single-origin", hits: 1_511, notes: "WooCommerce-era category path (pre-2023)." },
  { source: "black-friday", target: "/shop?campaign=black-friday-2026", code: "302", hits: 0, notes: "Campaign vanity URL for printed flyers. Switch off in December." },
  { source: "fathers-day", target: "/shop?category=gift-sets&utm_source=vanity&utm_campaign=fathers-day-2026", code: "307", hits: 1_402 },
  { source: "brew-guide", target: "https://cdn.fynbosandfire.co.za/documents/fynbos-and-fire-brew-guide.pdf", code: "302", hits: 3_318, notes: "QR code on every bag. External CDN target." },
  { source: "careers", target: "https://fynbos-and-fire.bamboohr.com/careers", code: "302", hits: 96, notes: "External job board until /careers is live — remove when the page ships." },
  { source: "wholesale/apply", target: "/wholesale-enquiry", code: "302", hits: 58, notes: "LOOP RISK: /wholesale-enquiry points back here. Keep only one of the pair." },
  { source: "wholesale-enquiry", target: "/wholesale/apply", code: "302", hits: 61, notes: "LOOP RISK: pairs with /wholesale/apply. Delete once the new form URL is confirmed." },
  {
    source: "old/pricing/legacy/wholesale/2024/very/deep/path",
    target: `${origin}/wholesale?utm_source=legacy&utm_medium=redirect&utm_campaign=wholesale-price-list-2024-reprint`,
    code: "308",
    hits: 124,
    notes: "Deep path and long query string from a 2024 printed price list; stresses column truncation and CSV export.",
    evidence: "https://cdn.fynbosandfire.co.za/documents/redirect-audit-2026-03.csv"
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

const cdn = "https://cdn.fynbosandfire.co.za";

const productShots: MediaInput[] = productSlugs.map((slug) => ({
  id: `media-product-${slug}`,
  name: `${slug}.jpg`,
  alt: `${slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} product photo on a white background`,
  width: 1600,
  height: 1600
}));

const mediaInputs: MediaInput[] = [
  { id: "media-hero-roastery", name: "hero-roastery-toper.jpg", alt: "Pieter tipping a fresh batch from the Toper roaster into the cooling tray" },
  { id: "media-hero-espresso-bar", name: "hero-espresso-bar.jpg", alt: "Morning light over the espresso bar at the Observatory roastery" },
  { id: "media-hero-table-mountain", name: "hero-table-mountain-mug.jpg", alt: "Enamel mug of coffee with Table Mountain in the background", license: "licensed" },
  { id: "media-hero-subscriptions", name: "hero-subscriptions-box.jpg", alt: "Subscription box open on a kitchen counter" },
  ...productShots,
  { id: "media-product-range-flatlay", name: "product-range-flatlay.jpg", alt: "Flat lay of all eight coffees in their bags" },
  { id: "media-article-v60-guide", name: "article-v60-pour.jpg", alt: "Gooseneck kettle pouring into a ceramic V60" },
  { id: "media-article-aeropress-recipes", name: "article-aeropress-inverted.jpg", alt: "AeroPress in the inverted position on a scale" },
  { id: "media-article-huye-mountain", name: "article-huye-washing-station.jpg", alt: "Cherry drying on raised beds at Huye Mountain washing station, Rwanda", license: "licensed" },
  { id: "media-article-grinder-guide", name: "article-hand-grinders.jpg", alt: "Three hand grinders side by side" },
  { id: "media-article-observatory-move", name: "article-new-roastery-keys.jpg", alt: "" },
  { id: "media-article-water-chemistry", name: "article-water-chemistry.jpg", alt: "Glass beakers of water next to a TDS meter" },
  { id: "media-article-cupping", name: "article-cupping-table.jpg", alt: "Cupping bowls lined up with spoons" },
  { id: "media-article-kenya-harvest", name: "article-kenya-nyeri-harvest.jpg", alt: "Pickers sorting ripe cherry in Nyeri", license: "creative_commons" },
  { id: "media-article-compost", name: "article-chaff-compost.jpg", alt: "Coffee chaff being added to a community garden compost heap" },
  { id: "media-article-latte-art", name: "article-latte-art-rosetta.jpg", alt: "" },
  { id: "media-article-cold-brew", name: "article-cold-brew-jars.jpg", alt: "Mason jars of cold brew steeping overnight" },
  { id: "media-team-lindiwe", name: "team-lindiwe-khumalo.jpg", alt: "Lindiwe Khumalo, co-founder and head of coffee", width: 1200, height: 1500 },
  { id: "media-team-pieter", name: "team-pieter-van-wyk.jpg", alt: "Pieter van Wyk, head roaster", width: 1200, height: 1500 },
  { id: "media-team-ama", name: "team-ama-mensah.jpg", alt: "Ama Mensah, wholesale and training lead", width: 1200, height: 1500 },
  { id: "media-team-jordan", name: "team-jordan-le-roux.jpg", alt: "Jordan le Roux, espresso bar manager", width: 1200, height: 1500 },
  { id: "media-team-zanele", name: "team-zanele-ndlovu.jpg", alt: "Zanele Ndlovu, green coffee buyer", width: 1200, height: 1500 },
  { id: "media-team-group", name: "team-group-photo-2026.jpg", alt: "The whole Fynbos & Fire team outside the roastery", sensitive: true },
  { id: "media-team-staff-party", name: "IMG_4471.HEIC.jpg", alt: "", sensitive: true, license: "unknown" },
  { id: "media-logo-primary", name: "fynbos-and-fire-logo.png", alt: "Fynbos & Fire logo", width: 1024, height: 1024 },
  { id: "media-logo-mono", name: "fynbos-and-fire-logo-mono.png", alt: "Fynbos & Fire logo, single colour", width: 1024, height: 1024 },
  { id: "media-logo-wordmark", name: "fynbos-and-fire-wordmark.png", alt: "Fynbos & Fire wordmark", width: 2400, height: 600 },
  { id: "media-og-default", name: "og-default-roastery.jpg", alt: "Fresh coffee beans cooling on the roaster tray", width: 1200, height: 630 },
  { id: "media-og-launch", name: "og-launch-2026.jpg", alt: "Fynbos & Fire launch banner", width: 1200, height: 630 },
  { id: "media-partner-cafe-bree", name: "partner-cafe-bree-street.jpg", alt: "A partner café on Bree Street serving our house espresso", license: "licensed" },
  { id: "media-partner-market", name: "partner-oranjezicht-market-stall.jpg", alt: "Our stall at the Oranjezicht City Farm market" },
  { id: "media-lifestyle-camp-coffee", name: "lifestyle-camp-coffee-cederberg.jpg", alt: "AeroPress Go and enamel mug on a rock in the Cederberg" },
  { id: "media-lifestyle-kitchen-v60", name: "lifestyle-kitchen-v60.jpg", alt: "Morning V60 brew in a sunny kitchen" },
  { id: "media-lifestyle-gift-wrap", name: "lifestyle-gift-set-wrapped.jpg", alt: "Brew at home gift set wrapped in brown paper and twine" },
  { id: "media-roastery-green-beans", name: "roastery-green-bean-sacks.jpg", alt: "Jute sacks of green coffee stacked in the warehouse" },
  { id: "media-instagram-grid-01", name: "ig-grid-01.jpg", alt: "", width: 1080, height: 1080, license: "unknown" },
  {
    id: "media-pdf-wholesale-price-list",
    name: "wholesale-price-list-2026.pdf",
    alt: "",
    width: 0,
    height: 0,
    sensitive: true,
    file: `${cdn}/documents/wholesale-price-list-2026.pdf`
  },
  { id: "media-pdf-brew-guide", name: "fynbos-and-fire-brew-guide.pdf", alt: "", width: 0, height: 0, file: `${cdn}/documents/fynbos-and-fire-brew-guide.pdf` },
  { id: "media-pdf-barista-training", name: "barista-training-syllabus.pdf", alt: "", width: 0, height: 0, file: `${cdn}/documents/barista-training-syllabus.pdf` },
  { id: "media-pdf-bbbee-certificate", name: "bbbee-certificate-2026.pdf", alt: "", width: 0, height: 0, sensitive: true, file: `${cdn}/documents/bbbee-certificate-2026.pdf` },
  { id: "media-video-roast-day", name: "roast-day-timelapse.mp4", alt: "Timelapse of a full roast day, from green bean to bag", width: 1920, height: 1080, file: `${cdn}/video/roast-day-timelapse.mp4` },
  { id: "media-svg-map-pin", name: "map-pin.svg", alt: "", width: 48, height: 48, file: `${cdn}/brand/map-pin.svg` }
];

const mediaLibrary: CmsRecord[] = mediaInputs.map((input, index) => {
  const width = input.width ?? 1600;
  const height = input.height ?? 1067;
  const uploadedAt = daysAgo(Math.floor(190 - index * 2.9), index % 12);
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
    daysAgo(Math.max(0, Math.floor(185 - index * 2.9) - (index % 4) * 10), index % 7)
  );
});

// --- Form submissions ----------------------------------------------------------

type Source = "contact" | "newsletter" | "product_enquiry" | "wholesale" | "support";

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
    "Hi! Are you open on public holidays? Hoping to pop in on Heritage Day.",
    "Do you do cupping sessions for groups? We're 8 people for a birthday.",
    "Loved the Kochere at the market on Saturday. Is it on the website yet?",
    "Can I park at the roastery or is it street parking only?",
    "Is there a way to collect orders from Observatory instead of paying delivery?",
    "Your bags — are they recyclable? I'd love to send them back if you reuse them."
  ],
  product_enquiry: [
    "Is the Comandante C40 fine enough for espresso or should I look at the Encore ESP?",
    "What grind should I pick for a Bialetti moka pot?",
    "When will the Huye Mountain be back in stock?",
    "Does the gooseneck kettle work on an induction hob?",
    "Is the house espresso blend dark enough for milk drinks? I usually buy Italian-style.",
    "How much caffeine is left in the Swiss Water decaf? Asking for my pregnant partner.",
    "Can I get the gift set with the Chemex instead of the V60?"
  ],
  wholesale: [
    "We're opening a 30-seat café in Muizenberg in November and are looking for an espresso supplier. We'd need about 15 kg a week. Do you offer machine support?",
    "Office of 60 in the Foreshore. Looking for weekly filter coffee and possibly a bean-to-cup machine. Can you send the price list?",
    "Guesthouse in Franschhoek, 12 rooms. Interested in branded drip bags for the rooms.",
    "We run three bakeries in the Southern Suburbs and want to switch roasters. Could we arrange a tasting?",
    "Restaurant group in Stellenbosch — interested in a custom blend for our after-dinner espresso. Minimum order?",
    "Do you supply decaf in 1 kg bags for trade? We go through about 3 kg a week."
  ],
  support: [
    "Order #FF-10482 was marked delivered but nothing arrived. The courier says it was left at the gate?",
    "I ordered whole bean but received ground for plunger. Can I swap it?",
    "My Encore ESP is making a grinding noise after two weeks. Is it under warranty?",
    "Charged twice for order #FF-10517. Please refund one of them.",
    "The discount code WELCOME10 isn't working at checkout.",
    "My bag arrived with a split seam and beans everywhere. Photo attached.",
    "Can I change the delivery address on an order I placed this morning?"
  ],
  newsletter: [""]
};

const sources: Source[] = ["contact", "newsletter", "product_enquiry", "wholesale", "support"];

function emailFor(name: string, index: number): string {
  const local = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim()
    .replace(/\s+/g, pick([".", "", "_"]));
  const domain = pick(["gmail.com", "outlook.com", "icloud.com", "mweb.co.za", "webmail.co.za", "yahoo.com"]);
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
  const wantsAttachment = (source === "support" && message.includes("Photo attached")) || (source === "wholesale" && index % 10 === 3);
  const attachment = wantsAttachment
    ? `${cdn}/uploads/form-submissions/${id}-${source === "support" ? "damaged-bag.jpg" : "cafe-floor-plan.pdf"}`
    : "";
  const baseScore = { wholesale: 70, product_enquiry: 45, contact: 30, support: 20, newsletter: 10 }[source];

  formSubmissions.push(
    dataRecord(id, submittedAt, {
      submittedBy: source === "newsletter" && index % 3 === 0 ? "Newsletter subscriber" : name,
      email: emailFor(name, index),
      message,
      source,
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
    message: "Dear Sir/Madam, I checked fynbosandfire.co.za and found 47 SEO errors!!! We guarantee page 1 on Google in 7 days. Reply for FREE audit >>> http://bit.ly/xx",
    source: "contact",
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
    source: "wholesale",
    score: 0,
    consent: false,
    attachment: "",
    submittedAt: daysAgo(33, 18),
    submissionId: "form-spam-crypto"
  })
);

// --- CMS users -----------------------------------------------------------------

type UserInput = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "author" | "viewer";
  status: "active" | "invited" | "suspended";
  authorSlug?: (typeof authorSlugs)[number];
  lastActiveDaysAgo?: number;
  joinedDaysAgo: number;
};

const userInputs: UserInput[] = [
  { id: "user-lindiwe", name: "Lindiwe Khumalo", email: "lindiwe@fynbosandfire.co.za", role: "admin", status: "active", authorSlug: "lindiwe-khumalo", lastActiveDaysAgo: 0, joinedDaysAgo: 220 },
  { id: "user-pieter", name: "Pieter van Wyk", email: "pieter@fynbosandfire.co.za", role: "author", status: "active", authorSlug: "pieter-van-wyk", lastActiveDaysAgo: 3, joinedDaysAgo: 215 },
  { id: "user-ama", name: "Ama Mensah", email: "ama@fynbosandfire.co.za", role: "editor", status: "active", authorSlug: "ama-mensah", lastActiveDaysAgo: 1, joinedDaysAgo: 200 },
  { id: "user-jordan", name: "Jordan le Roux", email: "jordan@fynbosandfire.co.za", role: "author", status: "active", authorSlug: "jordan-le-roux", lastActiveDaysAgo: 12, joinedDaysAgo: 180 },
  { id: "user-zanele", name: "Zanele Ndlovu", email: "zanele@fynbosandfire.co.za", role: "author", status: "active", authorSlug: "zanele-ndlovu", lastActiveDaysAgo: 6, joinedDaysAgo: 170 },
  { id: "user-marco", name: "Marco Ferreira", email: "marco@fynbosandfire.co.za", role: "author", status: "suspended", authorSlug: "marco-ferreira", lastActiveDaysAgo: 74, joinedDaysAgo: 160 },
  { id: "user-fatima", name: "Fatima Patel", email: "fatima@fynbosandfire.co.za", role: "author", status: "invited", authorSlug: "fatima-patel", joinedDaysAgo: 4 },
  { id: "user-sam", name: "Sam Okafor", email: "sam@fynbosandfire.co.za", role: "author", status: "active", authorSlug: "sam-okafor", lastActiveDaysAgo: 21, joinedDaysAgo: 95 },
  { id: "user-thabo", name: "Thabo Mokoena", email: "thabo@fynbosandfire.co.za", role: "admin", status: "active", lastActiveDaysAgo: 2, joinedDaysAgo: 218 },
  { id: "user-kirsten", name: "Kirsten Engelbrecht", email: "kirsten@fynbosandfire.co.za", role: "editor", status: "active", lastActiveDaysAgo: 0, joinedDaysAgo: 140 },
  { id: "user-accounts", name: "Nadia Isaacs", email: "accounts@fynbosandfire.co.za", role: "viewer", status: "active", lastActiveDaysAgo: 30, joinedDaysAgo: 120 },
  { id: "user-agency-dev", name: "Riaan Steyn (Salt Studio)", email: "riaan@saltstudio.agency", role: "editor", status: "active", lastActiveDaysAgo: 9, joinedDaysAgo: 230 },
  { id: "user-intern", name: "Olwethu Gqola", email: "olwethu@fynbosandfire.co.za", role: "viewer", status: "invited", joinedDaysAgo: 1 }
];

const cmsUsers: CmsRecord[] = userInputs.map((input, index) => {
  const createdAt = daysAgo(input.joinedDaysAgo, index);
  const lastActiveAt = input.lastActiveDaysAgo === undefined ? "" : daysAgo(input.lastActiveDaysAgo, index + 1);
  const avatarSeed = `avatar-${input.id.replace(/^user-/, "")}`;
  return dataRecord(
    input.id,
    createdAt,
    {
      name: input.name,
      email: input.email,
      role: input.role,
      status: input.status,
      authorSlug: input.authorSlug ?? "",
      avatar:
        input.status === "invited"
          ? ""
          : serializeImageValue({ src: photo(avatarSeed, 400, 400), fileName: `${avatarSeed}.jpg`, size: 38_000 + index * 1_210, width: 400, height: 400 }),
      lastActiveAt
    },
    input.status === "suspended" ? daysAgo(70) : daysAgo(Math.max(0, input.joinedDaysAgo - 1 - (index % 3)), 0)
  );
});

export const siteSeed: SeedCollections = {
  "site-settings": siteSettings,
  "page-settings": pageSettings,
  "redirect-rules": redirectRules,
  "media-library": mediaLibrary,
  "form-submissions": formSubmissions,
  "cms-users": cmsUsers
};
