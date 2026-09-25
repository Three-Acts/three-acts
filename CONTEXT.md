# Three Acts project context

Three Acts is a reusable client-website foundation, not a single finished site. The core is a static Astro public app. A project can add the private CMS, Vercel API, persistent data, asset storage, authentication, payments, webhooks, and integrations only when its requirements justify them.

## Current architecture

- **Public Web App** (`apps/web`): Astro with static output and React islands. It owns public routes, presentation, SEO/AEO, image optimization, and build-time content reads. Client routes (cart, checkout, sign-in/up, account) render a static shell and hydrate to call the API at runtime.
- **Editorial App** (`apps/cms`): a private, desktop-first React/Vite workspace. It owns editing UX but no provider credentials or server-side storage implementations.
- **API App** (`apps/api`): Vercel functions and a matching local development server. It owns privileged operations, secrets, CMS/data routes, public published-content routes, deploy orchestration, and the storefront/auth bridge: sign-up, sign-in, session, account, checkout, orders, product reviews, discount validation, and form submissions. Every browser write and every auth call goes through it — the Public Web App and the Editorial App never hold provider credentials, a payment provider, or an identity store directly. Local development persists through a File Data Store (one JSON file per collection, gitignored) and a separate Identity Store (login credentials, never a CMS Collection); Supabase remains an included persistent alternative for both.
- **Collection Schema Package** (`packages/cms-schema`): the provider-neutral collection registry, field model, errors, REST contract, and column mapping shared by the CMS and API. The web app also consumes its field keys when mapping API content.
- **Content Package** (`packages/content`): typed read models and a fetch client for editorial collections (articles, authors, categories, FAQs, testimonials, site/page settings, redirects), consumed through the Public Content Route. Ships a seed-backed fetch implementation so a zero-config build runs the same client code with no server.
- **Ecommerce Package** (`packages/ecommerce`): product, order, and customer models, pricing (VAT, shipping, discounts), a storage-agnostic Cart store, and the shop API contract. `src/config.ts`'s `shopConfig` is the one file a client fork edits to retarget currency, VAT, shipping, and order numbering.
- **Auth Package** (`packages/auth`): session and user models, a storage-agnostic session store, a client for sign-up/sign-in/sign-out, and server-only session token signing/verification and password hashing, shared by the API and the CMS.
- **Forms Package** (`packages/forms`): the contact/newsletter/inquiry Form Submission contract, validation, lead scoring, and a submission hook.
- **Shared Package** (`packages/utils`): provider-neutral utilities used across apps. Theme tokens are not shared: each app owns its own `src/theme.css` (the paper-and-ink public site in `apps/web`, the dark editorial workspace in `apps/cms`).

Content, Ecommerce, Auth, and Forms are **Domain Packages**: reusable, framework-agnostic logic that a client fork configures rather than rewrites. See [ADR 0005](docs/adr/0005-domain-packages-and-api-bridge.md).

## Supported project shapes

**Lightweight website:** run `apps/web` with mock or file-backed content. Static pages need no CMS, API, database, auth, or third-party provider. Add Astro islands only where interaction is required.

**Application-backed website:** run `apps/web`, `apps/cms`, and `apps/api`. The CMS reaches provider-neutral Data Store and Blob Store interfaces through the REST Bridge; the public site reads published content at build time and reaches the storefront/auth bridge in `apps/api` at runtime for Cart, Checkout, sign-up/sign-in, account, and Form Submissions. Payments, webhooks, and other integrations belong behind the API boundary.

The paths are incremental: begin lightweight and add application capabilities without moving public rendering or provider credentials into the browser.

## Architectural rules

