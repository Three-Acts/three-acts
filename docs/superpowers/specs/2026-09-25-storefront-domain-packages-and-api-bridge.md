# Storefront, domain packages, and the API as the bridge

> Status: In progress (2026-09-25). This is the build contract for turning the
> template into a complete, data-driven client site. Every seam below is
> fixed so independent work streams stay compatible. When something here
> conflicts with code, the code that lands first wins and this file is updated.

## Why

The registry and seed already model a realistic brand ("Fynbos & Fire", a
Cape Town coffee roaster): articles, authors, categories, FAQs, testimonials,
products, product categories, reviews, orders, customers, discount codes,
form submissions, site/page settings, redirects. The public web app only
rendered a blog. The CMS let editors "create" orders and customers, which
would fabricate operational data. Auth accepted any password locally and
never touched the API.

Goals:

1. The public site renders every data point and offers the full shopper
   flow: browse, cart (persists across pages), checkout, order confirmation,
   sign up / log in, account with order history, product reviews, contact /
   newsletter / inquiry forms.
2. Every read and write goes through `apps/api`. The API is the bridge to
   whatever backend a client picks (file store now, Supabase/Neon later).
   Auth also goes through the API: the browser sends credentials to the API,
   the API talks to the identity provider, and hands a session back.
3. Reusable logic lives in domain packages so a client fork changes
   configuration and content, not plumbing.
4. Records that the site creates (orders, customers, form submissions) cannot
   be created in the CMS. Editors can still view, edit the fields that are
   theirs to edit, and delete.
5. Local development needs zero external services: a JSON-file-backed data
   store in the API persists writes across restarts.

## Packages (all `private`, TS source exports like `@three-acts/cms-schema`)

Every package: `package.json` with `"exports": { ".": { "types": "./src/index.ts", "default": "./src/index.ts" } }` plus
subpaths listed below, `tsconfig.json` extending `../../tsconfig.base.json`,
`sideEffects: false`, `"type": "module"`. React-dependent code lives under a
`./react` subpath so the core stays framework-agnostic. Packages never import
from `apps/*`. Tests are `*.test.ts` next to the code, run by the root
`npm test` (`tsx --test`), using `node:test` + `node:assert/strict`.

### `@three-acts/cms-schema` (exists; changes)

Types (`src/types.ts`):

```ts
/** Where a collection's records come from. */
export type RecordSource = "editors" | "site";
// CmsCollection gains:
//   recordSource?: RecordSource;  // default "editors". "readonly" mode implies "site".
// FieldBase gains:
//   readOnly?: boolean;           // editor renders the value but never an input; the API
//                                  // keeps the stored value on editor saves. System writes
//                                  // (checkout, signup, forms) set it through the service's
//                                  // system paths.
// PrimitiveField.format gains "json": value must be "" or valid JSON (any JSON value).
```

Helpers (`src/columns.ts`): `recordSourceFor(collection): RecordSource`,
`canCreateRecords(collection): boolean` (false for `readonly` mode and for
`recordSource: "site"`), `isReadOnlyField(field): boolean`.

Registry changes (`src/registry.ts`):

- Remove `cms-users` entirely (and the "People" group).
- `form-submissions`: field `source` becomes `form` (label "Form", select, required):
  `contact` "Contact", `newsletter` "Newsletter", `inquiry` "Inquiry". List column
  `source` becomes `form`. Description updated. Keep `submittedBy`, `email`,
  `message`, `score`, `consent`, `attachment`, `submittedAt`, `submissionId`.
  Add `company` (text, optional; inquiry forms), `phone` (text, optional).
- `orders`: add `recordSource: "site"`. Add fields (after `notes` is fine, but
  put `items` after `itemCount`):
  - `items` textarea, `format: "json"`, `readOnly: true`, label "Line items",
    helpText "JSON array of line items written by checkout." Value shape is
    `OrderLineItem[]` from `@three-acts/ecommerce`.
  - `shippingName` text, `shippingAddress` textarea, `shippingPostalCode` text,
    `customerPhone` text.
  - `readOnly: true` on: `orderNumber`, `customerEmail`, `itemCount`, `subtotal`,
    `discountTotal`, `discountCode`, `taxTotal`, `shippingTotal`, `total`,
    `currency`, `placedAt`, `paymentMethod`. Editors may change `status`,
    `paymentStatus`, `trackingNumber`, `notes`, `customerName`, shipping fields.
