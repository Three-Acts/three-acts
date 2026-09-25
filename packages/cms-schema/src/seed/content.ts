import type { CmsRecord, CmsRecordValue, PublishStatus } from "../types";
import { serializeImageValue } from "../images";
import { articleCategorySlugs, authorSlugs, productSlugs, seedBrand } from "./keys";
import { createRandom, daysAgo, seedRecord, type SeedCollections } from "./types";

/**
 * Content seed for Three Acts' own journal: authors, article categories, ~40
 * articles and the FAQ page. The site is the template selling itself — the
 * shop sells the template's pieces, the journal is engineering and design
 * notes about building with it. Fully deterministic — dates come from
 * `daysAgo`, variation from `createRandom`.
 */

type AuthorSlug = (typeof authorSlugs)[number];
type CategorySlug = (typeof articleCategorySlugs)[number];
type ProductSlug = (typeof productSlugs)[number];
type Values = Record<string, CmsRecordValue>;

const emailDomain = seedBrand.domain;

/** A shop link as it appears in article bodies. Typed so only shared product slugs compile. */
function shopLink(slug: ProductSlug): string {
  return `/shop/${slug}`;
}

/** Words per minute used for `readingTime`. The content test checks bodies against this. */
export const READING_WORDS_PER_MINUTE = 220;

export function estimateReadingTime(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / READING_WORDS_PER_MINUTE));
}

function paragraphs(...items: string[]): string {
  return items.map((item) => item.trim()).join("\n\n");
}

function coverImage(slug: string, alt: string): string {
  return serializeImageValue({
    src: `https://picsum.photos/seed/${slug}/1600/900`,
    fileName: `${slug}-cover.jpg`,
    width: 1600,
    height: 900,
    alt
  });
}

// --- Authors -----------------------------------------------------------------

type AuthorSpec = {
  slug: AuthorSlug;
  name: string;
  role: string;
  bio: string;
  email: string;
  websiteUrl?: string;
  xHandle?: string;
  instagramHandle?: string;
  linkedinUrl?: string;
  createdDays: number;
  modifiedDays: number;
  status?: PublishStatus;
};

const authorSpecs: AuthorSpec[] = [
  {
    slug: "nico-de-wet",
    name: "Nico de Wet",
    role: "Founder & Architect",
    bio: "Nico built the first version of Three Acts after forking the same Astro-plus-CMS starter for a fourth client in a row and getting tired of it. He owns the boundary between the public site, the CMS and the API, and still reviews every registry change himself. Based in Cape Town, he is happiest when a system diagram fits on one whiteboard.",
    email: `nico@${emailDomain}`,
    websiteUrl: "https://nicodewet.dev",
    xHandle: "@nicodewet",
    linkedinUrl: "https://www.linkedin.com/in/nico-de-wet",
    createdDays: 610,
    modifiedDays: 40
  },
  {
    slug: "thandi-mokoena",
    name: "Thandi Mokoena",
    role: "CMS Engineer",
    bio: "Thandi owns the Editorial App end to end — the record editor, the publish model, and the pluggable mock/REST backend split. She spent four years building internal admin tools before joining Three Acts and has strong, well-tested opinions about optimistic UI updates.",
    email: `thandi@${emailDomain}`,
    xHandle: "@thandimokoena",
    linkedinUrl: "https://www.linkedin.com/in/thandi-mokoena-cms",
    createdDays: 580,
    modifiedDays: 90
  },
  {
    slug: "sarah-lindqvist",
    name: "Sarah Lindqvist",
    role: "API & Platform Engineer",
    bio: "Sarah owns apps/api: the REST bridge, the Data Store and Blob Store interfaces, and the storefront/auth bridge every browser write goes through. She previously built payment infrastructure at a Stockholm fintech, and she's the reason Three Acts treats Supabase as one implementation among several rather than a dependency.",
    email: `sarah@${emailDomain}`,
    xHandle: "@sarahlindqvist",
    linkedinUrl: "https://www.linkedin.com/in/sarah-lindqvist-platform",
    createdDays: 560,
    modifiedDays: 20
  },
  {
    slug: "kabelo-sithole",
    name: "Kabelo Sithole",
    role: "Design System Lead",
    bio: "Kabelo designed the wireframe design system that ships with the template — tokens, primitives and the dot-notation component API. He trained as a product designer, taught himself enough React to stop waiting on engineers, and now reviews every new component for one-class-per-element discipline.",
    email: `kabelo@${emailDomain}`,
    instagramHandle: "@kabelo.designs",
    linkedinUrl: "https://www.linkedin.com/in/kabelo-sithole-design",
    createdDays: 540,
    modifiedDays: 50
  },
  {
    slug: "maya-rosenberg",
    name: "Maya Rosenberg",
    role: "DX & Docs Writer",
    bio: "Maya writes and maintains CONTEXT.md, the ADRs and the fork-time checklist that keeps new agencies from guessing at the architecture. She joined from a developer-relations role at an API company and treats every support ticket as a missing sentence in the docs.",
    email: `maya@${emailDomain}`,
    xHandle: "@mayarosenberg",
    websiteUrl: "https://mayarosenberg.dev",
    createdDays: 500,
    modifiedDays: 15
  },
  {
    slug: "daniel-okoye",
    name: "Daniel Okoye",
    role: "Front-End Engineer",
    bio: "Daniel owns apps/web's rendering model: static-first Astro pages, islands hydration, and the image pipeline that ships AVIF by default. He is mildly evangelical about shipping zero JavaScript until a page actually needs it, and he profiles every new island before it merges.",
    email: `daniel@${emailDomain}`,
    xHandle: "@danielokoye",
    linkedinUrl: "https://www.linkedin.com/in/daniel-okoye-frontend",
    createdDays: 470,
    modifiedDays: 25
  },
  {
    slug: "lena-fischer",
    name: "Lena Fischer",
    role: "QA & Accessibility",
    bio: "Lena tests every template release against a screen reader, a keyboard-only pass and a slow-network throttle before it ships. She came from an accessibility consultancy in Berlin and maintains the checklist that gates every new UI primitive in the design system.",
    email: `lena@${emailDomain}`,
    linkedinUrl: "https://www.linkedin.com/in/lena-fischer-a11y",
    createdDays: 420,
    modifiedDays: 60
  },
  {
    slug: "ruben-adams",
    name: "Ruben Adams",
    role: "Agency Partnerships",
    bio: "Ruben works with the agencies forking Three Acts for their own clients, from first fork to first deploy. He previously ran delivery at a Cape Town digital agency and is still finishing his first journal post about what that side of the template actually needs.",
    email: `ruben@${emailDomain}`,
    linkedinUrl: "https://www.linkedin.com/in/ruben-adams-partnerships",
    createdDays: 12,
    modifiedDays: 3,
    status: "draft"
  }
];

const authorRecords: CmsRecord[] = authorSpecs.map((spec) =>
  seedRecord({
    id: `author-${spec.slug}`,
    publishStatus: spec.status ?? "published",
    createdAt: daysAgo(spec.createdDays),
    modifiedAt: daysAgo(spec.modifiedDays),
    values: {
      name: spec.name,
      slug: spec.slug,
      role: spec.role,
      bio: spec.bio,
      avatar: serializeImageValue({
        src: `https://picsum.photos/seed/${spec.slug}/400/400`,
        fileName: `${spec.slug}.jpg`,
        width: 400,
        height: 400,
        alt: `Portrait of ${spec.name}`
      }),
      email: spec.email,
      websiteUrl: spec.websiteUrl ?? "",
      xHandle: spec.xHandle ?? "",
      instagramHandle: spec.instagramHandle ?? "",
      linkedinUrl: spec.linkedinUrl ?? ""
    }
  })
);

// --- Article categories ------------------------------------------------------

const categorySpecs: Array<{ slug: CategorySlug; name: string; description: string }> = [
  {
    slug: "guides",
    name: "Guides",
    description: "Practical, step-by-step walkthroughs for building and forking a client site on Three Acts — from a first afternoon build to swapping in a real data store."
  },
  {
    slug: "architecture",
    name: "Architecture",
    description:
      "How the pieces fit together: the boundary between the public site, the CMS and the API, the domain packages underneath them, and the trade-offs behind each decision."
  },
  {
    slug: "design-system",
    name: "Design system",
    description: "The wireframe design system that ships with the template — tokens, primitives, the dot-notation component API, and how to make it your own."
  },
  {
    slug: "cms",
    name: "CMS",
    description: "Notes on the Editorial Workspace: the collection registry, the publish model, field types and the pluggable CMS backend."
  },
  {
    slug: "release-notes",
    name: "Release notes",
    description: "What shipped in each release of the template's apps and domain packages, and what changes for a fork already in production."
  },
  {
    slug: "case-studies",
    name: "Case studies",
    description: "Real (well, real-ish) agency builds on Three Acts — what changed, what stayed default, and what each one taught us."
  }
];