- Keep `apps/web` static-first. Do not hydrate a whole page when a small island is sufficient.
- Keep secrets and provider SDKs that require privileged credentials in `apps/api`.
- Every browser write and every auth call goes through `apps/api`. Neither `apps/web` nor `apps/cms` talks to a Data Store, a Blob Store, an Identity Store, or a payment provider directly.
- Treat Supabase as an included Data Store/Blob Store implementation, not as the definition of the CMS or the only supported provider.
- Change CMS fields in the Collection Registry first, then generate and review schema changes. Do not derive the editor from live database introspection.
- Keep browser API calls same-origin through `/api/*` by default. Direct cross-origin URLs are an explicit deployment choice.
- The mock web content, mock CMS backend, and Memory stores are zero-configuration development paths. They are not production persistence.
- Site-generated collections (`orders`, `customers`, `form-submissions`) are never created in the CMS. Editors view, edit the fields that are theirs, and delete; only the site's System Write Path creates one.
- A client project should replace example content and configure only the collections and capabilities it needs. Fork-time knobs live in the Collection Registry, the seed, `packages/ecommerce/src/config.ts` (`shopConfig`), `apps/web/src/site.ts`, and each app's theme — not scattered across route handlers.

## Repository terminology

**Public Web App**:
The static Astro site in `apps/web`. It may include isolated React islands and application-like client routes, but static HTML remains the default output.

**Editorial App**:
The private CMS workspace in `apps/cms`.

**API App**:
The server-side boundary in `apps/api`. It hosts Vercel functions in production and an equivalent local server for development.

**Lightweight Path**:
The Public Web App using its zero-configuration content source without the CMS, API, or a persistent provider.

**Application-Backed Path**:
The Public Web App plus whichever server-side capabilities a client needs, typically the Editorial App, API App, and persistent stores.

## CMS language

The private editorial context manages website content and related assets through pluggable Data Store and Blob Store implementations.

## Language

**CMS Collection**:
An editable content set backed by exactly one table in a Data Store.
_Avoid_: Hardcoded section, static tab

**Collection Registry**:
The allowlist of backing tables that are exposed as editable CMS Collections.
_Avoid_: Auto-discovery, table browser

**Collection Field**:
An editable property of a CMS Collection record as defined by the collection config.
_Avoid_: Raw column, inferred field

**Asset Field**:
A Collection Field that uploads a file to the Blob Store and stores the file reference on the record.
_Avoid_: Asset library, media collection

**Image Field**:
A Collection Field for a single image. It uploads through the Blob Store like an Asset Field, but the record stores a typed `ImageValue` JSON string (`src`, `fileName`, `size`, `width`, `height`, `alt`) instead of a bare URL. Legacy plain-URL rows still read.
_Avoid_: Bare image URL, asset field for photos

**Image Gallery Field**:
A Collection Field for an ordered set of images, stored as an `ImageValue[]` JSON string with optional `minItems`/`maxItems` publish-time rules.
_Avoid_: Comma-separated URLs, asset library

**Video Field**:
A Collection Field for a single uploaded video. It uploads through the Blob Store like an Asset Field, but the record stores a typed `VideoValue` JSON string (`src`, `fileName`, `size`, `contentType`) instead of a bare URL. Uploads only — no external video URL. Legacy plain-URL rows still read.
_Avoid_: External video URL, bare video URL

**File Field**:
A Collection Field for a single uploaded file. It uploads through the Blob Store like an Asset Field, but the record stores a typed `FileValue` JSON string (`src`, `fileName`, `size`, `contentType`) instead of a bare URL. Legacy plain-URL rows still read.
_Avoid_: Bare file URL, asset library

**Record Source**:
Whether a CMS Collection's records are created by editors (`"editors"`, the default) or by the Public Web App's own flows (`"site"`) — Checkout, sign-up, and Form Submissions. `readonly`-mode collections are always `"site"`. A record whose collection has Record Source `"site"` cannot be created or imported from the Editorial Workspace, only viewed, edited on the fields that are theirs, and deleted.
_Avoid_: Permission level, role

**Read-only Field**:
A Collection Field an editor can see but never edit — rendered as a value with a lock hint, never an input. The API keeps its stored value on every editor save; only the System Write Path sets it. Used for money, identity, and audit fields (an order's total, a customer's email) editors must not be able to falsify.
_Avoid_: Disabled input, computed field

