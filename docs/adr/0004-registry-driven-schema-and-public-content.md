# ADR 0004: Registry-driven schema tooling and a public content route

- Status: Accepted
- Date: 2026-09-24

## Context

ADR 0003 made `@three-acts/cms-schema`'s collection registry the shared definition for the editor and the REST bridge. Two gaps remained:

- The database did not follow the registry after first creation. `schema:sql` printed `CREATE TABLE IF NOT EXISTS` only, so adding, removing, or retyping a field produced no `ALTER` statement, and constraints declared in config (select options, slug uniqueness) were enforced only in the API service layer.
- The public site (`apps/web`) bypassed the registry entirely. It read a hand-written `posts` table through the Supabase anon key, with column names that matched nothing in the registry. A backend swap therefore meant two swaps, and the site's data model could drift from the CMS's.

## Decision

1. **Constraints come from the registry.** The SQL generator emits, per collection: a `CHECK` on `publish_status` over the shared `publishStatuses` list, a `CHECK` per select field allowing `''` or one of the configured option values, and a partial unique index (`where col is not null and col <> ''`) for every field where `isUniqueField` is true. `slug` fields are unique by default; any field can opt in or out with `unique`. No `NOT NULL` is emitted for fields because `required` is a publish-time rule and drafts are legitimately empty.

2. **Migrations are diffed against a committed snapshot, not a live database.** `apps/api/schema/snapshot.json` captures the table shape the registry last produced. `schema:diff` compares the current registry to it and prints `ALTER`/`CREATE` SQL; `schema:migrate` writes that SQL to `apps/api/schema/migrations/` and advances the snapshot. Destructive statements (drop table, drop column) are emitted commented out. Renames cannot be detected and appear as drop + add. No database driver or ORM is introduced.

3. **The site reads through a public content route.** `GET /api/content/collections/:collectionId/records` is unauthenticated and serves only `published` records of collections with a publish workflow. `data` and `readonly` collections return not found, so operational and system-generated records are never reachable. `apps/web` selects its content source with `CONTENT_SOURCE=mock|api`; the `api` source maps records using the registry's field keys and fails the build loudly when the fetch fails. The Supabase client is removed from `apps/web`.

4. **A real `posts` collection lives in the registry.** It replaces the site's ad-hoc table definition. Tags are a comma-separated text field for now; a list field type is future work.

   _Update 2026-09-25:_ the demo registry was replaced by a realistic site model (articles, authors, categories, FAQs, testimonials, a shop with products/orders/customers, and CMS users). `posts` became `articles`; the site's `api` source now reads `articles`. Cross-collection references (e.g. `articles.author` → `authors.slug`) are slug text fields until a relation field type exists.

## Alternatives considered

- **Introspect the live database to diff.** Rejected for now. It needs a Postgres driver and credentials in the tooling path, and Supabase's REST layer cannot query `information_schema`. A snapshot is dependency-free and reviewable in git.
- **Adopt Drizzle or Prisma for migrations.** Rejected. Their schema would become a second source of truth alongside the registry, or the registry would have to be generated from them, inverting the ownership ADR 0003 established.
- **Keep the site on the anon key with row-level security.** Rejected for the same reasons as in ADR 0003: it ties the site to one vendor's client and puts authorization in RLS policies the rest of the stack cannot see.
- **Require the publish token on the content route.** Rejected. Published editorial content is public by definition, and the service-layer filter is a stronger guarantee than a shared secret. The route is still scoped to editorial collections and published records only.

## Consequences

- Changing a field now has a defined path: edit the registry, run `schema:diff`, review, apply, run `schema:migrate` to advance the snapshot. Skipping the last step makes the next diff repeat the same statements, which is harmless because they are idempotent.
- The generated SQL remains Postgres-flavoured (`uuid`, `timestamptz`, `gen_random_uuid`, plpgsql trigger). A SQLite target needs a dialect switch in `apps/api/scripts/schema/sql.ts`.
- Site builds now depend on the API being reachable when `CONTENT_SOURCE=api`. That is intentional: a failed fetch should stop a deploy, not publish an empty blog.
- Field types are still limited (no relation, rich text, or list). The `articles.tags` field and slug-based references such as `articles.author` carry that limitation visibly.