const categoryRecords: CmsRecord[] = categorySpecs.map((spec, index) => {
  const values: Values = { name: spec.name, slug: spec.slug, description: spec.description, sortOrder: (index + 1) * 10 };
  if (spec.slug === "case-studies") {
    // Description rewrite in progress; the live site still shows the old copy.
    return seedRecord({
      id: `article-category-${spec.slug}`,
      publishStatus: "draft",
      createdAt: daysAgo(600),
      modifiedAt: daysAgo(4),
      values,
      liveValues: { ...values, description: "Case studies of agencies building client sites on Three Acts." }
    });
  }
  return seedRecord({ id: `article-category-${spec.slug}`, createdAt: daysAgo(600 - index), modifiedAt: daysAgo(300 - index * 20), values });
});

// --- Articles ----------------------------------------------------------------

type ArticleSpec = {
  key: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: AuthorSlug;
  category: CategorySlug | "";
  tags: string;
  /** Days before seedNow the article is dated (negative = scheduled). */
  publishedDays: number;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  /** Cover alt text; `null` = no cover image. */
  coverAlt: string | null;
  status?: PublishStatus;
  /** For drafts/queued edits of published articles: overrides that rebuild the older live snapshot. */
  liveOverrides?: Values;
  /** Days before seedNow of the last edit (defaults to shortly after publishing). */
  modifiedDays?: number;
};

function articleRecord(spec: ArticleSpec): CmsRecord {
  const values: Values = {
    title: spec.title,
    slug: spec.slug,
    excerpt: spec.excerpt,
    body: spec.body,
    coverImage: spec.coverAlt === null ? "" : coverImage(spec.slug, spec.coverAlt),
    author: spec.author,
    category: spec.category,
    tags: spec.tags,
    publishedAt: daysAgo(spec.publishedDays),
    readingTime: estimateReadingTime(spec.body),
    featured: spec.featured ?? false,
    seoTitle: spec.seoTitle ?? "",
    seoDescription: spec.seoDescription ?? ""
  };
  let liveValues: Values | null | undefined;
  if (spec.liveOverrides) {
    liveValues = { ...values, ...spec.liveOverrides };
    if (typeof liveValues.body === "string") {
      liveValues.readingTime = estimateReadingTime(liveValues.body);
    }
  }
  const createdDays = Math.max(spec.publishedDays, 0) + 4;
  const modifiedDays = spec.modifiedDays ?? Math.max(spec.publishedDays - 1, 0);
  return seedRecord({
    id: `article-${spec.key}`,
    publishStatus: spec.status ?? "published",
    createdAt: daysAgo(createdDays, 2),
    modifiedAt: daysAgo(Math.min(modifiedDays, createdDays)),
    values,
    liveValues
  });
}

const publishModelBodyLive = paragraphs(
  `Every editorial record has a status — published, draft, queued to publish or not published — and the site only ever renders its live snapshot, not its current values.`,
  `Editing a published record moves it to draft. Nothing changes on the site until you queue it and click Publish, which copies the values into the live snapshot and rebuilds the site.`
);

const publishModelBody = paragraphs(
  `A CMS record's \`values\` and what the public site renders are deliberately two different things. Every editorial collection carries a \`publishStatus\` — published, draft, queued_to_publish or not_published — and a separate \`liveValues\` snapshot that only a publish actually changes.`,
  `Save a change to a published article and its status flips to draft: your edit sits in \`values\`, the site keeps rendering the old \`liveValues\` untouched. Nothing ships until you explicitly queue it.`,
  `Queue it, and the status becomes queued_to_publish — still no change to the live site. Only the Publish Transition, the first half of clicking Publish in the CMS top bar, copies every queued record's \`values\` over its \`liveValues\` in the Data Store. The second half, Site Deploy, then rebuilds the static site from that new snapshot.`,
  `A brand-new record queued for the first time has no old snapshot to protect — its \`liveValues\` stay null until that first Publish Transition runs. An unpublished record's \`liveValues\` are always null, whatever its values say, so it can never leak onto the live site by accident.`,
  `This two-step model is why the CMS shows queued → building → deployed as one flow, but the Data Store and the static site can genuinely disagree for a few seconds: the transition and the deploy are two separate calls, and the second one is what actually makes the change visible. See ${shopLink("cms-app")} for the editor and ${shopLink("api-app")} for both halves of the flow.`
);

const islandsBodyLive = paragraphs(
  `Most pages on the public site ship zero JavaScript. Only components explicitly hydrated as Astro islands — a contact form, an add-to-cart button — load any client-side code, and only on the page that uses them.`,
  `Cart, checkout, sign-in and account are the exception: they render a static shell first, then hydrate fully to talk to the API at runtime.`
);

const islandsBody = paragraphs(
  `Open the network tab on most of the public site and you'll see HTML, CSS, and nothing else. Every page under apps/web prerenders to static output by default; JavaScript only ships for a component explicitly hydrated as an Astro island, and only on the page that uses it.`,
  `There are three shapes a page can take. Static, no interactivity — no client:* directive, zero JavaScript, full stop. Static with islands — the page is static HTML, but a component like the home page's contact form gets client:visible and hydrates on its own once it scrolls into view. Client routes — cart, checkout, sign-in/up and account — server-render a static shell with baked SEO metadata, then hydrate with client:load and fetch live data at runtime.`,
  `Only pages containing an island load Astro's small hydration runtime and that island's chunk — a blog post with no interactive component loads nothing beyond its HTML and CSS, even though the shop three clicks away has an add-to-cart island.`,
  `This is also why the Cart persists in localStorage through the ecommerce package's storage-agnostic store rather than a server session: it needs to survive navigation between static pages, including ones the cart island never touches.`,
  `The discipline this requires is mostly negative: resist hydrating a whole page when a small island would do. It's one of the easier rules in CONTEXT.md's architecture section to break by accident and the hardest to notice once you have — a page that quietly went from zero JS to a full client bundle rarely gets caught in review unless someone's watching the bundle size.`
);

const wireframeBodyLive = paragraphs(
  `The wireframe design system that ships with the template isn't meant to be any client's final look. It's a deliberately plain, accessible base — restyle it through tokens rather than rewriting components.`,
  `Components use dot notation — Section.Root, Button.Link, Card.Marketing — so composition stays explicit and each app can subpath-import only what a page needs.`
);

const wireframeBody = paragraphs(
  `Every template component is built to be replaced. The wireframe design system that ships with Three Acts isn't meant to be a client's final visual identity — it's a deliberately plain, fully accessible base that a fork restyles through tokens rather than rewrites component by component.`,
  `Components use element-scoped dot notation: Section.Root, Section.Container, Button.Root, Button.Link, Card.Marketing — one import per component family, subcomponents for composition instead of a single component with a dozen boolean props. Subpath exports keep each app's bundle to only the pieces a page actually uses.`,
  `Each app owns its own theme.css deliberately: apps/web's paper-and-ink public site and apps/cms's dark editorial workspace are isolated on purpose, so restyling a client's public site never risks the CMS, and vice versa.`,
  `Accessibility isn't a pass at the end — a checklist gates every new primitive before it merges: keyboard operability, a screen-reader pass, and correct semantic HTML underneath whatever the visual style is doing. A Typography.Heading always renders a real heading element, whatever font size the token maps it to.`,
  `The whole system, tokens included, ships in ${shopLink("wireframe-theme")}. Restyle it by changing the tokens first; reach for a one-off component override only when the token system genuinely can't express what the design needs.`
);