- `customers`: add `recordSource: "site"`. Add `address` (textarea),
  `postalCode` (text). `readOnly: true` on `email`, `totalOrders`,
  `lifetimeValue`, `firstOrderAt`, `lastOrderAt`.
- `product-reviews`: unchanged mode (`data`, editors may add reviews told to
  them in person). Add `source` select: `site` "Submitted on site", `manual`
  "Added by staff" (default for editor-created records is set by the CMS to
  `manual`; the API review route sets `site`).
- `products`, `product-categories`, `articles`, `authors`, `article-categories`,
  `faqs`, `testimonials`, `discount-codes`, `site-settings`, `page-settings`,
  `redirect-rules`, `media-library`: unchanged.

Seed (`src/seed`): drop `cms-users` (and `keys.ts` comment), map old form
sources (`product_enquiry`→`inquiry`, `wholesale`→`inquiry`, `support`→`contact`),
fill `company`/`phone` on inquiries, serialize `items` on every order from the
already-generated line items (`OrderLineItem` shape), fill `shippingName`/
`shippingAddress`/`shippingPostalCode`/`customerPhone` deterministically,
`address`/`postalCode` on customers, `source: "site"` on reviews (a handful
`manual`). Update tests. Then run `npm run schema:migrate -w @three-acts/api -- storefront`
and commit the migration + snapshot.

Also export from `src/index.ts` a `formTypes` list derived from the registry
is NOT needed: `@three-acts/forms` reads the select options from the registry.

### `@three-acts/content` (new: `packages/content`)

Typed read models for editorial collections and one client that fetches them
through the public content route. Used by the web build and by any app that
needs published content.

```ts
// src/models.ts
export type ImageRef = { src: string; alt: string; width?: number; height?: number };
export type Article = { id; slug; title; excerpt; body; coverImage?: ImageRef; authorSlug; categorySlug; tags: string[]; publishedAt; updatedAt; readingTime: number; featured: boolean; seoTitle?; seoDescription? };
export type Author = { id; slug; name; role; bio; avatar?: ImageRef; email?; websiteUrl?; xHandle?; instagramHandle?; linkedinUrl? };
export type ArticleCategory = { id; slug; name; description; sortOrder };
export type Faq = { id; question; answer; topic: string; sortOrder };
export type Testimonial = { id; customerName; quote; customerTitle?; company?; avatar?: ImageRef; rating: number; productSlug?; featured: boolean; sortOrder };
export type SiteSettings = { siteName; titleTemplate; defaultMetaDescription; defaultOgImage?: ImageRef; favicon?: ImageRef; twitterHandle; locale; allowIndexing: boolean; schemaMarkup: unknown[] };
export type PageSettings = { id; pageName; pagePath; metaTitle; metaDescription; canonicalUrl; ogTitle; ogDescription; ogImage?: ImageRef; searchTitle; searchDescription; searchImage?: ImageRef; schemaMarkup: unknown[] };
export type RedirectRule = { sourcePath; targetUrl; statusCode: 301|302|307|308; permanent: boolean };
// src/mappers.ts: toArticle(record), toAuthor, ..., each reading `record.values` by registry field key
//   (the public route already returns liveValues as `values`). Empty slug → skip (return null).
// src/client.ts
export type ContentFetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
export function createContentClient(options: { origin: string; fetch?: ContentFetch }): ContentClient;
export type ContentClient = {
  listArticles(); getArticle(slug); listAuthors(); listArticleCategories(); listFaqs(); listTestimonials();
  listProducts(); getProduct(slug); listProductCategories();   // product types come from @three-acts/ecommerce
  getSiteSettings(); listPageSettings(); listRedirects();
  // all cached per client instance; every list fetches all pages of
  // GET {origin}/api/content/collections/:id/records (limit 200) exactly like today's api-source.ts
};
// src/seed-fetch.ts
export function createSeedContentFetch(): ContentFetch;
// Serves the same envelope/pagination as the API's content route straight from
// `@three-acts/cms-schema/seed` (live snapshots of editorial collections;
// redirects from the data collection). Lets the zero-config web build run the
// exact same client code without a server.
```