**System Write Path**:
The privileged write functions (`createSystemRecord`, `updateSystemRecord`) the API uses on behalf of the Public Web App's own flows — Checkout, sign-up, Form Submissions — to create or update a record regardless of Record Source or Read-only Field gating. Editors never reach it; it is not exposed through the REST Bridge editors use.
_Avoid_: Admin override, backdoor

**CMS Data Adapter**:
The interface the CMS uses to list, read, create, save, delete, and import collection records, and to run the Publish Transition. Asset uploads go through the CMS Backend's storage side instead.
_Avoid_: REST client, direct database access, mock data

**CMS Backend**:
The composition of a CMS Data Adapter, a storage adapter, and an auth client that the CMS uses at runtime, injected through `CmsBackendProvider`. `VITE_CMS_BACKEND` picks `mock` (an in-browser Test Collection Set) or `rest` (talks to the REST Bridge).
_Avoid_: Supabase integration, data layer

**Data Store**:
A server-side implementation of the data store interface behind the REST Bridge, selected by `CMS_DATA_BACKEND`. Supabase, the File Data Store, and an in-process Memory store ship today; adding plain Postgres means implementing the interface and registering it.
_Avoid_: The database, Supabase as the only option

**Blob Store**:
A server-side implementation of the blob store interface behind the REST Bridge for asset uploads, selected by `CMS_STORAGE_BACKEND`. Supabase Storage, a file-backed store, and an in-process Memory store ship today.
_Avoid_: Supabase Storage as the only option, file system

**File Data Store**:
The zero-configuration Data Store implementation for local development: one JSON file per CMS Collection under `CMS_DATA_DIR`, seeded from the shared dataset on first access and rewritten atomically on every mutation so records persist across restarts with no external service. Never selected in production or on Vercel, where its directory isn't durable.
_Avoid_: Production persistence, a database

**Identity Store**:
The server-side store of shop and editor login credentials (email, password hash, and — for a shopper — the linked `customers` record id) behind `apps/api`'s auth routes. It is deliberately not a CMS Collection: a password hash must never be reachable through the CMS, no matter how the customer record it authenticates is edited or exported.
_Avoid_: Customers collection, user table

**REST Bridge**:
The `apps/api` HTTP layer (`/api/cms/*`) that lets the `rest` CMS Backend reach a Data Store and Blob Store over HTTP, validated against the Collection Schema Package. Every route requires `Authorization: Bearer <PUBLISH_TOKEN>`.
_Avoid_: Generic API gateway, database proxy

**Collection Schema Package**:
The shared `@three-acts/cms-schema` package: the Collection Registry, field types, typed errors, the REST wire contract, and column-mapping helpers. Consumed by the CMS and the REST Bridge so both validate against the same fields.
_Avoid_: Duplicated types, app-local schema

**Schema Snapshot**:
The committed JSON capture of the Collection Registry's table shape (`apps/api/schema/snapshot.json`) that the schema tooling diffs against to produce migration SQL. Updated only by `schema:migrate`.
_Avoid_: Live database introspection, ORM migration state

**Public Content Route**:
The unauthenticated `/api/content/*` read path of the REST Bridge: `GET /api/content/collections/:id/records` serves only `published` records of `editorial` CMS Collections, and `GET /api/content/redirects` serves every `redirect-rules` record (a `data`-mode collection with no publish workflow to gate on). Used by the static site build, through the Content Package's client.
_Avoid_: Direct database reads from the site, anon-key client, CMS route

**Collection Mode**:
How editors work with a CMS Collection's records: `editorial` (publish workflow), `data` (editable, no publish workflow — including site-sourced collections like `orders` and `customers`), or `readonly` (system-generated records like Form Submissions — view, export, delete only, always Record Source `"site"`).
_Avoid_: Per-record permissions, role-based access

**Publish Status**:
The editor-facing state that indicates whether a record is published, unpublished, or queued to publish. Only records in `editorial` mode collections carry one.
_Avoid_: Version history, release workflow