const flagshipArticles: ArticleSpec[] = [
  {
    key: "afternoon-launch",
    slug: "ship-a-client-site-in-an-afternoon",
    title: "Ship a client site in an afternoon",
    excerpt: "The lightweight path needs no CMS, API, database or provider: clone the repo, swap in content, and you have a static site by lunchtime.",
    body: paragraphs(
      `Most client sites don't need a database on day one. The lightweight path runs apps/web alone — Astro output: static, React only where a component is explicitly hydrated as an island — against the package's built-in mock content. Clone the template, run \`npm install\` and \`npm run dev:web\`, and you already have a working site with no environment variables at all.`,
      `Swap the example content first. Nothing about the lightweight path is a placeholder you build around — it's the same field keys, the same routes, and the same SEO metadata the application-backed path uses once you outgrow it. Edit the seed, the site config in apps/web/src/site.ts, and the theme tokens in theme.css, and the static output already looks like the client's site, not a demo.`,
      `Add interactivity only where the page needs it. A contact form, a filter, an accordion — each becomes a self-contained React island with a \`client:visible\` or \`client:load\` directive, and only the pages that use one pay for Astro's small hydration runtime. Everything else ships as plain HTML and CSS.`,
      `When the brief grows past static pages — a blog an editor updates without a pull request, a shop, an account area — the path is incremental, not a rewrite: add ${shopLink("cms-app")} and ${shopLink("api-app")} without touching how the public pages render. Until then, ${shopLink("wireframe-theme")} and ${shopLink("web-app")} alone are a complete, deployable site.`,
      `We've watched agency partners turn around a five-page marketing site between a morning call and an afternoon deadline this way. The trick isn't speed for its own sake — it's not building CMS, auth and database plumbing a client doesn't need yet.`
    ),
    author: "daniel-okoye",
    category: "guides",
    tags: "guides, quickstart, astro, lightweight path",
    publishedDays: 480,
    featured: true,
    seoTitle: "Ship a Client Site in an Afternoon",
    seoDescription: "How the lightweight path lets you build and ship a static client site with Three Acts in a single afternoon — no CMS or API required.",
    coverAlt: "A laptop showing a freshly deployed static site on a plain desk"
  },
  {
    key: "registry-source-of-truth",
    slug: "the-collection-registry-is-the-only-source-of-truth",
    title: "The collection registry is the only source of truth",
    excerpt: "One TypeScript file drives the CMS editor, the REST bridge's validation and the generated Postgres schema. Nothing about a field is defined twice.",
    body: paragraphs(
      `Ask where a CMS field "lives" in most stacks and you'll get three different answers: a database column, an ORM model, and a hand-written form component, usually drifting slowly apart. Three Acts collapses that into one file: packages/cms-schema/src/registry.ts.`,
      `Every collection — articles, products, orders, FAQs, site settings — is an entry in \`collectionRegistry\`: an id, a table name, a mode, and a \`fields\` array typed against the same \`CmsCollection\` shape the Editorial App renders and the REST bridge validates against. Add a field there, and the record editor grows the matching input; nothing in apps/cms guesses a field's type from data.`,
      `The database follows the registry, not the other way round. \`npm run schema:sql\` prints an idempotent \`CREATE TABLE\` for every collection, with CHECK constraints for select options and partial unique indexes for slug fields; \`schema:diff\` compares the registry against a committed snapshot and prints the migration. You review the SQL — the tooling never applies it silently.`,
      `This is also why the Public Content Route and the CMS's REST bridge never disagree about a field's shape: both validate against the same registry import, ${shopLink("content-package")} on the read side and ${shopLink("cms-app")} on the write side.`,
      `The trade-off is explicit: there's no live database introspection, so a column that isn't in the registry simply doesn't exist as far as the CMS or the API are concerned. We think that's a feature — a fork's entire content model is readable in one file, in order, instead of scattered across migrations.`
    ),
    author: "nico-de-wet",
    category: "architecture",
    tags: "architecture, cms, registry, schema",
    publishedDays: 455,
    featured: true,
    seoTitle: "The Collection Registry: One Source of Truth",
    seoDescription: "How packages/cms-schema's collection registry drives the CMS editor, the REST bridge's validation and the generated Postgres schema — all from one file.",
    coverAlt: "A single TypeScript file with arrows pointing out to a database, an API and an editor UI"
  },
  {
    key: "publish-model",
    slug: "draft-queued-live-how-publishing-works",
    title: "Draft, queued, live: how the publish model actually works, snapshot by snapshot",
    excerpt: "Editing a record and publishing it are two different actions, on purpose. Here's exactly what changes — and when — at each step of the publish model.",
    body: publishModelBody,
    author: "thandi-mokoena",
    category: "cms",
    tags: "cms, publish model, editorial workflow",
    publishedDays: 400,
    featured: true,
    seoTitle: "The CMS Publish Model, Snapshot by Snapshot",
    seoDescription: "Draft, queued_to_publish, published and not_published — exactly what each status means for a record's live snapshot, and what a Publish click actually does.",
    coverAlt: "A record editor showing a status badge next to a Publish button",
    status: "draft",
    modifiedDays: 2,
    liveOverrides: {
      title: "How publishing works",
      excerpt: "Editing a record doesn't publish it. Here's what publish status actually controls.",
      body: publishModelBodyLive,
      seoDescription: "What each CMS publish status controls, and what actually happens when you click Publish."
    }
  },
  {
    key: "swap-datastore",
    slug: "swapping-the-file-store-for-supabase-or-neon",
    title: "Swapping the file store for Supabase or Neon",
    excerpt: "The zero-config File Data Store isn't production persistence. Here's how a fork swaps it for a real Postgres provider without touching the CMS.",
    body: paragraphs(
      `The File Data Store — one JSON file per collection under \`CMS_DATA_DIR\` — is the zero-configuration default for local development. It's not production persistence, and on Vercel its directory isn't durable, so every fork eventually swaps it for something real.`,
      `Supabase ships today: implement nothing, just set \`CMS_DATA_BACKEND=supabase\`, \`CMS_STORAGE_BACKEND=supabase\`, and provide \`SUPABASE_URL\` and \`SUPABASE_SERVICE_ROLE_KEY\` in apps/api's environment. The service-role client talks directly to Postgres and Supabase Storage behind the REST bridge.`,
      `Plain Postgres — Neon, RDS, whatever a client already runs — means implementing the Data Store interface once: list, read, create, save, delete and the publish transition, against \`pg\` or Drizzle, and registering it next to the existing \`file\`/\`memory\`/\`supabase\` options. Nothing in apps/cms changes, because it only ever talks to the REST bridge, never a database directly.`,
      `Run \`npm run schema:sql -w @three-acts/api\` against the new database first — it's generated straight from the registry, so a fresh Neon branch gets the exact same tables, constraints and indexes the file store's shape implies, with none of it typed twice. Reach for ${shopLink("supabase-data-store")} if you're staying on Supabase, covered by either a ${shopLink("single-site-license")} or an ${shopLink("agency-license")} depending on how many client projects you're running it on.`,
      `The Blob Store interface is a separate, smaller swap — asset uploads only — and most forks change both at once, but you don't have to: a Postgres data store with file-backed uploads during a migration is a perfectly reasonable intermediate state.`
    ),
    author: "sarah-lindqvist",
    category: "guides",
    tags: "guides, data store, supabase, neon, postgres",
    publishedDays: 340,
    seoTitle: "Swap the File Data Store for Supabase or Neon",
    seoDescription: "How to move a fork off the zero-config File Data Store onto a real Postgres provider without touching the CMS or the registry.",
    coverAlt: "A database connection diagram with two provider logos and an arrow between them"
  },
  {
    key: "api-bridge",
    slug: "the-api-is-the-only-door-auth-checkout-and-forms",
    title: "The API is the only door: auth, checkout and forms all go through one bridge",
    excerpt: "Neither the public site nor the CMS ever holds a database credential or a payment key. Every browser write goes through apps/api — no exceptions.",
    body: paragraphs(
      `Neither the public site nor the CMS ever holds a database credential, a payment provider key or an identity store connection. Every browser write, and every auth call, goes through apps/api — that's not a convention, it's the one architectural rule the rest of the template is built to make hard to violate.`,
      `Sign-up and sign-in post to \`/api/auth/*\`, checkout prices the cart server-side and charges through the configured \`PaymentProvider\` behind the API's checkout route, and the contact, newsletter and inquiry forms all land on \`/api/forms/submit\`. Each of those routes uses the System Write Path — \`createSystemRecord\`/\`updateSystemRecord\` — to write orders, customers and form submissions regardless of the collection's usual editor-facing rules.`,
      `That's also why orders and customers are Record Source "site": an editor can view, edit the fields that are theirs, and delete, but New and Import are hidden, because only Checkout should ever invent an order. Read-only fields like an order's total or a customer's email follow the same logic — an editor sees the value, never an input, and only the system write path can change it.`,
      `Same-origin by default keeps this simple: apps/web and apps/cms call \`/api/*\`, and a dev-server proxy or a Vercel rewrite bridges it to the deployed apps/api project, so there's no CORS configuration for normal traffic. Direct cross-origin calls are opt-in through \`API_ALLOWED_ORIGINS\`, not the default.`,
      `If you're building on top of ${shopLink("api-app")}, this is the boundary to respect: add a new privileged operation as a new route in apps/api, never as a client-side call from ${shopLink("web-app")} or ${shopLink("cms-app")}.`
    ),
    author: "sarah-lindqvist",
    category: "architecture",
    tags: "architecture, api, auth, checkout, forms",
    publishedDays: 290,
    featured: true,
    seoTitle: "Why Every Write Goes Through apps/api",
    seoDescription: "The API app is the only place that holds provider credentials, a payment provider or an identity store — every browser write and every auth call goes through it.",
    coverAlt: "A diagram showing the public site and CMS both pointing to a single API layer"
  },
  {
    key: "islands-hydration",
    slug: "islands-only-how-little-javascript-actually-ships",
    title: "Islands only: how little JavaScript a Three Acts page actually ships",
    excerpt: "A page-by-page look at which routes hydrate, which stay fully static, and why only cart, checkout, sign-in and account ship a client-side app.",
    body: islandsBody,
    author: "daniel-okoye",
    category: "architecture",
    tags: "architecture, astro, islands, performance",
    publishedDays: 220,
    seoTitle: "How Astro Islands Keep Three Acts Pages Fast",
    seoDescription: "A page-by-page look at which routes hydrate, which stay fully static, and why only cart, checkout, sign-in and account ship a client-side app.",
    coverAlt: "A map of a website's pages with only a few highlighted as interactive islands",
    status: "queued_to_publish",
    modifiedDays: 1,
    liveOverrides: {
      title: "How little JavaScript a page actually ships",
      excerpt: "Static by default, islands only where a page needs interaction — here's what that means in practice.",
      body: islandsBodyLive,
      seoDescription: "Why most Three Acts pages ship zero JavaScript, and which routes hydrate fully."
    }
  },
  {
    key: "seo-settings",
    slug: "seo-you-dont-have-to-think-about",
    title: "SEO you don't have to think about",
    excerpt: "A cascading fallback from page settings to site defaults means most pages need zero manual SEO work.",
    body: paragraphs(
      `The registry has two collections most forks barely touch after setup: \`site-settings\`, a singleton with sitewide defaults, and \`page-settings\`, one record per static route. Between them, most pages need no manual SEO work at all.`,
      `Every meta field cascades. A blog post's SEO title falls back to its title, its SEO description to its excerpt. A static page's meta title falls back to its page name, its open graph image to the site's default open graph image, its meta description to the site's default meta description. Fill in the singleton once and every page already has something reasonable.`,
      `Only override a page's fields when it genuinely needs something different — a landing page with its own social preview image, a legal page you'd rather exclude from search snippets. Empty is not a mistake; it's the fallback working as intended.`,
      `\`src/page-meta.ts\` centralizes this on the apps/web side, and \`src/layouts/BaseLayout.astro\` renders it into every page's head. \`sitemap.xml\`, \`robots.txt\` and \`llms.txt\` are generated from the same \`includeInSitemap\` flags, so a page you mark noindex disappears from all three at once, not just one.`,
      `Product and article JSON-LD ride the same fallback chain automatically — there's nothing extra to configure for structured data once ${shopLink("content-package")} and ${shopLink("ecommerce-package")} are wired up.`
    ),
    author: "maya-rosenberg",
    category: "guides",
    tags: "guides, seo, site settings, page settings",
    publishedDays: 250,
    seoTitle: "SEO Defaults: Site and Page Settings",
    seoDescription: "How Three Acts' cascading SEO fallback — page, then site defaults — means most pages need zero manual SEO work.",
    coverAlt: "A settings screen showing meta title and description fields with placeholder fallback text"
  },
  {
    key: "wireframe-design-system",
    slug: "building-the-wireframe-design-system",
    title: "Building the wireframe design system: tokens, primitives and the dot-notation API, revisited",
    excerpt: "A deliberately plain, fully accessible base a fork restyles through tokens — not a finished visual identity.",
    body: wireframeBody,
    author: "kabelo-sithole",
    category: "design-system",
    tags: "design system, tokens, components, accessibility",
    publishedDays: 210,
    featured: true,
    seoTitle: "Inside the Wireframe Design System",
    seoDescription: "How Three Acts' wireframe design system composes tokens, primitives and a dot-notation component API — and why it deliberately stays unopinionated.",
    coverAlt: "A grid of plain, unstyled UI components labelled with their token names",
    status: "draft",
    modifiedDays: 5,
    liveOverrides: {
      title: "Building the wireframe design system",
      excerpt: "A plain, accessible base you restyle through tokens, not a finished visual identity.",
      body: wireframeBodyLive,
      seoDescription: "The wireframe design system is a plain, accessible base you restyle through tokens, not a fixed visual identity."
    }
  },
  {
    key: "fork-diversity",
    slug: "one-template-a-la-carte",
    title: "One template, à la carte: how three agencies forked Three Acts differently 🎉",
    excerpt: "Ask three agencies to fork the same template and you'll get three very different sites. The interesting part isn't what they added — it's what they deleted.",
    body: paragraphs(
      `Ask three agencies to fork the same template and you'll get three very different sites — which is exactly the point. Over the past year, agency partners have shipped client builds ranging from a two-location retailer to a five-partner law firm to a four-practitioner clinic, and the interesting part isn't what they added. It's what they deleted.`,
      `A retailer needed the full storefront module and a couple of registry fields the ecommerce package doesn't model out of the box. A law firm needed the shop and account modules gone entirely, replaced by nothing more than a new team-directory collection. A clinic needed a fourth form type layered onto the existing forms package rather than a shop at all.`,
      `None of the three touched the publish model, the SEO settings screens or the API's auth routes. That's the part of the template a fork almost never needs to change, and it's deliberately the part with the least surface area to get wrong.`,
      `We've written each one up properly — look for the individual case studies alongside this one for what specifically changed, what stayed default, and roughly how long each build took.`
    ),
    author: "maya-rosenberg",
    category: "case-studies",
    tags: "case studies, agencies, forking",
    publishedDays: 180,
    seoTitle: "",
    seoDescription: "",
    coverAlt: "Three different client site homepages shown side by side on a desk"
  },
  {
    key: "year-of-forks",
    slug: "a-year-of-forks-what-we-changed-because-you-asked",
    title: "A year of forks: what we changed because you asked",
    excerpt: "A year after the first public release, we pulled the numbers on what forks actually change — and used it to decide what belongs in the template by default.",
    body: paragraphs(
      `A year after the template's first public release, we pulled the numbers on what forks actually change, and used it to decide what belongs in the template by default versus what stays a fork-time knob.`,
      `The single most common first edit, by a wide margin, is \`packages/ecommerce/src/config.ts\` — currency, VAT rate and shipping bands. That's exactly the file it's meant to be: one place, not scattered across route handlers, which is why \`shopConfig\` hasn't needed a shape change since we introduced it.`,
      `The second most common change surprised us: forks with no shop at all still kept apps/api running, purely for the auth and forms bridge. That's part of why the forms and auth packages now ship as fully standalone domain packages rather than bundled inside the ecommerce logic — a site with no products still needs sign-in and a contact form to go through the same privileged bridge.`,
      `The least common change: nobody has swapped the wireframe design system's component API itself, only its tokens. That's the signal we needed that the dot-notation primitives are doing their job — restyled, not rebuilt.`,
      `If you're planning a fork and want the short version of all of this, ${shopLink("complete-template-bundle")} ships every package and app together with the licence question already answered.`
    ),
    author: "nico-de-wet",
    category: "release-notes",
    tags: "release notes, roadmap, community",
    publishedDays: 95,
    seoTitle: "A Year of Three Acts Forks: What Changed",
    seoDescription: "The most common changes agencies made after forking Three Acts, and which ones we pulled back into the template itself.",
    coverAlt: "A changelog-style timeline of releases across a year"
  },
  {
    key: "history-retro",
    slug: "everything-we-changed-deleted-rebuilt-and-changed-back",
    title:
      "Everything we changed, deleted, rebuilt and changed back while turning a single-tenant client build into a fork-ready template with a CMS, an API bridge and four domain packages",
    excerpt: "Three Acts didn't start as a template. This is the honest version of how one client's website became the thing you're reading about now.",
    body: paragraphs(
      `Three Acts didn't start as a template. It started as one client's website, with a hand-written admin page, a couple of database tables nobody had diagrammed, and business logic wherever it was needed at the time. This is the honest version of how it became the thing you're reading about now.`,
      `The first real change was extracting a registry. Every field the admin page edited got written down once, in one file, and the admin UI, the database schema and the API's validation all started reading from it instead of drifting independently. That file is now packages/cms-schema/src/registry.ts, and almost nothing about its shape has changed since.`,
      `The second was pulling the business logic — cart pricing, session handling, form validation — out of route handlers and into framework-agnostic packages with no dependency on any of the three apps. That split wasn't obvious at the time; it only became necessary once a second client build needed the same checkout math with a different VAT rate, and copy-pasting it once was one time too many.`,
      `The third, and the one that took longest, was drawing a hard line around apps/api: every provider credential, every payment call, every password hash moved behind one bridge, and apps/web and apps/cms stopped being able to reach a database even if a future contributor tried. That rule is now load-bearing enough that CONTEXT.md spells it out in its own section.`,
      `None of this happened as a plan. It happened because the same problems kept showing up on the third and fourth client project, and eventually rewriting from scratch was cheaper than patching around them again. If you're forking ${shopLink("complete-template-bundle")} today, you're starting from the version of that lesson we'd already learned the hard way.`
    ),
    author: "nico-de-wet",
    category: "cms",
    tags: "cms, architecture, history, retrospective",
    publishedDays: 70,
    seoTitle: "How Three Acts Became a Template",
    seoDescription: "The real history behind Three Acts: from a one-off client build to a registry-driven CMS, an API bridge and four reusable domain packages.",
    coverAlt: "A long, messy whiteboard timeline covered in crossed-out boxes"
  },
  {
    key: "auth-package-preview",
    slug: "auth-package-two-point-oh-whats-changing",
    title: "Auth package 2.0: what's changing",
    excerpt: "Refresh tokens, passkey sign-in and a pluggable rate limiter — a preview of what's landing in @three-acts/auth 2.0.",
    body: paragraphs(
      `Auth package 2.0 is queued for next week's release. It's the first version since 1.0 that changes the token shape, so here's what to expect before it ships.`,
      `Refresh tokens replace the current single long-lived session token. A short-lived access token and a longer-lived refresh token mean \`AUTH_TOKEN_TTL_SECONDS\` now controls the access token only, with a separate refresh window.`,
      `Passkey sign-in joins email/password as a second first-class method, behind the same \`AuthClient\` interface — apps/web and apps/cms don't need to know which one a shopper or editor used.`,
      `A pluggable rate limiter sits in front of sign-in and sign-up, with an in-memory implementation for local development and an interface any fork can back with Redis or a provider's own rate limiting.`,
      `None of this changes the \`Session\` type's shape from the outside — \`scope: "shop" | "cms"\` still works exactly as it does today. Full migration notes land with the release, at ${shopLink("auth-package")}.`
    ),
    author: "sarah-lindqvist",
    category: "release-notes",
    tags: "release notes, auth, roadmap",
    publishedDays: -6,
    seoTitle: "Auth Package 2.0 Preview",
    seoDescription: "A preview of what's landing in @three-acts/auth 2.0: refresh tokens, passkey support and a pluggable rate limiter.",
    coverAlt: "A changelog draft for auth package 2.0 open in an editor",
    status: "queued_to_publish",
    modifiedDays: 1
  },
  {
    key: "grid-section",
    slug: "grid-and-section-the-two-layout-primitives-that-do-most-of-the-work",
    title: "Grid and Section: the two layout primitives that do most of the work",
    excerpt: "Section owns vertical rhythm, Grid owns horizontal composition. Between them they cover most of what a marketing page needs from layout.",
    body: paragraphs(
      `Open almost any template page and the outer structure is two components: Section for vertical rhythm, Grid for horizontal composition inside it. Between them they cover most of what a marketing page needs from layout.`,
      `\`Section.Root\` owns spacing between blocks of a page — a hero, a features block, a testimonial strip — and \`Section.Container\` owns the horizontal max-width and gutters inside each one. They're deliberately separate: nesting a Grid directly in \`Section.Root\` without a Container is the most common layout bug we see in early forks, because the grid then spans the full viewport instead of the content column.`,
      `Grid takes a column count and a gap token, and its children don't need to know how many columns exist — a three-card row and a four-card row are the same component with a different prop, not two different components.`,
      `Both are token-driven rather than pixel-driven: gap, max-width and the vertical rhythm scale all come from theme.css, so restyling a client's spacing scale changes every Section and Grid on the site without touching a single page. The full set, with every subcomponent, ships in ${shopLink("wireframe-theme")}.`
    ),
    author: "kabelo-sithole",
    category: "design-system",
    tags: "design system, layout, grid, section",
    publishedDays: 150,
    seoTitle: "Grid and Section: Core Layout Primitives",
    seoDescription: "How Section and Grid divide vertical rhythm from horizontal composition, and why most template pages need nothing else for layout.",
    coverAlt: "A page wireframe with grid lines overlaid to show its section structure"
  },
  {
    key: "seo-aeo-free",
    slug: "seo-and-aeo-for-free-sitemap-robots-and-llms-txt",
    title: "SEO and AEO for free: sitemap, robots and llms.txt",
    excerpt: "sitemap.xml, robots.txt and llms.txt all generate from the same page-settings flags, so they can't quietly disagree with each other.",
    body: paragraphs(
      `Three small files decide a lot about how a site gets found: \`sitemap.xml\` for search engines, \`robots.txt\` for crawlers in general, and \`llms.txt\` — the newer convention for pointing AI systems at a site's actual content instead of its navigation chrome. All three generate from the same source in Three Acts, so they can't quietly disagree with each other.`,
      `Each static page and each entry from an editorial collection carries an \`includeInSitemap\` flag. Set it once in page settings or leave a collection's default, and \`src/pages/sitemap.xml.ts\` writes the URL with the right \`lastmod\`, \`changefreq\` and \`priority\` — no page forgotten, because the endpoint builds itself from the same routes \`getStaticPaths\` expands.`,
      `\`robots.txt\` reads the sitewide \`allowIndexing\` flag: off adds \`noindex\` to every page's head and disallows crawling wholesale, useful for a staging fork nobody should be indexing yet. \`llms.txt\` lists the same public routes in a format meant to be read by a model rather than rendered, summarizing what the site actually contains.`,
      `None of this needs a plugin or a third-party SEO package — it's plain Astro endpoints reading the same \`page-meta.ts\` config every page's \`<head>\` already uses. Wire up ${shopLink("content-package")} once and the three files stay accurate as content changes, without a second SEO tool to keep in sync.`
    ),
    author: "daniel-okoye",
    category: "guides",
    tags: "guides, seo, aeo, llms.txt, sitemap",
    publishedDays: 320,
    seoTitle: "Sitemap, Robots.txt and llms.txt, Generated",
    seoDescription: "How sitemap.xml, robots.txt and llms.txt are generated from the same page-settings flags, with nothing to maintain by hand.",
    coverAlt: "A robots.txt file open in an editor next to a sitemap diagram"
  }
];