`listRedirects` reads `GET /api/content/redirects` (new public route, below).

### `@three-acts/ecommerce` (new: `packages/ecommerce`)

```ts
// src/config.ts — the fork-time knobs, one object:
export const shopConfig = { currency: "ZAR", vatRate: 0.15, pricesIncludeVat: true,
  shipping: { freeOverInclVat: 600, domestic: 95, international: 450, domesticCountry: "ZA", collection: 0 },
  orderNumberPrefix: "FF", lowStockThreshold: 5 };
// src/models.ts
export type Product = { id; slug; sku; title; categorySlug; price; compareAtPrice?; currency; inventory; availability: "in_stock"|"low_stock"|"out_of_stock"|"preorder"|"discontinued"; shortDescription; description; images: ImageRef[]; video?: { src; contentType }; specSheet?: { src; fileName }; weightGrams; tags: string[]; featured: boolean };
export type ProductCategory = { id; slug; name; description; image?: ImageRef; sortOrder };
export type ProductReview = { id; productSlug; title; customerName; rating: number; body; verifiedPurchase: boolean; submittedAt };
export type CartLine = { slug: string; quantity: number };
export type Cart = { lines: CartLine[]; discountCode?: string; updatedAt: string };
export type OrderLineItem = { slug; sku; title; quantity; unitPrice; lineTotal; currency; image?: string };
export type ShippingMethod = "domestic" | "international" | "collection";
export type DiscountKind = "percentage" | "fixed_amount" | "free_shipping";
export type Discount = { code; kind: DiscountKind; amount; minimumSubtotal };
export type PriceBreakdown = { currency; itemCount; merchandiseInclVat; subtotal /*ex VAT*/; discountTotal; taxTotal; shippingTotal; total; freeShipping: boolean };
export type Order = { id; orderNumber; customerEmail; customerName; status; paymentStatus; paymentMethod; items: OrderLineItem[]; ...PriceBreakdown fields; discountCode; placedAt; shippingName; shippingAddress; shippingCity; shippingPostalCode; shippingCountry; trackingNumber };
export type Customer = { id; name; email; phone; address; city; postalCode; country; marketingOptIn; totalOrders; lifetimeValue; firstOrderAt?; lastOrderAt? };
// src/mappers.ts: toProduct(record), toProductCategory, toProductReview, toOrder, toCustomer,
//   parseOrderItems(value) / serializeOrderItems(items)
// src/pricing.ts — pure, mirrors the seed money model exactly:
export function priceCart(lines: Array<{ product: Product; quantity: number }>, options: { discount?: Discount; shippingMethod: ShippingMethod; country: string }): PriceBreakdown;
export function applyDiscount(...)  export function shippingFor(...)  export function formatMoney(amount, currency, locale?)
// src/cart-store.ts — framework-agnostic, storage-agnostic:
export function createCartStore(options?: { storage?: KeyValueStorage; key?: string }): CartStore;
// CartStore = { getState(): Cart; subscribe(listener): () => void; add(slug, qty=1); setQuantity(slug, qty); remove(slug); clear(); setDiscountCode(code|undefined) }
// Persists to localStorage under "three-acts:cart:v1" when available; listens to `storage`
// events so every island on every page shares one cart; safe on the server (no window).
// src/react/index.ts (subpath "./react"): CartProvider, useCart(), useCartStore()
// src/api-contract.ts:
export const shopApiPaths = {
  products: () => "/shop/products", product: (slug) => `/shop/products/${slug}`,
  reviews: (slug) => `/shop/products/${slug}/reviews`, validateDiscount: () => "/shop/discounts/validate",
  checkout: () => "/shop/checkout", orders: () => "/shop/orders", order: (n) => `/shop/orders/${n}` };
export type CheckoutRequest = { lines: CartLine[]; customer: { name; email; phone? }; shipping: { name; address; city; postalCode; country; method: ShippingMethod }; discountCode?; paymentMethod: "card"|"eft"|"paypal"|"apple_pay"|"gift_card"; marketingOptIn?: boolean; notes? };
export type CheckoutResponse = { order: Order };
export type ValidateDiscountRequest = { code; lines: CartLine[] }; export type ValidateDiscountResponse = { valid: boolean; discount?: Discount; reason?: string; breakdown?: PriceBreakdown };
export type SubmitReviewRequest = { title; customerName; customerEmail?; rating: 1|2|3|4|5; body };
export type ListOrdersResponse = { orders: Order[] };
```

