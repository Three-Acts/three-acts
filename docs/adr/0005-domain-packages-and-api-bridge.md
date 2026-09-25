# ADR 0005: Domain packages and the API as the auth/checkout/forms bridge

- Status: Accepted
- Date: 2026-09-25

## Context

The registry and seed already modeled a realistic client brand ("Fynbos & Fire", a Cape Town coffee roaster) end to end: articles, authors, categories, FAQs, testimonials, products, product categories, reviews, orders, customers, discount codes, form submissions, site/page settings, and redirects. Three gaps kept that data from being a real, working site:

- The public site only rendered a blog. Nothing read products, orders, testimonials, FAQs, or redirects, and there was no shopper flow — no cart, checkout, account, or order history.
- The CMS let editors "create" and "import" `orders` and `customers` like any other collection. Nothing stopped an editor from fabricating an order that was never placed or a customer who never signed up, because the collection contract had no concept of who is allowed to originate a record.
- Auth never touched `apps/api`. The CMS used a local mock auth client that accepted any email and password, and the public site had no sign-in at all. There was no session model, no password storage, and no seam for a real identity provider.

Reusable logic for these areas — pricing, cart persistence, form validation, session tokens — had nowhere to live. Without a shared home, each app would have reimplemented it, or the API's route handlers would have absorbed business logic that other consumers (a future mobile client, a second storefront) would need too.

## Decision

**Four domain packages**, alongside the existing `packages/cms-schema` and `packages/utils`, own this logic so it is shared instead of duplicated:

- `packages/content` — typed read models (`Article`, `Author`, `ArticleCategory`, `Faq`, `Testimonial`, `SiteSettings`, `PageSettings`, `RedirectRule`) and a fetch client (`createContentClient`) that reads the Public Content Route, paginating through every record. `createSeedContentFetch` serves the same envelope straight from the shared seed, in-process, so the zero-config web build runs the exact client code with no server.
- `packages/ecommerce` — `Product`/`Order`/`Customer`/`Cart` models, pure pricing (`priceCart`, `applyDiscount`, `shippingFor`) that mirrors the seed's money model exactly, a storage-agnostic cart store (`createCartStore`, `localStorage`-backed in the browser, safe on the server), and the shop wire contract (`shopApiPaths`, `CheckoutRequest`/`CheckoutResponse`, ...). `src/config.ts` exports one object, `shopConfig` — currency, VAT rate, shipping rates and thresholds, the order number prefix, the low-stock threshold — as the single file a client fork edits to retarget the whole package.
- `packages/auth` — `AuthUser`/`Session` models scoped to either `"shop"` or `"cms"`, a storage-agnostic session store, `createAuthClient` for sign-up/sign-in/sign-out, and a `./server` subpath (Node-only) with HMAC session token signing/verification and `scrypt`-based password hashing. Both the API and the CMS depend on it, so a session token means the same thing everywhere it's checked.
- `packages/forms` — the `FormType` union (`contact` | `newsletter` | `inquiry`), `validateSubmission`, a deterministic `leadScore` heuristic, and a `useFormSubmission` hook. A test in the package asserts its `FormType`s match the `form-submissions` collection's select options in the registry, so the two can't silently drift.

Each Domain Package is framework-agnostic at its root export, with React-dependent code isolated under a `./react` subpath so non-React consumers (the API, a future CLI) never pull in React. None of them import from `apps/*`, so the dependency direction stays one-way: apps depend on packages, never the reverse.

**`@three-acts/cms-schema` gains the vocabulary a domain-owned collection needs.** A `RecordSource` (`"editors"` | `"site"`) on `CmsCollection`, defaulting to `"editors"`; `readonly`-mode collections are always `"site"`. A `readOnly` flag on `FieldBase`: the editor renders the value but never an input, and the API keeps the stored value on every editor save. `recordSourceFor`, `canCreateRecords`, and `isReadOnlyField` in `columns.ts` compute these consistently for both the CMS and the API. `orders` and `customers` become `recordSource: "site"` `data`-mode collections with `readOnly` fields on everything the site computes (totals, timestamps, identity); `cms-users` is removed entirely, and `form-submissions`' ambiguous `source` field is renamed `form` with a `contact`/`newsletter`/`inquiry` select.