// --- Generated articles (deterministic, from topic templates) ----------------

const rand = createRandom(20260901);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

type GeneratedTopic = {
  key: string;
  category: CategorySlug;
  authors: AuthorSlug[];
  titles: string[];
  excerpt: string;
  body: string;
  tags: string;
  coverAlt: string | null;
  seoTitle?: string;
};

type CollectionSpotlight = {
  key: string;
  id: string;
  label: string;
  mode: string;
  detail: string;
  quirk: string;
  consumer: string;
  product?: ProductSlug;
};

const collectionSpotlights: CollectionSpotlight[] = [
  {
    key: "articles",
    id: "articles",
    label: "Articles",
    mode: "the full editorial publish workflow",
    detail: "a required cover image and an optional SEO title/description pair that falls back to the excerpt",
    quirk: "reading time is computed from the body on every save — nobody types it in",
    consumer: "the Public Content Route and the mock content source",
    product: "journal-module"
  },
  {
    key: "products",
    id: "products",
    label: "Products",
    mode: "the same editorial publish workflow as Articles",
    detail: "an image gallery with a required first image, plus an optional product video and a spec-sheet upload",
    quirk: "compare-at price is a plain number, not a discount rule — there's no automatic sale calculation in the registry",
    consumer: "the shop routes in apps/api and the storefront pages in apps/web",
    product: "ecommerce-package"
  },
  {
    key: "orders",
    id: "orders",
    label: "Orders",
    mode: '"data" mode with Record Source "site" — New and Import are hidden entirely',
    detail: "only Checkout's System Write Path can create or update the money fields",
    quirk: "total, subtotal, tax and the line-items JSON are all read-only fields an editor can see but never edit",
    consumer: "the account page's order history, filtered to the signed-in shopper",
    product: "ecommerce-package"
  },
  {
    key: "customers",
    id: "customers",
    label: "Customers",
    mode: '"data" mode, Record Source "site"',
    detail: "lifetime value and order counts are recomputed by Checkout, never typed in",
    quirk: "the password hash never lives on this record — it's in a separate Identity Store an editor can't reach, even by exporting the collection",
    consumer: "sign-up and Checkout, both through the system write path",
    product: "auth-package"
  },
  {
    key: "faqs",
    id: "faqs",
    label: "FAQs",
    mode: "the editorial publish workflow, grouped by a fixed topic",
    detail: "the same record can show up on /faq and on a product page, scoped by an optional product slug",
    quirk: "topic isn't free text: it's six select options, each with its own contiguous sort order the CMS keeps in sync",
    consumer: "the /faq page's FAQPage JSON-LD and individual product pages",
    product: "content-package"
  }
];