### `@three-acts/auth` (new: `packages/auth`)

```ts
// src/models.ts
export type AuthScope = "shop" | "cms";
export type AuthUser = { id; email; name; scope: AuthScope; customerId?: string; role?: "admin"|"editor" };
export type Session = { token: string; user: AuthUser; expiresAt: string };
export type SignInCredentials = { email; password }; export type SignUpInput = { name; email; password; marketingOptIn?: boolean };
// src/api-contract.ts
export const authApiPaths = { signUp: () => "/auth/sign-up", signIn: () => "/auth/sign-in", signOut: () => "/auth/sign-out", session: () => "/auth/session", account: () => "/auth/account" };
export type SignInRequest = SignInCredentials & { scope?: AuthScope /* default "shop" */ }; export type SignInResponse = Session; export type SignUpRequest = SignUpInput; export type SessionResponse = { user: AuthUser | null };
export type UpdateAccountRequest = Partial<{ name; phone; address; city; postalCode; country; marketingOptIn }>;
// src/session-store.ts — client-side, storage-agnostic like the cart store:
export function createSessionStore(options?: { storage?; key? }): SessionStore; // getState(): Session|null; subscribe; set(session|null); getToken()
// src/client.ts
export function createAuthClient(options: { apiFetch; store: SessionStore; scope: AuthScope }): AuthClient;
// AuthClient = { signIn(credentials); signUp(input); signOut(); restore(): Promise<AuthUser|null>; getAccessToken(); getUser() }
// src/react/index.ts (subpath "./react"): AuthProvider({ client }), useAuth() → { user, session, status: "initializing"|"anonymous"|"authenticated", error, signIn, signUp, signOut }
// src/server/index.ts (subpath "./server", node only):
export function signSessionToken(payload: { sub; email; name; scope; customerId?; role?; ttlSeconds? }, secret: string): { token; expiresAt };
export function verifySessionToken(token: string, secret: string): AuthUser | null;   // HMAC-SHA256, base64url, exp check, constant-time compare
export function hashPassword(password): Promise<string>; export function verifyPassword(password, hash): Promise<boolean>; // scrypt via node:crypto
```

### `@three-acts/forms` (new: `packages/forms`)

```ts
export type FormType = "contact" | "newsletter" | "inquiry";   // must match the registry select options (test asserts this)
export type FormSubmission = { form: FormType; name?: string; email: string; message?: string; company?: string; phone?: string; consent?: boolean; website?: string /* honeypot */ };
export const formsApiPaths = { submit: () => "/forms/submit" };
export type SubmitFormResponse = { received: true; submissionId: string };
export function validateSubmission(input: unknown): { ok: true; value: FormSubmission } | { ok: false; errors: Record<string, string> };
// rules: email required+valid; name required except newsletter; message required for contact/inquiry (1..5000); company optional; consent boolean.
export function leadScore(submission: FormSubmission): number; // deterministic heuristic used by the API
// ./react: useFormSubmission({ apiFetch }) → { status, errors, submit(values) }
```

## API app changes (`apps/api`)

Env (add to `.env.example`):