**Publish Transition**:
The first publish step: the Data Store flips every record queued to publish over to published. It does not rebuild the public site.
_Avoid_: The full publish flow, deploy

**Site Deploy**:
The second publish step: rebuilding the static site from the current published records, then confirming the new deployment finished.
_Avoid_: Publish, save

**Editorial Workspace**:
The desktop-first CMS interface where editors browse collections, scan records, and edit a selected record.
_Avoid_: Mobile app, landing page, Figma canvas

**Record Editor Pane**:
The main split-pane editor shown beside the collection record list for the selected CMS Collection record.
_Avoid_: Modal editor, drawer editor

**Title Field**:
The configured Collection Field used as the primary label for a CMS Collection record.
_Avoid_: Inferred name, display guess

**Test Collection Set**:
A mock group of CMS Collections designed to exercise every supported editor field and workflow.
_Avoid_: Production content, screenshot copy

**Session**:
The signed token plus user returned by `apps/api`'s auth routes after sign-in, scoped to either the Storefront (`"shop"`) or the Editorial Workspace (`"cms"`) — never both. The client stores it and sends it back as a bearer token; `apps/api` verifies it on every request that needs one.
_Avoid_: Cookie-based auth, a CMS Collection

**Storefront**:
The shopping experience the Public Web App renders: product browsing, the Cart, Checkout, order history, and account management, backed by the Ecommerce Package and `apps/api`'s shop routes.
_Avoid_: The CMS, a separate app

**Cart**:
The shopper's in-progress selection of products and quantities, held client-side by the Ecommerce Package's storage-agnostic cart store (persisted to `localStorage` in the browser) so it survives navigation between static pages until Checkout.
_Avoid_: A CMS Collection, server-side session state

**Checkout**:
The Public Web App flow that turns a Cart into an order: `apps/api`'s checkout route prices the cart, charges through the configured payment provider, and creates the order and customer through the System Write Path.
_Avoid_: A CMS action, a Data Store write from the browser

**Form Submission**:
A record created by one of the site's public forms — `contact`, `newsletter`, or `inquiry` — through the forms route and the System Write Path. Held in the `readonly`-mode `form-submissions` CMS Collection: editors view, export, and delete but never create one.
_Avoid_: A CMS-created lead, an editorial collection

**Domain Package**:
A reusable, framework-agnostic package (the Content, Ecommerce, Auth, and Forms Packages) that owns models, client logic, and the wire contract for one part of the site, shared by the Public Web App, the Editorial App, and the API App so a client fork changes configuration, not plumbing.
_Avoid_: App-local types, duplicated fetch logic

## Relationships

- A **CMS Collection** is backed by exactly one table in a **Data Store**.
- The **Collection Registry** defines which backing tables appear as **CMS Collections**.
- A **CMS Collection** has one or more **Collection Fields**.
- An **Asset Field** belongs to exactly one **CMS Collection** field configuration.
- An **Image Field** and an **Image Gallery Field** are typed variants of an **Asset Field**: same Blob Store upload, but the record stores `ImageValue` JSON so filename, dimensions, and alt text survive.
- A **Video Field** and a **File Field** are typed variants of an **Asset Field**: same Blob Store upload, but the record stores `VideoValue`/`FileValue` JSON so filename, size, and content type survive. Uploads only — no external URL input.
- The **CMS Backend**'s data adapter provides records, and its storage adapter provides asset uploads through the **Blob Store**, for each **CMS Collection**.
- The **REST Bridge** exposes a **Data Store** and a **Blob Store** to the `rest` **CMS Backend** over HTTP, validated against the **Collection Schema Package**.
- The **Collection Schema Package** defines the **Collection Registry** and field types once, shared by the CMS and the **REST Bridge**.
- A **CMS Collection** has one **Collection Mode** (`editorial` by default).
- A CMS Collection record has one **Publish Status** only when its collection's **Collection Mode** is `editorial`.
- Publishing runs a **Publish Transition** first, then a **Site Deploy**.
- A **Site Deploy** reads content through the **Public Content Route**, never from a **Data Store** directly.
- The **Collection Registry** produces the database schema and migrations by diffing against the **Schema Snapshot**; the database never defines a **Collection Field**.
- The **Editorial Workspace** is optimized for desktop editorial work.
- The **Editorial Workspace** shows the selected record in a **Record Editor Pane**.
- A **CMS Collection** may define one **Title Field**.
- The **Test Collection Set** provides mock CMS Collections through the mock **CMS Backend**.
- A **CMS Collection** has one **Record Source** (`"editors"` by default; `readonly`-mode collections are always `"site"`).
- A **Collection Field** may be a **Read-only Field**; only the **System Write Path** ever sets its value.
- The **System Write Path** creates and updates records in **Record Source** `"site"` collections — **Checkout**, sign-up, and a **Form Submission** all use it, never the editor-facing **CMS Data Adapter**.
- A **Checkout** turns a **Cart** into an order record and a customer record, both **Record Source** `"site"`.
- A **Form Submission** is created through the **System Write Path** into the `readonly`-mode `form-submissions` **CMS Collection**.
- A **Session** authenticates either the **Storefront** or the **Editorial Workspace**, never both at once.
- The **File Data Store** and the **Identity Store** are separate stores: shop and editor credentials never become a **CMS Collection**.
- A **Domain Package** may be consumed by the **Public Web App**, the **Editorial App**, and the **API App**, but a **Domain Package** never imports from any of them.