function collectionTopic(item: CollectionSpotlight): GeneratedTopic {
  return {
    key: `cms-${item.key}`,
    category: "cms",
    authors: ["thandi-mokoena", "sarah-lindqvist"],
    titles: [`Inside the ${item.label} collection`, `What ${item.label} actually looks like in the registry`, `${item.label}, field by field`],
    excerpt: `A field-by-field look at the ${item.label} collection: ${item.mode}, and ${item.quirk.charAt(0).toLowerCase()}${item.quirk.slice(1)}.`,
    body: paragraphs(
      `${item.label} runs on ${item.mode}. Its fields are defined once in packages/cms-schema/src/registry.ts, and that same definition drives the editor, the REST bridge's validation and the generated Postgres schema.`,
      pick([
        `Nothing about this collection is inferred from the database. If a field isn't in the registry, the editor can't show it and the schema tooling won't create a column for it.`,
        `The Editorial Workspace never introspects the database to build its form — every input, every select option, comes from this one file.`,
        `Changing what an editor sees always starts here, not in a migration.`
      ]),
      `The detail worth knowing: ${item.detail}.`,
      `The quirk worth knowing: ${item.quirk}.`,
      `In production, ${item.label} is read by ${item.consumer}.${item.product ? ` If you want the underlying logic rather than just the registry entry, it ships in ${shopLink(item.product)}.` : ""}`
    ),
    tags: `cms, registry, ${item.id}, collections`,
    coverAlt: `A close-up of the ${item.label} collection open in the Editorial Workspace`
  };
}