```
CMS_DATA_BACKEND=file|memory|supabase   # default: supabase if configured, else file (memory on Vercel/production)
CMS_DATA_DIR=./data                     # file backend: one JSON file per collection, seeded on first run
AUTH_SECRET=                            # signs session tokens; dev fallback "three-acts-dev-secret" outside production; 503 in production if unset
AUTH_TOKEN_TTL_SECONDS=1209600
CMS_AUTH_MODE=open|env                  # open (dev default): any email/password signs in to the CMS. env: CMS_EDITORS="email:password,email:password"
CMS_EDITORS=
SHOP_OPEN_PASSWORDS=true                # dev default outside production: seeded customers (no identity yet) may sign in with any password; first sign-in stores that password
PAYMENT_PROVIDER=mock                   # the only implementation today; the interface is in api/_lib/shop/payments.ts
```

Data store: `api/_lib/cms/file-store.ts` — `FileDataStore implements CmsDataStore`.
Directory from `CMS_DATA_DIR` (relative to `apps/api`). On first access, if a
collection file is missing, write the seed (`cloneSeedCollections()`) for that
collection. Reads load the file into memory once and keep it in sync; every
mutation rewrites that collection's file atomically (write temp, rename). It
reuses the memory store's logic (extract the shared pieces from
`memory-store.ts` rather than duplicating). `data/` is gitignored except a
`data/.gitkeep`. `FileBlobStore` writes uploads to `CMS_DATA_DIR/uploads/<bucket>/...`
and returns a URL under `/api/uploads/...` served by a new `GET /api/uploads/[...path]`
route (dev only; production keeps Supabase/memory).

Identity: `api/_lib/auth/identity-store.ts` — `IdentityStore` interface
(`findByEmail`, `create`, `setPassword`) with a file/memory implementation in
`CMS_DATA_DIR/identities.json` (never a CMS collection). `api/_lib/auth/sessions.ts`
wraps `@three-acts/auth/server`. `requireAuth` (existing) becomes
`requireCmsAuth`: accepts a `cms`-scoped session token OR the legacy
`PUBLISH_TOKEN`. New `requireShopAuth(request): AuthUser` for account routes.