## Example dialogue

> **Dev:** "When an editor opens a **CMS Collection**, should the fields come from app code or from the **Data Store**?"
> **Domain expert:** "From configuration. Each **CMS Collection** maps to a table in the **Data Store**, but the fields shown in the editor are configured, not inspected."
> **Dev:** "Can every table become a **CMS Collection** automatically?"
> **Domain expert:** "No — a table must be listed in the **Collection Registry** first."
> **Dev:** "Should the CMS infer every **Collection Field** from the database?"
> **Domain expert:** "No — **Collection Fields** are configured so the editor shows the right controls."
> **Dev:** "Is uploaded media managed as its own collection?"
> **Domain expert:** "No — uploads are edited through an **Asset Field** on the record that needs the file."
> **Dev:** "Do we need a live backend before building the CMS?"
> **Domain expert:** "No, build against the **CMS Data Adapter** first. `VITE_CMS_BACKEND=mock` runs the whole editor with no backend at all, and switching to `rest` later doesn't change the editor code."
> **Dev:** "How does the public site get its content?"
> **Domain expert:** "Through the **Public Content Route**. It only ever sees published records of editorial collections, and it uses the same field keys from the **Collection Schema Package** the editor uses."
> **Dev:** "I added a field to a collection. Do I edit the database by hand?"
> **Domain expert:** "No. Run the schema diff. It compares the **Collection Registry** to the **Schema Snapshot** and gives you the ALTER statements to review."
> **Dev:** "Can I use plain Postgres?"
> **Domain expert:** "Yes. Implement the **Data Store** interface for Postgres and register it in the **REST Bridge**. Nothing in the CMS or the **Collection Schema Package** changes."
> **Dev:** "Where do uploads go if I use Cloudflare?"
> **Domain expert:** "Wherever the **Blob Store** implementation puts them. Implement the interface for R2 and register it the same way. The **Asset Field** doesn't change."
> **Dev:** "Does **Publish Status** mean we need a complete draft/version release system?"
> **Domain expert:** "No — it is a lightweight status shown in the editor contract for now."
> **Dev:** "If an editor clicks Publish, is the site live right away?"
> **Domain expert:** "Not yet. Publish runs a **Publish Transition** in the **Data Store** first, then a **Site Deploy** rebuilds the static site. The CMS shows both steps as one flow."
> **Dev:** "Should the CMS behave like a mobile-first app?"
> **Domain expert:** "No — the **Editorial Workspace** follows Webflow-style desktop editorial density, with mobile as a fallback."
> **Dev:** "Should selecting a record open a modal?"
> **Domain expert:** "No — records open in a **Record Editor Pane** like the Webflow CMS reference."
> **Dev:** "How does the CMS label a record in the list?"
> **Domain expert:** "Use the configured **Title Field** first, then fall back only when the config omits one."
> **Dev:** "Should the mock data copy the screenshot content?"
> **Domain expert:** "No — use a **Test Collection Set** that exercises every editor capability."
> **Dev:** "Can an editor create an order?"
> **Domain expert:** "No — `orders` has **Record Source** `"site"`. Editors can view it, change status, tracking, and notes, and delete it, but New and Import are hidden; only **Checkout**'s **System Write Path** creates one."
> **Dev:** "Where does sign-in go?"
> **Domain expert:** "Through the **API App**. The browser never talks to an identity provider directly — it posts credentials to an auth route, the API checks the **Identity Store** (or the configured editor list), and hands back a **Session**."
> **Dev:** "How do I swap to Neon?"
> **Domain expert:** "Implement the **Data Store** interface for Postgres and register it in the **REST Bridge**, then point `CMS_DATA_BACKEND` at it. The **File Data Store** and Supabase are both just implementations of that same interface — nothing in the CMS or the **Collection Schema Package** changes."
> **Dev:** "What does a client fork change?"
> **Domain expert:** "The **Collection Registry**, the seed, `shopConfig` in the Ecommerce Package, and `apps/web/src/site.ts` plus its theme — configuration and content, never the **Domain Packages** or the API routes underneath them."
> **Dev:** "Why isn't the shopper's password on the `customers` record?"
> **Domain expert:** "Credentials live in the **Identity Store**, not a **CMS Collection** — an editor browsing customer records should never be able to see or export a password hash."
> **Dev:** "If I add a field to `orders`, does the site's checkout code need to know about it?"
> **Domain expert:** "Only if **Checkout** is the thing writing it. Mark it a **Read-only Field** if it's money, identity, or audit data an editor must not be able to falsify — the editor still sees the value, just never an input, and only the **System Write Path** sets it."