type GuideTask = { key: string; task: string; steps: string; time: string; gotcha: string; product?: ProductSlug };

const guideTasks: GuideTask[] = [
  {
    key: "add-field",
    task: "add a field to a collection",
    steps: "add it to the collection's `fields` array in registry.ts, run `schema:diff` to generate the migration SQL, review it, then apply it with psql or the Supabase SQL editor",
    time: "about ten minutes for a simple text or number field",
    gotcha: "the database never defines a field — if you add a column by hand first, the diff will try to add it again",
    product: "cms-app"
  },
  {
    key: "wire-payment",
    task: "wire up a real payment provider",
    steps: "implement the `PaymentProvider` interface in apps/api, register it alongside the `mock` provider, and point `PAYMENT_PROVIDER` at it",
    time: "an afternoon for a provider with a simple charge API",
    gotcha: "checkout, the order write and the customer upsert all happen inside the same request — a provider that requires an async webhook needs a pending order status, not a direct charge",
    product: "ecommerce-package"
  },
  {
    key: "add-redirect",
    task: "add a redirect",
    steps: "create a `redirect-rules` record with a source path, target URL and status code — no deploy required, since redirects are read at request/build time from the Public Content Route",
    time: "under a minute",
    gotcha: "`redirect-rules` has no publish workflow, so a saved redirect is live immediately, with no draft state to catch a typo",
    product: "content-package"
  },
  {
    key: "configure-vat-shipping",
    task: "set currency, VAT and shipping for a client",
    steps: "edit `shopConfig` in packages/ecommerce/src/config.ts — currency, VAT rate, shipping bands and the order-number prefix all live in that one file",
    time: "a few minutes, plus a sanity-check order through checkout",
    gotcha: "shopConfig is the one file most forks forget to touch before their first real order goes out at the template's default VAT rate",
    product: "ecommerce-package"
  },
  {
    key: "write-island",
    task: "write your first Astro island",
    steps: "build a self-contained React component with JSON-serializable props, then render it from a `.astro` page with a `client:*` directive — `client:visible` for below-the-fold, `client:load` for anything the page needs immediately",
    time: "half an hour if the component doesn't need new server data",
    gotcha: "only pages containing an island load Astro's hydration runtime at all — a static page next to it still ships zero JavaScript",
    product: "web-app"
  }
];

function guideTopic(item: GuideTask): GeneratedTopic {
  return {
    key: `guide-${item.key}`,
    category: "guides",
    authors: ["daniel-okoye", "sarah-lindqvist", "thandi-mokoena"],
    titles: [`How to ${item.task}`, `A five-minute guide to ${item.task}`, `${item.task[0].toUpperCase()}${item.task.slice(1)}, step by step`],
    excerpt: `The short version: ${item.steps.split(",")[0]}. Here's the full walkthrough, including the part that trips people up.`,
    body: paragraphs(
      pick([
        `This is one of the first things most forks need to do, and it's simpler than it looks once you know where the file lives.`,
        `We get asked about this constantly in support, so here's the version we'd want to read.`,
        `Nothing here needs a framework upgrade or a new dependency — just the right file and the right order of operations.`
      ]),
      `To ${item.task}: ${item.steps}. Budget ${item.time}.`,
      `The gotcha: ${item.gotcha}.`,
      `${pick([
        "Do it once on a throwaway branch first if you're not sure — nothing here is destructive, but it's still worth seeing the diff before you commit to it.",
        "None of this needs the CMS or the API running if you're just checking the shape of the change.",
        "If you get stuck, the architecture behind this is written up in CONTEXT.md — start there before assuming it's a bug."
      ])}${item.product ? ` More detail ships with ${shopLink(item.product)}.` : ""}`
    ),
    tags: `guide, ${item.key.replace(/-/g, " ")}, how-to`,
    coverAlt: `A terminal and code editor open side by side, mid-edit`
  };
}

type ComponentSpotlight = { key: string; name: string; api: string; behavior: string; tip: string; product?: ProductSlug };

const componentSpotlights: ComponentSpotlight[] = [
  {
    key: "button",
    name: "Button",
    api: "`Button.Root` for actions and `Button.Link` for navigation, sharing one visual system",
    behavior: "they render different elements — a `<button>` or an `<a>` — so keyboard behaviour and screen readers get the right semantics automatically",
    tip: "reach for `Button.Link` any time the destination is a URL, even if it looks identical to `Button.Root` — the difference matters for middle-click and screen readers",
    product: "wireframe-theme"
  },
  {
    key: "card",
    name: "Card",
    api: "`Card.Root`, `Card.Marketing` and a handful of slot components for media, title and body",
    behavior: "it's deliberately unopinionated about layout — `Card.Marketing` is a preset, not the only way to compose one",
    tip: "before adding a one-off card variant, check whether `Card.Root` plus existing slots already gets you there",
    product: "wireframe-theme"
  },
  {
    key: "typography",
    name: "Typography",
    api: "`Typography.Eyebrow`, `Typography.Heading`, `Typography.Body` and friends, one component per role rather than one component with a `variant` prop",
    behavior: "each one maps to a single semantic HTML element, so swapping the visual style never changes the document outline",
    tip: "resist the urge to reach for a raw `<p>` or `<h2>` inside a template page — the moment you do, theming stops working for that text",
    product: "wireframe-theme"
  },
  {
    key: "field",
    name: "Field",
    api: "`Field.Root`, `Field.Label`, `Field.Input`, `Field.Error`, composed rather than configured through props",
    behavior: "every input in the storefront and account flows — sign-up, checkout, the contact form — shares this one component, so an accessibility fix in one place fixes it everywhere",
    tip: "always pair `Field.Label` with `Field.Input` through the built-in `htmlFor` wiring rather than a manual `aria-label`",
    product: "wireframe-theme"
  },
  {
    key: "section",
    name: "Section",
    api: "`Section.Root` and `Section.Container`, the two primitives almost every page composes from",
    behavior: "`Section.Root` owns vertical rhythm between page blocks; `Section.Container` owns the horizontal max-width and gutters — mixing them up is the most common layout bug we see in forks",
    tip: "if a page section looks too wide or too narrow, check whether it's missing its `Section.Container`, not whether the design tokens are wrong",
    product: "wireframe-theme"
  }
];

function componentTopic(item: ComponentSpotlight): GeneratedTopic {
  return {
    key: `design-${item.key}`,
    category: "design-system",
    authors: ["kabelo-sithole", "kabelo-sithole", "lena-fischer"],
    titles: [`${item.name}: the component, explained`, `Getting the most out of ${item.name}`, `${item.name} in the wireframe design system`],
    excerpt: `How ${item.name} is composed, why it's built that way, and the one thing worth knowing before you customize it.`,
    body: paragraphs(
      pick([
        `${item.name} is one of the more reached-for primitives in the wireframe design system, and one of the ones we get the most customization questions about.`,
        `Every template page eventually touches ${item.name} somewhere, so it's worth understanding how it's put together before you reach for a one-off override.`,
        `${item.name} looks simple from the outside. The API underneath is deliberately narrow, and that's on purpose.`
      ]),
      `The API: ${item.api}.`,
      `Why it's built that way: ${item.behavior}.`,
      `The tip that saves the most time: ${item.tip}.${item.product ? ` The full source, including every subcomponent, ships in ${shopLink(item.product)}.` : ""}`
    ),
    tags: `design system, ${item.name.toLowerCase()}, components, tokens`,
    coverAlt: `The ${item.name} component shown in several states on a design canvas`
  };
}

type ArchRetro = { key: string; decision: string; context: string; tradeoff: string; verdict: string };

