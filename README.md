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

- `apps/web` - public **Astro** website that prerenders to **zero-JS static HTML**, with React **islands** for interactivity, a **build-time content layer** (mock by default, or the API's public published-content route), route-level SEO + AEO metadata (JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`), build-time **AVIF** image compression, and a same-origin `/api/*` convention.
- `apps/cms` - private CMS shell with `noindex,nofollow`, disallowing `robots.txt`, a provider-shaped auth interface ready for Clerk, Auth0, or Supabase, a pluggable CMS backend (mock or REST) built on the shared `packages/cms-schema` collection registry, and the same same-origin `/api/*` convention.
- `apps/api` - Vercel serverless API app for optional server-only functionality. It currently provides health and metadata routes, contact submissions, CMS/content routes, and Vercel publish orchestration; it is also the home for project-specific payments, webhooks, and integration bridges.
- `packages/cms-schema` - shared collection registry, field types, typed errors, REST wire contract, and column-mapping helpers for the CMS, exported from `@three-acts/cms-schema`. Consumed by `apps/cms` and `apps/api` so both validate against the same schema. See [ADR 0003](docs/adr/0003-pluggable-cms-backend.md).
- `packages/utils` - shared utility helpers such as `cn`, `clsx`, and `cv`, exported from `@three-acts/utils`.
- `packages/config` - shared theme tokens consumed by Tailwind.

Base UI is installed per app through `@base-ui-components/react`, and web-specific template components live inside `apps/web`.

## Architecture boundaries

- `apps/web` owns public routes, presentation, SEO, islands, and build-time content reads. It does not write directly to a database.
- `apps/cms` owns private editorial UI. It talks to a `CmsBackend`, using either a browser-local mock or the API's REST bridge.
- `apps/api` owns secrets, privileged operations, provider implementations, CMS writes, and public published-content reads.
- `packages/cms-schema` owns the collection registry and CMS contract shared by the editor, API, and build-time content source.
- `packages/config` and `packages/utils` contain provider-neutral styling and utility code shared by the apps.

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

Set `VITE_SITE_URL` before `npm run build:web` to control canonical URLs and sitemap locations. Set `CONTENT_SOURCE=api` with `CONTENT_API_ORIGIN` or `API_ORIGIN` pointing at the deployed API to source published content from the public content route instead of the built-in mock. See `apps/web/.env.example`.

## API App

`apps/api` is designed to deploy as its own Vercel project from the `apps/api` root. The included routes are template capabilities, not requirements for every client site:

- `GET /api/health` - health check endpoint.
- `GET /api/meta` - template metadata endpoint.
- `POST /api/deploy` - trigger a Vercel deploy hook (used by the CMS Publish flow).
- `GET /api/deploy-status` - normalized Vercel deployment state for progress feedback.
- `POST /api/contact` - accepts the public site's contact form (`name`, `email`, `message`, optional `website` honeypot).
- `API_ALLOWED_ORIGINS` - optional comma-separated browser origins for direct cross-origin calls.
- `PUBLISH_TOKEN` (API) + `VITE_PUBLISH_TOKEN` (CMS) - shared bearer secret for the Publish flow; the two values must match exactly.
- `VERCEL_API_BASE` - optional override for the Vercel REST API base URL (self-hosted proxies or local testing); defaults to `https://api.vercel.com`.
- Optional server-side Supabase implementations for persistent CMS records, assets, and contact submissions. Provider credentials remain in the API app. See `apps/api/.env.example`.

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

- `mock` (default) - an in-browser Test Collection Set. No env vars, no network calls.
- `rest` - talks to the REST bridge in `apps/api` (`/api/cms/*`), which reads and writes through a server-side data store and blob store.

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

`PUBLISH_TOKEN` and `VITE_PUBLISH_TOKEN` must match exactly. Leave `CMS_DATA_BACKEND` and `CMS_STORAGE_BACKEND` unset to use the in-process Memory store, which needs no external project. Set them to `supabase`, with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env`, to use a real Supabase project instead. Then run:

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
| `VITE_CMS_BACKEND` | cms | `mock` (default) or `rest`. Picks the CMS backend implementation. |
| `CMS_DATA_BACKEND` | api | `supabase` or `memory`. Defaults to `supabase` when the Supabase env vars below are set, otherwise `memory`. |
| `CMS_STORAGE_BACKEND` | api | `supabase` or `memory`, same default rule as `CMS_DATA_BACKEND`. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | api | Service-role Supabase project used by the `supabase` data store and blob store. |
| `CONTENT_SOURCE` | web | `mock` (default) or `api`. `api` reads published records from `GET /api/content/collections/:id/records` at build time. |
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

Content is read through a source in `src/content/`:

- `mock-source.ts` is the default, so builds work with **zero credentials**.
- `api-source.ts` activates with `CONTENT_SOURCE=api`. It fetches the `posts` collection from the API's public, published-only route (`/api/content/collections/posts/records`, no auth) and maps records using the field keys from `@three-acts/cms-schema`, so the site and the CMS share one collection definition. A failed fetch fails the build rather than shipping an empty blog.

`src/pages/blog/[slug].astro` expands the collection into concrete static routes via `getStaticPaths`, with per-entry SEO from `blogPostMeta` in `src/page-meta.ts`. The content source is only imported from build-time code, so no data client ships to the browser. Server-side writes belong in `apps/api`, not here.

### Images

Put owned raster images in `apps/web/public/` and render them with `<Image>` (`src/components/ui/image`). The build emits an `.avif` sibling for every `.png`/`.jpg`/`.jpeg`/`.webp`, and `<Image>` renders a zero-JS `<picture>` that prefers AVIF with the original as fallback. External/CDN URLs pass through as a plain `<img>`.

## Publishing (CMS → Vercel)

Editors change data, then click **Publish** in the CMS top bar. That calls `POST /api/deploy` (which triggers a Vercel Deploy Hook to rebuild the static site) and polls `GET /api/deploy-status` for live state, surfacing progress in a bottom-right toast: **queued → building → deployed ✓** (or failed). Configure `VERCEL_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, and `VERCEL_PROJECT_ID` in `apps/api`; when unset, the flow degrades gracefully with a clear message.

## Documentation map

- [`CONTEXT.md`](CONTEXT.md) - current architecture, boundaries, domain language, and adaptation rules for developers and coding agents.
- [`docs/adr/`](docs/adr/) - decisions and their history. Superseded ADRs remain as historical records and are labeled accordingly.
- [`docs/superpowers/specs/`](docs/superpowers/specs/) - dated design snapshots; read their status notes before treating them as current guidance.
- [`apps/api/schema/README.md`](apps/api/schema/README.md) - registry-driven Postgres schema and migration workflow.
