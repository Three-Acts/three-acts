# Three Acts

A reusable foundation for client websites. It starts as a lightweight Astro site and can opt into a private editorial workspace, server-side APIs, persistent content, asset storage, authentication, payments, webhooks, or other application behavior without changing the public site's rendering model.

The repository is a template, not a finished client implementation. Keep only the apps and capabilities a project needs, replace the example content and collection registry, and add providers behind the existing boundaries rather than coupling client-facing code to a vendor.

## Choose a project path

### Lightweight website

Use `apps/web` with the built-in mock content source. Static pages ship as HTML and CSS; React is only sent for components explicitly hydrated as Astro islands. No API, CMS, database, auth provider, or external service is required.

```sh
npm install
npm run dev:web
```

### Application-backed website

Run the public site, CMS, and API together when a project needs editorial content or server-side behavior:

```sh
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/cms/.env.example apps/cms/.env
npm run dev
```

The zero-configuration development defaults still use mock content in the web app, the mock CMS backend, and in-process API stores. Opt into the REST CMS and a persistent provider only when the project needs them; see [CMS backend](#cms-backend) and [Environment variables](#environment-variables).

## Apps

- `apps/web` - public **Astro** website that prerenders to **zero-JS static HTML**, with React **islands** for interactivity, a **build-time content layer** (mock/seed by default, or the API's public content route via `@three-acts/content`), a full storefront (shop, cart, checkout, account) and auth flow backed by `apps/api`, route-level SEO + AEO metadata (JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`), build-time **AVIF** image compression, and a same-origin `/api/*` convention.
- `apps/cms` - private CMS shell with `noindex,nofollow`, disallowing `robots.txt`, an auth client built on `@three-acts/auth` (mock or REST), a pluggable CMS backend (mock or REST) built on the shared `packages/cms-schema` collection registry, and the same same-origin `/api/*` convention.
- `apps/api` - Vercel serverless API app that is the single bridge for every browser write and every auth call: health/metadata routes, CMS/content routes, auth (sign-up/sign-in/session/account), the shop (products, reviews, discount validation, checkout, orders), form submissions, redirects, uploads, and Vercel publish orchestration.
- `packages/cms-schema` - shared collection registry, field types, typed errors, REST wire contract, and column-mapping helpers for the CMS, exported from `@three-acts/cms-schema`. Consumed by `apps/cms` and `apps/api` so both validate against the same schema. See [ADR 0003](docs/adr/0003-pluggable-cms-backend.md).
- `packages/content` - typed read models and a fetch client for editorial collections (articles, authors, categories, FAQs, testimonials, site/page settings, redirects), exported from `@three-acts/content`. Includes a seed-backed fetch implementation so the zero-config web build runs the same client code with no server.
- `packages/ecommerce` - product/order/customer models, pricing (VAT, shipping, discounts), a storage-agnostic cart store, and the shop API contract, exported from `@three-acts/ecommerce`. `src/config.ts`'s `shopConfig` is the fork-time knob for currency, VAT, shipping, and order numbering.
- `packages/auth` - session/user models, a storage-agnostic session store, a sign-up/sign-in/sign-out client, and (via `./server`) session token signing/verification and password hashing, exported from `@three-acts/auth`. Shared by `apps/api` and `apps/cms`.
- `packages/forms` - the contact/newsletter/inquiry form contract, validation, and lead scoring, exported from `@three-acts/forms`.
- `packages/utils` - shared utility helpers such as `cn`, `clsx`, and `cv`, exported from `@three-acts/utils`.

`packages/content`, `packages/ecommerce`, `packages/auth`, and `packages/forms` are the **domain packages**: reusable logic a client fork configures instead of rewrites. See [ADR 0005](docs/adr/0005-domain-packages-and-api-bridge.md).

Base UI is installed per app through `@base-ui-components/react`, and web-specific template components live inside `apps/web`.

## Architecture boundaries

- `apps/web` owns public routes, presentation, SEO, islands, and build-time content reads. It does not write directly to a database.
- `apps/cms` owns private editorial UI. It talks to a `CmsBackend`, using either a browser-local mock or the API's REST bridge.
- `apps/api` owns secrets, privileged operations, provider implementations, CMS writes, public published-content reads, and every storefront/auth/forms write. It is the only app that talks to a Data Store, a Blob Store, an Identity Store, or a payment provider.
- `packages/cms-schema` owns the collection registry and CMS contract shared by the editor, API, and build-time content source.
- `packages/utils` contains provider-neutral utility code shared by the apps. Theme tokens are per app: `apps/web/src/theme.css` and `apps/cms/src/theme.css` are deliberately isolated so the public site and the editorial workspace can diverge.

Supabase is one included server-side Data Store and Blob Store implementation. It is not required by the web app or CMS UI, and it is not the architecture's default identity.

## Template UI

Template components use element-scoped dot notation and subpath exports for tree shaking:

```tsx
import { Section } from "./components/layout/section";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Typography } from "./components/ui/typography";

<Section.Root>
  <Section.Container>
    <Typography.Eyebrow>Marketing site system</Typography.Eyebrow>
    <Card.Marketing title="Launch pages" body="Campaign-ready pages." />
    <Button.Root>Save draft</Button.Root>
    <Button.Link href="/about">About</Button.Link>
  </Section.Container>
</Section.Root>
```

## Commands

```sh
npm install
npm run dev
npm run dev:web
npm run dev:cms
npm run dev:api
npm run build
npm run lint
npm run typecheck
```

The root `build`, `lint`, and `typecheck` commands run their corresponding scripts in every app workspace. Package-specific commands can be run with the named scripts above or npm's `-w` flag.

Set `VITE_SITE_URL` before `npm run build:web` to control canonical URLs and sitemap locations. `CONTENT_SOURCE=api` (the default) sources published content from the public content route via `@three-acts/content`, using `CONTENT_API_ORIGIN` or `API_ORIGIN` to find the deployed API; set `CONTENT_SOURCE=mock` to build from the package's zero-config seed-backed fetch instead. See `apps/web/.env.example`.

## API App

`apps/api` is designed to deploy as its own Vercel project from the `apps/api` root. It is the single bridge every browser write and every auth call goes through — `apps/web` and `apps/cms` never talk to a data store, an identity provider, or a payment provider directly. The included routes are template capabilities, not requirements for every client site:

- `GET /api/health` - health check endpoint.
- `GET /api/meta` - template metadata endpoint.
- `POST /api/deploy` - trigger a Vercel deploy hook (used by the CMS Publish flow).
- `GET /api/deploy-status` - normalized Vercel deployment state for progress feedback.
- `POST /api/auth/sign-up` - creates a shop identity + `customers` record, returns a `scope: "shop"` session.
- `POST /api/auth/sign-in` - `{ email, password, scope? }` (`scope` defaults to `"shop"`) -> a session.
- `POST /api/auth/sign-out` - stateless; the client drops its token.
- `GET /api/auth/session` - the signed-in user for the given bearer token, or `null`.
- `GET`/`PUT /api/auth/account` - the signed-in shopper's `customers` record.
- `GET /api/shop/products` / `GET /api/shop/products/:slug` - live (published, non-discontinued) products.
- `GET`/`POST /api/shop/products/:slug/reviews` - approved reviews; submitting one creates an unapproved, `source: "site"` review.
- `POST /api/shop/discounts/validate` - validates a discount code against a cart.
- `POST /api/shop/checkout` - prices the cart, charges through the configured `PaymentProvider`, creates the order (system write path), and upserts the customer.
- `GET /api/shop/orders` / `GET /api/shop/orders/:orderNumber` - a signed-in shopper's own order history.
- `POST /api/forms/submit` - accepts the public site's contact, newsletter, and inquiry forms (`form`, `email`, optional `name`/`message`/`company`/`phone`/`consent`, optional `website` honeypot); writes a `form-submissions` record through the system write path. Replaces the retired `/api/contact`.
- `GET /api/content/redirects` - every `redirect-rules` record, public and cacheable, for the web build's redirect config.
- `GET /api/uploads/[...path]` - serves files written by the file-backed Blob Store (file backend only; Supabase Storage serves its own URLs).
- `API_ALLOWED_ORIGINS` - optional comma-separated browser origins for direct cross-origin calls.
- `PUBLISH_TOKEN` (API) + `VITE_PUBLISH_TOKEN` (CMS) - shared bearer secret for the Publish flow and as a CMS-auth fallback; the two values must match exactly.
- `VERCEL_API_BASE` - optional override for the Vercel REST API base URL (self-hosted proxies or local testing); defaults to `https://api.vercel.com`.
- Optional server-side Supabase implementations for persistent CMS records and assets; a JSON-file-backed Data Store, Blob Store, and Identity Store for zero-config local development. Provider credentials and payment logic remain in the API app. See `apps/api/.env.example`.

`apps/web` and `apps/cms` call `/api/*` by default. In local development, their Vite dev servers proxy `/api/*` to `API_ORIGIN`. In Vercel, their `vercel.ts` files rewrite `/api/*` to the deployed API app. This keeps browser requests same-origin and avoids per-app CORS configuration for normal traffic.

For local development, copy the relevant examples:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/cms/.env.example apps/cms/.env
```

Set `API_ORIGIN` in the web and CMS projects to the API origin, for example `https://your-api.vercel.app`. The browser-facing API client still calls `/api/*`; the dev server or Vercel rewrite performs the bridge.

If a specific deployment needs to call the API directly from the browser, set `PUBLIC_API_URL` (web) or `VITE_API_URL` (CMS) to the full API base URL and allow the caller with `API_ALLOWED_ORIGINS`. The web app's client bundle only ever sees `PUBLIC_`-prefixed vars, so it does not use `VITE_API_URL`.

## CMS backend

The CMS reads and writes content through a swappable backend (`@three-acts/cms-schema`'s `CmsBackend`), injected via `CmsBackendProvider`. Two implementations ship today, picked by `VITE_CMS_BACKEND`:

- `mock` (default) - an in-browser copy of the shared seed data (see _Seed data_) with a mock `AuthClient`. No env vars, no network calls.
- `rest` - talks to the REST bridge in `apps/api` (`/api/cms/*`) for records and assets, and to `/api/auth/sign-in` (`scope: "cms"`) through an `AuthClient` built on `@three-acts/auth`. `VITE_PUBLISH_TOKEN` still works as a fallback when no session exists.

### Running mock vs rest locally

Mock needs nothing beyond the normal dev command:

```sh
npm run dev:cms
```

Rest needs `apps/api` running too, with matching tokens on both sides. Copy the env files:

```sh
cp apps/cms/.env.example apps/cms/.env
cp apps/api/.env.example apps/api/.env
```

In `apps/cms/.env`, set:

```
VITE_CMS_BACKEND=rest
VITE_PUBLISH_TOKEN=some-shared-secret
```

In `apps/api/.env`, set the matching token:

```
PUBLISH_TOKEN=some-shared-secret
```

`PUBLISH_TOKEN` and `VITE_PUBLISH_TOKEN` must match exactly. Leave `CMS_DATA_BACKEND` and `CMS_STORAGE_BACKEND` unset to use the file-backed store (outside production/Vercel), which persists to `CMS_DATA_DIR` and needs no external project. Set them to `supabase`, with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env`, to use a real Supabase project instead. Then run:

```sh
npm run dev
```

### Publishing is two steps

Clicking Publish in the CMS runs:

1. **Publish transition** - the data store flips every record queued to publish over to published.
2. **Site deploy** - `POST /api/deploy` rebuilds the static site.

The CMS then polls `GET /api/deploy-status`, first with `?after=` and `?since=` to find the new deployment, then by `?id=`, until the rebuild finishes.

### Adding a backend

A new backend means implementing two server-side interfaces in `apps/api/api/_lib/cms/`, one for records and one for asset uploads, and registering them alongside `CMS_DATA_BACKEND` / `CMS_STORAGE_BACKEND`. Nothing in `apps/cms` changes, since it only ever talks to the REST bridge. Plain Postgres (via `pg` or Drizzle) and Cloudflare R2 both fit this shape.

### Database schema from the registry

`packages/cms-schema/src/registry.ts` is the single source of truth for collections, fields, and constraints. The database follows it through the scripts in `apps/api/scripts/` (see `apps/api/schema/README.md`):

- `npm run schema:sql -w @three-acts/api` prints the full, idempotent Postgres schema: `CREATE TABLE IF NOT EXISTS` per collection, `CHECK` constraints for select options and publish status, partial unique indexes for slug (and any `unique: true`) fields, and the `updated_at` trigger.
- `npm run schema:diff -w @three-acts/api` prints the migration SQL between the committed snapshot (`apps/api/schema/snapshot.json`) and the current registry. `npm run schema:migrate -w @three-acts/api -- <name>` writes it to `apps/api/schema/migrations/` and updates the snapshot. Destructive statements are emitted commented out; renames appear as drop + add.
- `npm run schema:json -w @three-acts/api` prints the registry as plain JSON for other tools.

Review generated SQL before applying it with `psql` or the Supabase SQL editor.

See [ADR 0003](docs/adr/0003-pluggable-cms-backend.md) for the backend interfaces and [ADR 0004](docs/adr/0004-registry-driven-schema-and-public-content.md) for the schema tooling and the public content route.

## Seed data

Every app demos the same fictional brand, **Fynbos & Fire**: a Cape Town specialty coffee roaster with an online shop and a brewing journal. The dataset covers every registry collection: articles and authors, products and categories, about 400 orders with matching customers, reviews and discount codes, plus site settings, page settings, redirects, media, and form submissions. It includes a realistic mix of published, draft, queued and unpublished records.

- **Where it lives:** `packages/cms-schema/src/seed/`, exported as `@three-acts/cms-schema/seed`. `content.ts`, `shop.ts` and `site.ts` each own a group of collections. `keys.ts` lists the shared reference keys (author, category and product slugs, static page paths). `index.ts` merges everything into `seedCollections` and exports `cloneSeedCollections()`, which returns a mutable deep copy.
- **CMS mock backend** (`apps/cms/src/cms/mock-adapter.ts`) starts from `cloneSeedCollections()`. Its edits stay in memory and follow the publish model.
- **API memory store** (`apps/api/api/_lib/cms/memory-store.ts`) is seeded the same way, but only outside production. The public content route serves each record's `liveValues` snapshot.
- **Web mock source** (`apps/web/src/content/mock-source.ts`) builds the blog from articles that have `liveValues`. It resolves author names and maps covers onto the local images in `public/content/`, so the default build works offline.

**Adding records:** add them in the file that owns the collection and build them with `seedRecord()`. `seedRecord()` fills in `liveValues` from the status. Records in data and readonly collections use `not_published` with `liveValues: null`. References must use keys from `keys.ts` or real records. `seed.test.ts` checks references across files (redirect targets, order numbers and discount codes in messages, author and product slugs). Each file's own test checks field values against the registry.

**Determinism rule:** seeds must produce identical output on every run. Never use `Math.random()` or `new Date()`. Use `createRandom(seed)` and dates relative to `seedNow` (`daysAgo()`). Keep the seed cheap to build, because the test fails if building it takes 500 ms or more.

## Environment variables

The `.env.example` files are the authoritative per-app setup references. The matrix below explains how the variables fit together; most are optional for the lightweight path.

| Variable | App | Purpose |
| --- | --- | --- |
| `VITE_SITE_URL` | web | Canonical public-site origin used for metadata, sitemap, robots, and social URLs. Required for production unless Vercel can derive it. |
| `API_ORIGIN` | web, cms | Server/build-time API origin used by local proxies and production `/api/*` rewrites. Required in production for app features that call the API. |
| `PUBLIC_API_URL` | web | Optional direct browser API base URL instead of the same-origin rewrite. Requires matching API CORS configuration. |
| `VITE_API_URL` | cms | Optional direct browser API base URL instead of the same-origin rewrite. Requires matching API CORS configuration. |
| `API_ALLOWED_ORIGINS` | api | Optional comma-separated origins allowed to call the API directly from browsers. Normal same-origin rewrite traffic does not need it. |
| `PUBLISH_TOKEN` | api | Bearer secret required by `/api/deploy`, `/api/deploy-status`, and `/api/cms/*`. Unset is dev-only and 503s in production. |
| `VITE_PUBLISH_TOKEN` | cms | Must match `PUBLISH_TOKEN` exactly; sent as `Authorization: Bearer <token>`. |
| `VITE_CMS_BACKEND` | cms | `rest` talks to the API's REST bridge, built on `@three-acts/auth` for sign-in; `mock` is the in-browser Test Collection Set with a mock auth client. |
| `CMS_DATA_BACKEND` | api | `file` \| `memory` \| `supabase`. Defaults to `supabase` when the Supabase env vars below are set; otherwise `file` outside production/Vercel (persists across restarts with zero external services), or `memory` in production/on Vercel (the file store's directory isn't durable there). |
| `CMS_STORAGE_BACKEND` | api | Same options and default rule as `CMS_DATA_BACKEND`, for asset uploads. `file` writes under `CMS_DATA_DIR/uploads/<bucket>/...`, served by `GET /api/uploads/[...path]`. |
| `CMS_DATA_DIR` | api | Directory the `file` data/storage backend reads and writes, resolved relative to `apps/api`. Defaults to `./data` (gitignored except `.gitkeep`). |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | api | Service-role Supabase project used by the `supabase` data store and blob store. |
| `AUTH_SECRET` | api | Signs/verifies session tokens (`@three-acts/auth/server`). Unset falls back to a fixed dev secret outside production; production responds 503 on every auth route until it's set. |
| `AUTH_TOKEN_TTL_SECONDS` | api | Session token lifetime, in seconds. Defaults to `1209600` (14 days). |
| `CMS_AUTH_MODE` | api | `open` (dev default): any non-empty email/password signs an editor in. `env` (production default): must match `CMS_EDITORS`. |
| `CMS_EDITORS` | api | Editor credentials for `CMS_AUTH_MODE=env`, as `email:password,email:password`. |
| `SHOP_OPEN_PASSWORDS` | api | Whether a seeded/site-created `customers` record with no identity yet may sign in with any password on first try (that password becomes its identity). Defaults to `true` outside production, `false` in production. |
| `PAYMENT_PROVIDER` | api | Payment provider checkout charges through. `mock` is the only implementation today (card/Apple Pay/PayPal/gift card settle immediately, EFT comes back "awaiting"); any other value 503s. |
| `CONTENT_SOURCE` | web | `api` (default) reads published content from `GET /api/content/collections/:id/records` at build time via `@three-acts/content`; `mock`/unset uses the package's seed-backed fetch so the build needs no server. |
| `CONTENT_API_ORIGIN` | web | Optional override of `API_ORIGIN` for the build-time content fetch only. |
| `VERCEL_DEPLOY_HOOK_URL` / `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` / `VERCEL_API_BASE` | api | Deploy hook and polling credentials used by the site deploy step. |

## Web rendering model

`apps/web` is an [Astro](https://astro.build) app (`output: "static"`, React via `@astrojs/react`). Pages live in `src/pages/*.astro` and compose React views from `src/views/` and sections/primitives from `src/components/`. Three kinds of pages:

- **Static, no interactivity** → no `client:*` directive, prerendered HTML + CSS, **zero JavaScript**.
- **Static with islands** → the page is static HTML; interactive components get a `client:*` directive and hydrate individually. See _Islands_ below.
- **Client routes** → the page's root React component uses `client:load`, server-renders as a static shell with baked SEO head, then hydrates and fetches live data at runtime (login, account, dashboard, checkout). `/dashboard` is the reference example.

In development, `npm run dev:web` (`astro dev`) renders every request with live data and mirrors production. `npm run build:web` (`astro build`) freezes the same output into static files, then compresses images (`scripts/optimize-images.mjs`).

Per-page SEO + sitemap metadata is centralized in `src/page-meta.ts` and rendered by `src/layouts/BaseLayout.astro`. Only pages with `includeInSitemap: true` are written to `sitemap.xml` (with `lastmod`/`changefreq`/`priority`) by the `src/pages/sitemap.xml.ts` endpoint; `robots.txt` and `llms.txt` are generated the same way. `src/pages/404.astro` emits `404.html`.

### Islands

An island is a self-contained React component with JSON-serializable props that server-renders into the HTML (indexable, works with no JS) and hydrates on its own. Render it in an `.astro` page with a client directive, e.g. `<ContactFormIsland client:visible />`. Only pages containing an island load Astro's tiny hydration runtime + that island's chunk. The home page contact form is the reference example.

### Content layer

Content is read through `@three-acts/content`'s `createContentClient`, resolved once from `CONTENT_SOURCE`:

- `api` (default) - reads every editorial collection (articles, authors, categories, FAQs, testimonials, site/page settings) plus products from the public, published-only content route (`/api/content/collections/:id/records`, no auth), paginating through every record and mapping them with the same field keys `@three-acts/cms-schema` gives the CMS. A failed fetch fails the build rather than shipping stale or empty content.
- `mock` (unset) - the package's `createSeedContentFetch`, serving the same envelope straight from the shared seed in-process, so builds work with **zero credentials** and no server.

`src/pages/blog/[slug].astro` (and the equivalent shop/FAQ/author routes) expand a collection into concrete static routes via `getStaticPaths`, with per-entry SEO from `src/page-meta.ts`. The content client is only used from build-time code, so no data client ships to the browser for static pages. Server-side writes belong in `apps/api`, not here.

### Images

Put owned raster images in `apps/web/public/` and render them with `<Image>` (`src/components/ui/image`). The build emits an `.avif` sibling for every `.png`/`.jpg`/`.jpeg`/`.webp`, and `<Image>` renders a zero-JS `<picture>` that prefers AVIF with the original as fallback. External/CDN URLs pass through as a plain `<img>`.

## Public site routes

Static, prerendered from content (no `client:*`, zero JS unless a page embeds an island):

- `/` - home: hero, featured products, shop categories, featured articles, testimonials, FAQ teaser, newsletter, visit-the-roastery block.
- `/shop`, `/shop/category/[slug]`, `/shop/[slug]` - gallery, price, availability, add-to-cart island, description, spec sheet, video, approved reviews + review-form island, product FAQs, related products, Product JSON-LD.
- `/blog`, `/blog/[slug]`, `/blog/category/[slug]`, `/authors/[slug]` - the brewing journal, byline with author avatar, category, tags, related articles.
- `/faq` (grouped by topic, FAQPage JSON-LD), `/about`, `/contact` (contact form island), `/wholesale` (inquiry form island), `/visit-the-roastery`, `/shipping`, `/returns`, `/terms`, `/privacy`, `/careers`, `/subscriptions`.
- `/404`, `sitemap.xml`, `robots.txt`, `llms.txt`.

Client routes (static shell + a `client:load` island, `noindex`):

- `/cart` - lines, quantity, remove, discount code, totals, proceed.
- `/checkout` - contact + shipping + payment method, order summary, place order.
- `/checkout/complete` - order confirmation.
- `/sign-in`, `/sign-up`, `/account` - profile edit, order history with status/tracking, sign out. Unauthenticated `/account` redirects to `/sign-in`.

### Shopper flow

Browsing is fully static and indexable; the Cart, Checkout, sign-in/up, and account pages are the only client routes. The Cart persists in `localStorage` via `@three-acts/ecommerce`'s storage-agnostic cart store, so it survives navigation between static pages and across tabs. Checkout works signed-out (guest) or signed-in — `POST /api/shop/checkout` prices the cart server-side, charges through the configured `PaymentProvider` (`PAYMENT_PROVIDER=mock` locally), creates the order through the system write path, decrements inventory, and upserts the customer. A shopper can sign up before or after their first order (an existing `customers` record with no identity yet links up on sign-up instead of duplicating), and `/account` shows their order history from `GET /api/shop/orders`. Every network call goes through `apps/web/src/lib/api-client.ts`, which attaches the session token from `@three-acts/auth`'s session store.

## Publishing (CMS → Vercel)

Editors change data, then click **Publish** in the CMS top bar. That calls `POST /api/deploy` (which triggers a Vercel Deploy Hook to rebuild the static site) and polls `GET /api/deploy-status` for live state, surfacing progress in a bottom-right toast: **queued → building → deployed ✓** (or failed). Configure `VERCEL_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, and `VERCEL_PROJECT_ID` in `apps/api`; when unset, the flow degrades gracefully with a clear message.

## Forking for a client

Three Acts is a template, not a finished client site — a fork replaces content and configuration, never the plumbing underneath. In order:

1. **`packages/cms-schema/src/registry.ts`** - add, remove, or retype collections/fields for the client's actual content and product model.
2. **`packages/cms-schema/src/seed/`** - replace the example data (or trim it to nothing) so local dev and tests aren't shipping "Fynbos & Fire" as reference content.
3. **`npm run schema:migrate -w @three-acts/api -- <name>`** - generate and review the migration for the registry changes, then apply it and commit the updated `schema/snapshot.json`.
4. **`packages/ecommerce/src/config.ts`** (`shopConfig`) - currency, VAT rate, shipping rates/thresholds, the order number prefix, and the low-stock threshold. Skip this file entirely if the client site has no shop.
5. **`apps/web/src/site.ts`** and **`apps/web/src/theme.css`** - brand name, nav structure, contact details, social links, and design tokens (colors, type, radius, shadow).
6. **Page copy** - `apps/web/src/pages/*` and their section components; swap in the client's real copy, imagery, and legal pages.
7. **Env** - copy each app's `.env.example` to `.env` and set the client's own `AUTH_SECRET`, `CMS_EDITORS`, provider credentials, and site URL. Never reuse a template's dev secrets past local development.
8. **Delete unused collections/routes** - if the client has no shop, drop the shop-related registry collections and `apps/api/api/shop/*` routes (and the corresponding web pages); the same goes for any capability the project doesn't need. Keep only what the project uses.

## Documentation map

- [`CONTEXT.md`](CONTEXT.md) - current architecture, boundaries, domain language, and adaptation rules for developers and coding agents.
- [`docs/adr/`](docs/adr/) - decisions and their history. Superseded ADRs remain as historical records and are labeled accordingly.
- [`docs/superpowers/specs/`](docs/superpowers/specs/) - dated design snapshots; read their status notes before treating them as current guidance.
- [`apps/api/schema/README.md`](apps/api/schema/README.md) - registry-driven Postgres schema and migration workflow.