const archRetros: ArchRetro[] = [
  {
    key: "no-orm",
    decision: "not adding an ORM",
    context:
      "apps/api talks to whichever Data Store is configured through a small, explicit interface, and the file-backed store, an in-process memory store and Supabase all implement it directly against SQL or JSON.",
    tradeoff:
      "we write a little more boilerplate per Data Store implementation, but a fork can add plain Postgres or another provider by implementing one interface, with no ORM dialect to fight.",
    verdict: "we'd make the same call again — the registry is already the single source of truth for shape; an ORM's schema-from-models would just be a second one."
  },
  {
    key: "no-relation-field",
    decision: "shipping without a relation field type",
    context: "an article's `author` field is a plain text slug with helpText pointing at `authors.slug`, not a foreign key the editor resolves for you.",
    tradeoff:
      "editors can, in theory, type a slug that doesn't exist; in exchange, the field model stays simple enough that adding a new collection never means touching a relation-resolution layer.",
    verdict: "seed and integration tests catch the broken-reference case today; a real relation field type is the most-requested addition we haven't shipped yet."
  },
  {
    key: "static-first",
    decision: "keeping apps/web static-first instead of full SSR",
    context: "every public page prerenders to HTML at build time, and only isolated islands hydrate — cart, checkout, sign-in and account are the only client routes.",
    tradeoff:
      "content changes need a rebuild rather than being instant, but almost every page ships zero JavaScript, and the ones that do ship only exactly what that page's islands need.",
    verdict:
      "the publish flow's two-step CMS-then-deploy model exists specifically to keep this trade-off honest — a client always knows a build is what makes a change live."
  },
  {
    key: "no-transactions",
    decision: "not modeling checkout as a database transaction",
    context: "Checkout prices the cart, charges through the configured payment provider, then writes the order and upserts the customer — three steps, not one atomic write.",
    tradeoff:
      "a crash between the charge and the order write is a real, if rare, failure mode we have to reason about explicitly, in exchange for keeping the Data Store interface provider-agnostic — some backends the template targets don't support cross-table transactions at all.",
    verdict: "we log and can manually reconcile a stuck charge today; idempotency keys on the payment call are the next hardening step, not yet shipped."
  }
];

function archTopic(item: ArchRetro): GeneratedTopic {
  return {
    key: `architecture-${item.key}`,
    category: "architecture",
    authors: ["nico-de-wet", "sarah-lindqvist", "nico-de-wet"],
    titles: [`Why we're ${item.decision}`, `${item.decision[0].toUpperCase()}${item.decision.slice(1)}: a retrospective`, `The trade-off behind ${item.decision}`],
    excerpt: `A candid look at ${item.decision} — what it costs, what it buys, and whether we'd choose it again.`,
    body: paragraphs(
      `We keep a running decision log for calls like this, and ${item.decision} comes up often enough to write down properly.`,
      `The context: ${item.context}`,
      `The trade-off: ${item.tradeoff}`,
      `The verdict, revisited: ${item.verdict}`
    ),
    tags: `architecture, decisions, trade-offs`,
    coverAlt: "A whiteboard covered in boxes and arrows sketching out a system boundary"
  };
}

type ReleaseNote = { key: string; title: string; body: string[]; tags: string };

const releases: ReleaseNote[] = [
  {
    key: "storefront-module",
    title: "Storefront module 1.0",
    body: [
      "The storefront module — product listing, product detail, cart and checkout pages, all built on the ecommerce domain package — is now stable and out of preview.",
      "Nothing about the underlying `@three-acts/ecommerce` package changed; this release is the page-level template on top of it: gallery, price, availability, add-to-cart island, reviews and related products, wired to shopConfig.",
      "If you forked an earlier preview build, the only breaking change is the review-form island's prop name for the product slug, from `slug` to `productSlug`."
    ],
    tags: "release notes, storefront, ecommerce"
  },
  {
    key: "auth-package",
    title: "Auth package 1.0",
    body: [
      "`@three-acts/auth` is now 1.0: session and user models, a storage-agnostic session store, a sign-up/sign-in/sign-out client, and server-only token signing and password hashing behind a `./server` subpath.",
      "The package is shared unchanged by apps/api and apps/cms — a session scoped to \"shop\" and one scoped to \"cms\" use exactly the same token format, just a different `scope` claim.",
      "New in 1.0: configurable token TTL via `AUTH_TOKEN_TTL_SECONDS`, and an `open` auth mode for local development so a fork can sign in as any editor before wiring up `CMS_EDITORS`."
    ],
    tags: "release notes, auth, packages"
  },
  {
    key: "forms-module",
    title: "Forms module 1.1",
    body: [
      "The contact, newsletter and inquiry form islands now share one submission hook from `@three-acts/forms`, replacing three separate implementations that had quietly drifted apart.",
      "1.1 adds lead scoring to every submission and a honeypot field the API silently discards, both from the forms domain package — no template page changed its markup.",
      "`POST /api/contact` is now fully retired in favour of `POST /api/forms/submit`; the old route has been returning 410 since 1.0 and is removed in this release."
    ],
    tags: "release notes, forms"
  },
  {
    key: "account-module",
    title: "Account module 1.2",
    body: [
      "The account module's order-history view now shows tracking numbers and payment status inline, reading straight from the read-only order fields instead of a second API call.",
      "Sign-in, sign-up and account pages all moved to the same static-shell-plus-client:load pattern as /dashboard, so their SEO head renders before any JavaScript runs.",
      "A small fix: an existing customer record created by checkout with no identity yet now links up correctly on sign-up instead of creating a duplicate — see the auth package's changelog for the underlying fix."
    ],
    tags: "release notes, account, auth"
  }
];

function releaseTopic(item: ReleaseNote): GeneratedTopic {
  return {
    key: `release-${item.key}`,
    category: "release-notes",
    authors: ["nico-de-wet", "sarah-lindqvist", "thandi-mokoena"],
    titles: [item.title],
    excerpt: item.body[0],
    body: paragraphs(...item.body),
    tags: item.tags,
    coverAlt: `A changelog entry for ${item.title} open in the docs`
  };
}

type CaseStudy = { key: string; client: string; changed: string; keptDefault: string; lesson: string; product?: ProductSlug };

const caseStudies: CaseStudy[] = [
  {
    key: "roastery",
    client: "a two-location specialty coffee roastery",
    changed: "the shop and product pages, to support bean weight variants and a subscription add-on the ecommerce package doesn't model out of the box",
    keptDefault: "the CMS, the auth flow and the journal template were used as-is — the agency's only registry change was adding a `roastLevel` select field to Products",
    lesson: "most of the build time went into content and photography, not plumbing — the template's job is to make that the case",
    product: "ecommerce-package"
  },
  {
    key: "law-firm",
    client: "a five-partner corporate law firm",
    changed: "the shop and account modules were deleted entirely — the firm needed a marketing site, a team directory built from a new custom collection, and the contact form, nothing else",
    keptDefault: "the publish model, the SEO settings screens and the wireframe design system's typography scale all shipped unmodified",
    lesson: "deleting unused registry collections and routes took under an hour, and the deploy pipeline didn't need to change at all",
    product: "content-package"
  },
  {
    key: "clinic",
    client: "a small dental clinic with four practitioners",
    changed: "the forms module grew a fourth form type, `booking`, alongside contact/newsletter/inquiry, with its own lead-scoring rule in the forms package",
    keptDefault: "everything else — the agency reused none of the storefront module's cart/account plumbing, since the clinic doesn't sell anything, and just deleted the shop routes",
    lesson: "the forms package's shared validation and scoring meant the new booking form only needed a new schema, not new server code",
    product: "forms-package"
  }
];

function caseStudyTopic(item: CaseStudy): GeneratedTopic {
  const angle = item.key === "roastery" ? "product variants" : item.key === "law-firm" ? "deleting what you don't need" : "extending the forms package";
  return {
    key: `case-${item.key}`,
    category: "case-studies",
    authors: ["maya-rosenberg", "daniel-okoye"],
    titles: [`Case study: ${item.client}`, `What an agency actually changed for ${item.client}`, `Forking Three Acts for ${item.client}`],
    excerpt: `What the agency changed, what they kept as the template default, and what it taught us about ${angle}.`,
    body: paragraphs(
      `An agency partner brought us this build after launch, and it's a good example of how little of the template most client sites actually replace.`,
      `What changed: ${item.changed}.`,
      `What stayed default: ${item.keptDefault}.`,
      `The lesson: ${item.lesson}.${item.product ? ` If you're planning something similar, start with ${shopLink(item.product)}.` : ""}`
    ),
    tags: `case study, agencies, ${item.key}`,
    coverAlt: `A laptop showing a client site homepage next to the Three Acts docs`
  };
}

const generatedTopics: GeneratedTopic[] = [
  ...collectionSpotlights.map(collectionTopic),
  ...guideTasks.map(guideTopic),
  ...componentSpotlights.map(componentTopic),
  ...archRetros.map(archTopic),
  ...releases.map(releaseTopic),
  ...caseStudies.map(caseStudyTopic)
];