Service additions (`api/_lib/cms/service.ts`): `createSystemRecord(collectionId, values, publishStatus?)`
and `updateSystemRecord(collectionId, recordId, patch)` bypass `recordSource`
and `readOnly` gating (they are the site's write path); `createRecord`/`importRecords`
throw `CmsError("forbidden")` when `!canCreateRecords(collection)`; `saveRecord`
preserves stored values of `readOnly` fields; `format: "json"` validated like
`json-ld`.

Routes (register each in `scripts/dev-server.ts`):

```
POST /api/auth/sign-up          → creates identity + customers record (system path) → Session (scope shop)
POST /api/auth/sign-in          → { email, password, scope? } → Session
POST /api/auth/sign-out         → { ok: true } (stateless; client drops the token)
GET  /api/auth/session          → { user } from bearer token (null if none/invalid)
GET  /api/auth/account          → shop token → { customer: Customer }
PUT  /api/auth/account          → UpdateAccountRequest → { customer }
GET  /api/shop/products         → { products: Product[] } live products (availability != discontinued)
GET  /api/shop/products/:slug   → { product }
GET  /api/shop/products/:slug/reviews → { reviews: ProductReview[] } approved only, newest first
POST /api/shop/products/:slug/reviews → SubmitReviewRequest → { review } (approved: false, source: "site")
POST /api/shop/discounts/validate → ValidateDiscountRequest → ValidateDiscountResponse
POST /api/shop/checkout         → CheckoutRequest (optional shop token) → CheckoutResponse
      validates lines against live products + inventory, prices with @three-acts/ecommerce,
      charges via PaymentProvider (mock: card/apple_pay/paypal → paid, eft → awaiting, gift_card → paid),
      creates the order (system path; orderNumber = prefix + (max existing + 1)), decrements inventory
      (system update), upserts the customer (aggregates: totalOrders, lifetimeValue, first/lastOrderAt),
      increments discount timesUsed.
GET  /api/shop/orders           → shop token → { orders } for the customer's email, newest first
GET  /api/shop/orders/:orderNumber → shop token → { order } (403 if not the customer's)
POST /api/forms/submit          → FormSubmission → { received, submissionId }; honeypot short-circuits;
      writes form-submissions via the system path (score from leadScore, submittedAt now).
      /api/contact is removed.
GET  /api/content/redirects     → { redirects: RedirectRule[] } (public, cacheable)
GET  /api/uploads/[...path]     → file blob store files (file backend only)
```

`/api/content/collections/:id/records` is unchanged (already serves every
editorial collection: products, product-categories, faqs, testimonials,
site-settings, page-settings, articles, authors, article-categories).

## CMS app changes (`apps/cms`)

- Hide New/Import when `!canCreateRecords(collection)`; the empty-state copy
  says where records come from ("Orders are created by checkout on the site.").
- `readOnly` fields render as a read-only detail row (value + lock hint), never
  an input; `format: "json"` renders the code-style textarea already used for
  `json-ld` (pretty-printed when read-only).
- Remove every `cms-users` reference (sidebar group "People" disappears).
- Product reviews created in the CMS default `source` to `manual`.
- Auth: `AuthClient` in `rest` mode is built from `@three-acts/auth`
  (`createAuthClient({ apiFetch, store, scope: "cms" })`) and calls
  `/api/auth/sign-in`; the token it stores is what `apiFetch` attaches. The
  mock backend keeps the local mock auth client. `VITE_PUBLISH_TOKEN` stays as
  an optional fallback only when no session exists. Login copy no longer says
  "accepts any email and password" unconditionally; it says the API decides.
- `.env.example`: `VITE_CMS_BACKEND=rest`.

## Web app (`apps/web`)

### Content wiring

`src/content/index.ts` resolves `CONTENT_SOURCE`: `api` → `createContentClient({ origin })`,
`mock`/unset → `createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() })`.
Same client, same mappers, one transport switch. `.env.example` sets
`CONTENT_SOURCE=api`. Delete `api-source.ts` / `mock-source.ts` / `ContentEntry`.

`site.ts` keeps only non-CMS things (nav structure, brand fallbacks). The
layout reads `SiteSettings` (name, title template, default description, OG
image, twitter, locale, allowIndexing, schema markup) and `PageSettings` for
static routes via a `resolvePageSeo(path, fallback)` helper in `src/lib/seo.ts`.
`astro.config.mjs` loads redirect rules from the content client (top-level
await) into Astro `redirects`, falling back to none when the fetch fails.

### Design direction (binding for every page agent)

Brand: Fynbos & Fire, specialty coffee roaster, Cape Town. Warm, editorial,
confident, not a generic Shopify theme. Use the existing tokens in
`src/theme.css` and extend them; do not hardcode hex in components:

- Surfaces: `paper` (#f7f1e7) page, `panel` (#fffaf0) cards, `ink` (#171512)
  text and the dark "roastery" sections, `charcoal` secondary dark.
- Accents: `rust` (#ad5d3a) primary action, `moss` (#365344) secondary /
  success / eyebrows, `gold` (#d6a23f) ratings and highlights.
- Type: Fraunces (serif, display + headings, loaded from Google Fonts with
  `display=swap`), Inter (body/UI). Headings tight tracking, generous leading
  on body (1.6–1.7). Eyebrows small caps tracking 0.14em in `moss`.
- Shape: 2px borders in `ink` at 15% opacity for structure, radius 0 for
  cards and buttons (keep the "paper and ink" print feel), one soft shadow
  token for lifted panels. Grain-free, no gradients except the hero wash.
- Layout: `max-w-6xl` container, sections `py-16` / `py-24` on desktop,
  generous whitespace, asymmetric editorial grids on home/blog, product grids
  3-up (2-up landscape, 1-up portrait). Mobile-first; breakpoints already
  defined (`portrait`, `landscape`, `tablet`, `desktop`).
- Motion: only transitions on hover/focus (colors, 150ms) and a subtle
  translate on cards. No scroll animation libraries.
- Accessibility: visible focus rings (`outline-2 outline-offset-2 outline-rust`),
  every icon button labelled, forms with real `<label>`s and error text,
  colour contrast AA on every token pair used.

UI kit (`src/components/ui/*`, dot-notation like the existing `Button`):
`Button` (primary=rust, secondary=outline ink, ghost, dark, sizes sm/md/lg,
`Link` variant), `Card.Product`, `Card.Article`, `Card.Category`,
`Card.Testimonial`, `Price` (with compare-at), `Rating` (gold stars,
accessible), `Badge` (availability, category, tag), `Prose` (renders
`\n\n`-separated body text with links to /shop and /blog paths preserved),
`Breadcrumb`, `Field` (label + input/textarea/select + error), `Avatar`,
`EmptyState`, `Notice` (info/success/error). Layout: `Section.Root/Container/Header`
(eyebrow + title + lede), `Grid`. The header gets a `CartButton` island
(count badge) and an `AccountLink` island (name or "Sign in"); the footer gets
the newsletter form island, nav columns and the roastery address from the
site's schema markup.

### Routes

Static (prerendered from content):

- `/` home: hero, featured products, shop categories, featured articles,
  testimonials, FAQ teaser, newsletter, visit-the-roastery block.
- `/shop`, `/shop/category/[slug]`, `/shop/[slug]` (gallery, price, availability,
  add-to-cart island, description, spec sheet, video, approved reviews +
  review-form island, product FAQs, related products), Product JSON-LD.
- `/blog`, `/blog/[slug]` (byline with author avatar, category, tags, related
  articles), `/blog/category/[slug]`, `/authors/[slug]`.
- `/faq` grouped by topic, FAQPage JSON-LD. `/about` (story, team = authors,
  testimonials). `/contact` (contact form island), `/wholesale` (inquiry form
  island), `/visit-the-roastery`, `/shipping`, `/returns`, `/terms`, `/privacy`,
  `/careers`, `/subscriptions` (short, real-feeling copy; SEO from page-settings).
- `/404`. `sitemap.xml`, `robots.txt` (honours `allowIndexing`), `llms.txt`.

Client routes (static shell + `client:load` island, `noindex`):

- `/cart` (lines, quantity, remove, discount code, totals, proceed).
- `/checkout` (contact + shipping + method + payment method, order summary,
  place order → `/checkout/complete?order=FF-10822`).
- `/checkout/complete` (fetches the order when signed in; otherwise shows the
  number and totals passed through session storage by the checkout island).
- `/sign-in`, `/sign-up`, `/account` (profile edit, order history with
  status/tracking, sign out). Unauthenticated `/account` redirects to `/sign-in`.

Islands share the cart and session via the package stores (localStorage), so
navigating between static pages never loses state. Every network call uses
`src/lib/api-client.ts` (`apiFetch`) which attaches the session token.

## Docs

- `CONTEXT.md`: add Record Source, Read-only Field, System Write Path, File
  Data Store, Identity Store, Session, Storefront, Cart, Checkout, Form
  Submission types; update relationships and the example dialogue; remove
  "CMS users".
- `docs/adr/0005-domain-packages-and-api-bridge.md`.
- `README.md`: packages list, routes, env vars, "Forking for a client"
  checklist (registry, seed, `shopConfig`, `site.ts`, theme, page copy).

## Work streams

Wave 1 (foundations, parallel): schema+seed+migration; content package;
ecommerce package; auth package; forms package; API file store + service
system paths + auth middleware; web design system + layout + content wiring;
CMS gating + auth.

Wave 2 (features, parallel): API auth routes; API shop routes; API forms +
redirects + uploads; web shop pages; web cart/checkout; web auth/account; web
blog/authors; web home/about/faq/forms/static pages; web SEO/sitemap/redirects;
docs.

Wave 3: integration (typecheck, lint, tests, build with `CONTENT_SOURCE=api`
against the dev API, browser smoke of the shopper flow), review, fixes.