**`apps/api`'s service layer gets a system write path** that bypasses this gating on purpose: `createSystemRecord`/`updateSystemRecord` in `api/_lib/cms/service.ts` are how the site's own flows — checkout, sign-up, a form submission — create and update records in a `recordSource: "site"` collection, including its `readOnly` fields, with `required` always enforced (a system write is always a complete record, never an editor's in-progress draft). `createRecord`/`importRecords` throw a `forbidden` `CmsError` whenever `!canCreateRecords(collection)`, so an editor hitting the same collection through the ordinary REST Bridge routes is rejected at the same boundary a UI toggle would only hide, not enforce.

**A JSON-file Data Store gives local development real persistence with zero external services.** `FileDataStore` (`api/_lib/cms/file-store.ts`) writes one `<collectionId>.json` under `CMS_DATA_DIR` (default `./data`, gitignored), seeded from the shared dataset on first access, rewritten atomically (write `.tmp`, then `rename`) on every mutation, with writes to the same collection serialized through a per-collection queue. It shares its record logic (search/sort/paginate, the publish/live-snapshot model, id/timestamp stamping) with `MemoryDataStore` through `RecordCollectionEngine`, so the two backends can't drift on record semantics. `resolve-store.ts` picks it by default outside production and outside Vercel (`CMS_DATA_BACKEND` unset, Supabase env vars absent); Vercel and production fall back to the in-process Memory store instead, because the file store's directory isn't durable across serverless invocations. `FileBlobStore` writes uploads under `CMS_DATA_DIR/uploads/<bucket>/...`, served back by `GET /api/uploads/[...path]`.

**The Identity Store is deliberately not a CMS Collection.** `IdentityStore` (`api/_lib/auth/identity-store.ts`) holds `{ email, passwordHash, customerId }` in its own file (`identities.json`) or in-process map, with `FileIdentityStore`/`MemoryIdentityStore` mirroring the same local/production split as the Data Store. A shopper's `customers` record — visible and editable in the CMS — never carries a password hash; the two are linked only by `customerId`. CMS editor sign-in doesn't use the Identity Store at all: `CMS_AUTH_MODE=open` (dev default) accepts any email/password, `CMS_AUTH_MODE=env` checks `CMS_EDITORS="email:password,..."`. The pre-existing shared `PUBLISH_TOKEN` bearer keeps working alongside real sessions, so deploy scripts and CI that predate login don't break.

**The API becomes the single bridge for every storefront and auth operation**, never just CMS records and published content:

```
POST /api/auth/sign-up | sign-in | sign-out     GET /api/auth/session, /account   PUT /api/auth/account
GET  /api/shop/products, /products/:slug        GET/POST /products/:slug/reviews
POST /api/shop/discounts/validate               POST /api/shop/checkout
GET  /api/shop/orders, /orders/:orderNumber
POST /api/forms/submit                          (replaces /api/contact)
GET  /api/content/redirects                      GET /api/uploads/[...path]
```

Checkout (`api/_lib/shop/checkout.ts`) prices the cart with `@three-acts/ecommerce`'s `priceCart`, charges through a `PaymentProvider` interface (`api/_lib/shop/payments.ts`), creates the order via the system write path, decrements inventory, and upserts the customer's aggregates — all server-side; the browser never sees a payment credential. `PAYMENT_PROVIDER=mock` is the only implementation today: card/Apple Pay/PayPal/gift card settle immediately, EFT comes back `"awaiting"`. Swapping in a real processor means implementing `PaymentProvider` and registering it — `checkout()` itself doesn't change.

## Alternatives considered

- **Supabase Auth (or another identity provider) called directly from the browser.** Rejected for the same reason ADR 0003 kept Data Store/Blob Store access server-side: it ties the session model to one vendor's client SDK in the browser bundle, and it gives the API no seam to enforce that a shop session and a CMS session are different things. Session issuing and verification stay in `apps/api`, behind `@three-acts/auth/server`.
- **Astro SSR instead of static + islands + API.** Rejected. It would mean a live render path for every request, undermining ADR 0001/0002's static-first, zero-JS-by-default model for the majority of pages that don't need it. Client routes (cart, checkout, account) already get a hydrated shell where that's genuinely needed; the rest of the site stays static.
- **Storing an order's line items in a separate `order-line-items` collection**, relation-style. Rejected for now: there is no relation field type in `@three-acts/cms-schema` yet (ADR 0004 flagged this limitation), and a separate collection would need one to be editable sanely. `items` is instead a `readOnly`, `format: "json"` field on `orders` holding a serialized `OrderLineItem[]` — visible and auditable in the CMS, but only the system write path sets it.
- **Keeping `cms-users` as the editor identity source.** Rejected. It conflated "a row visible in the CMS" with "a credential that can log into the CMS," which is exactly the shape of bug ADR 0003 was already trying to avoid for `PUBLISH_TOKEN`. Editor credentials now live in `CMS_EDITORS` (or `CMS_AUTH_MODE=open` in dev), and the Identity Store is scoped to shop customers only.

## Consequences

- Every storefront and auth operation is an extra network hop through `apps/api`, on top of the existing CMS-write hop ADR 0003 already accepted. That hop is the cost of keeping payment logic, session secrets, and identity credentials server-side.
- The Cart and the client-side half of a Session live in `localStorage`, scoped per browser. There is no server-side cart; a shopper who switches devices mid-cart starts over. `packages/auth`'s and `packages/ecommerce`'s stores are storage-agnostic specifically so a future server-persisted cart or session is a storage-adapter swap, not a rewrite.
- The File Data Store and the file-backed Identity Store are dev-only, same as the Memory store before them: state lives on local disk, not in a shared or durable location, and neither is selected on Vercel or in production.
- `PAYMENT_PROVIDER=mock` never talks to a real processor. Every order placed against it is a fake charge; going live with real payments means implementing `PaymentProvider` for a real provider and setting `PAYMENT_PROVIDER` accordingly — nothing else in checkout changes.
- Line items, shipping details, and every computed total on `orders` are `readOnly` in the editor. An editor who needs to correct a genuine mistake (a wrong shipping address, a miskeyed total) can't do it through the field — that gap is accepted for now in favor of the stronger guarantee that a real order's numbers can't be casually edited.
- `@three-acts/cms-schema` still has no relation field type (ADR 0004). Cross-collection references stay slug/id text fields and, for orders, a serialized JSON blob — visible in the registry and the generated schema, not hidden behind an ORM-style relation the tooling would need to grow first.