/** Status overrides for generated articles, keyed by topic key. */
const generatedStatus: Record<string, Partial<Pick<ArticleSpec, "status" | "liveOverrides" | "modifiedDays" | "publishedDays" | "author" | "excerpt" | "coverAlt">>> = {
  "guide-add-field": { status: "draft", modifiedDays: 6, liveOverrides: { tags: "guide, registry, migration" } },
  "design-card": { status: "queued_to_publish", modifiedDays: 2, liveOverrides: { excerpt: "A short version of this guide, while we finish the long one." } },
  "case-roastery": { status: "queued_to_publish", publishedDays: -2, modifiedDays: 0 },
  // A brand-new draft the editor has not finished: no excerpt and no cover yet (covers are required to publish).
  "case-law-firm": { status: "draft", publishedDays: -14, modifiedDays: 3, author: "ruben-adams", excerpt: "", coverAlt: null },
  "cms-faqs": { status: "not_published", modifiedDays: 90 },
  "release-account-module": { status: "not_published", modifiedDays: 140 },
  "guide-write-island": { status: "draft", publishedDays: -20, modifiedDays: 9 }
};

const generatedArticles: ArticleSpec[] = generatedTopics.map((topic, index) => {
  const picked = pick(topic.titles);
  const title = picked[0].toUpperCase() + picked.slice(1);
  const override = generatedStatus[topic.key] ?? {};
  const publishedDays = override.publishedDays ?? 20 + index * 19 + Math.floor(rand() * 12);
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const withSeo = index % 5 !== 3;
  return {
    key: topic.key,
    slug,
    title,
    excerpt: override.excerpt ?? topic.excerpt,
    body: topic.body,
    author: override.author ?? pick(topic.authors),
    category: topic.category,
    tags: topic.tags,
    publishedDays,
    featured: false,
    seoTitle: withSeo ? title.replace(/:.*$/, "").slice(0, 60) : "",
    seoDescription: withSeo ? topic.excerpt.slice(0, 155) : "",
    coverAlt: override.coverAlt === undefined ? topic.coverAlt : override.coverAlt,
    status: override.status,
    liveOverrides: override.liveOverrides,
    modifiedDays: override.modifiedDays
  };
});

const articleRecords: CmsRecord[] = [...flagshipArticles, ...generatedArticles].map(articleRecord);

// --- FAQs --------------------------------------------------------------------

type FaqSpec = { key: string; topic: "general" | "orders" | "shipping" | "returns" | "products" | "account"; question: string; answer: string; status?: PublishStatus; live?: Values };

const faqSpecs: FaqSpec[] = [
  { key: "what-is-three-acts", topic: "general", question: "What is Three Acts?", answer: "Three Acts is a reusable foundation for client websites: a static Astro public site that can optionally add a private CMS, a Vercel API, persistent data, auth and payments — without changing how the public pages render." },
  { key: "who-is-it-for", topic: "general", question: "Who is Three Acts for?", answer: "Agencies and freelancers who rebuild the same client-site plumbing on every project: a marketing site, a blog, a small shop, a contact form and a sign-in flow. Fork it once, then swap in each client's content and configuration." },
  { key: "need-the-cms", topic: "general", question: "Do I need the CMS to use the template?", answer: "No. The lightweight path runs apps/web alone with mock or file-backed content — no CMS, API, database or third-party provider required. Add the Editorial App and the API only when a client needs editable content or server-side behaviour." },
  { key: "try-before-buying", topic: "general", question: "Is there a way to try Three Acts before buying?", answer: "Yes — clone the public repository and run the lightweight path locally with zero configuration. A licence unlocks the private CMS, the API app and the domain packages for a real client build." },
  { key: "payment-methods", topic: "orders", question: "Which payment methods do you accept?", answer: "Card, Instant EFT and PayPal at checkout, all processed through the API's payment provider bridge — never a client-side integration. We don't store card details." },
  { key: "change-order", topic: "orders", question: "Can I change or cancel an order after buying?", answer: "Digital pieces are delivered instantly, so we can't cancel once the download link is issued. If you bought the wrong licence tier, email us within 24 hours and we'll swap it at no charge." },
  { key: "currency", topic: "orders", question: "Do you invoice in a currency other than USD?", answer: "Every price in the shop is in USD. Your card issuer or PayPal converts at checkout; we don't offer multi-currency invoicing today." },
  { key: "invoice", topic: "orders", question: "Can I get an invoice for my company?", answer: "Yes — every order confirmation email includes an invoice. Add your company name at checkout and we'll put it on the invoice automatically." },
  { key: "instant-access", topic: "shipping", question: "How do I get access after buying?", answer: "Apps and packages unlock instantly: you'll get a download link and, for licensed repositories, an invite to a private GitHub repo within a few minutes of payment clearing." },
  { key: "updates-included", topic: "shipping", question: "Do purchases include future updates?", answer: "Yes. A single-site licence includes updates to that piece for 12 months; an agency licence includes updates for as long as it's active. After that you keep what you have and can renew for continued updates." },
  { key: "available-everywhere", topic: "shipping", question: "Is Three Acts available everywhere?", answer: "Yes — everything is delivered digitally, so there's no regional restriction. Support hours are Cape Town business hours (UTC+2)." },
  { key: "confirm-purchase", topic: "shipping", question: "How do I know my purchase went through?", answer: "You'll get an email receipt immediately and the CMS or repo invite follows within a few minutes. If either hasn't arrived after 30 minutes, check spam, then contact us with your order number." },
  { key: "refund-policy", topic: "returns", question: "Can I get a refund?", answer: "Yes — if you haven't used the licence (no repo forked, no build deployed), we'll refund it in full within 14 days of purchase. Email us with your order number." },
  { key: "already-forked", topic: "returns", question: "What if I already forked the repo and started building?", answer: "Once the licence has been used — a repo has been forked or a build deployed — it's no longer eligible for a refund, since the code and any support time are already delivered." },
  { key: "broken-download", topic: "returns", question: "My download link doesn't work. What now?", answer: "Email us your order number and we'll resend it. If the piece itself has a bug, tell us what broke and we'll fix it or refund you, whichever you'd rather have." },
  { key: "licence-difference", topic: "products", question: "What's the difference between a single-site licence and an agency licence?", answer: "A single-site licence covers one client deployment. An agency licence covers unlimited client deployments under your agency, plus priority support — see /licenses for the full comparison." },
  { key: "whats-included", topic: "products", question: "What does each product page actually include?", answer: "Every product page lists exactly what ships: source files, the relevant domain package(s), setup docs and, where relevant, a preview link. Apps and modules include their tests." },
  { key: "support", topic: "products", question: "Do you offer support if something breaks?", answer: "Yes — every licence includes email support for setup issues and bugs in the piece itself. Agency licences get priority response times; custom client work is available through the Setup Service." },
  {
    key: "white-label",
    topic: "products",
    question: "Do you offer white-label reseller licensing?",
    answer: "We're finalising a white-label reseller tier for hosting partners — reach out and we'll let you know when it's ready, including preview pricing.",
    status: "draft",
    live: { answer: "Not yet — reseller licensing isn't available today." }
  },
  { key: "sign-in", topic: "account", question: "How do I sign in?", answer: "Use the email you purchased with at /sign-in. If you don't have a password yet — for example your licence was set up for you — request a reset link and set one on first sign-in." },
  { key: "licence-keys", topic: "account", question: "Where do I find my licence keys?", answer: "Sign in and open /account — every purchase and its licence key or repo invite link is listed under Order history." },
  { key: "transfer-licence", topic: "account", question: "Can I transfer a single-site licence to a different client?", answer: "Yes, once — email us the old and new client details and we'll reissue the licence. After the first transfer, further changes need an agency licence." },
  { key: "delete-account", topic: "account", question: "How do I delete my account?", answer: "Email privacy@threeacts.dev from the address on your account and we'll delete your account and personal data within 30 days. Order records we're required to keep for tax purposes are retained for five years.", status: "queued_to_publish" },
  { key: "referral-program", topic: "account", question: "Do you have a referral or affiliate programme?", answer: "Not yet — we're planning one for next year.", status: "not_published" }
];

const faqRecords: CmsRecord[] = faqSpecs.map((spec, index) => {
  const sortOrder = faqSpecs.slice(0, index).filter((other) => other.topic === spec.topic).length + 1;
  const values: Values = { question: spec.question, answer: spec.answer, topic: spec.topic, sortOrder };
  return seedRecord({
    id: `faq-${spec.key}`,
    publishStatus: spec.status ?? "published",
    createdAt: daysAgo(560 - index * 7),
    modifiedAt: daysAgo(spec.status ? 3 + (index % 4) : 200 - index * 5),
    values,
    liveValues: spec.live ? { ...values, ...spec.live } : undefined
  });
});

export const contentSeed: SeedCollections = {
  authors: authorRecords,
  "article-categories": categoryRecords,
  articles: articleRecords,
  faqs: faqRecords
};