## Flagged ambiguities

- "collection" was used to mean both a UI section and a data source. Resolved: a **CMS Collection** is an editable table backed by a **Data Store**.
- "generic" could mean exposing every backing table. Resolved: generic editing is constrained by the **Collection Registry**.
- "generic backend" could mean rewriting the CMS for every provider. Resolved: a generic backend means swapping the **Data Store** and/or **Blob Store** implementation behind the same server-side interface; the CMS and **REST Bridge** never change.
- "field" could mean any database column — resolved: a **Collection Field** is an editor-facing field defined in collection config.
- "asset" could mean a standalone library — resolved: an **Asset Field** is a field-level upload/reference control.
- "mock data" means a temporary **CMS Backend** implementation (`VITE_CMS_BACKEND=mock`), not a different UI or data contract.
- "publish" could mean just flipping a status or shipping the change live. Resolved: publish means a **Publish Transition** (queued to published, in the **Data Store**) followed by a **Site Deploy** (rebuilding the static site); the CMS runs both when an editor clicks Publish.
- "publish workflow" means lightweight **Publish Status**, not full version history or scheduled release management.
- "Figma-like" was used for the visual target — resolved: the intended reference is Webflow CMS, and the **Editorial Workspace** should be compact and desktop-first.
- "same as screenshot" means a split-pane **Record Editor Pane**, not a modal or drawer.
- "record title" is resolved by the **Title Field**, with fallback only for incomplete collection config.
- "mock collections" should form a **Test Collection Set**, not pretend to be final production content.
- "source" on a form submission was ambiguous between the lead's origin and which form was submitted. Resolved: the field is named **form** (`contact`/`newsletter`/`inquiry`) — the collection records which form was used, not a marketing-attribution source.
- "insights" has come up as a name for a reporting collection. Resolved: there is no `insights` **CMS Collection** in the **Collection Registry**. Aggregate numbers (a customer's lifetime value, an order's totals) are **Read-only Fields** on `orders`/`customers`, not a standalone collection — analytics stays outside the registry.
</content>
