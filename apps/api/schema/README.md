# CMS schema tooling

The source of truth for the CMS's tables is `collectionRegistry` in
`packages/cms-schema/src/registry.ts` (id, fields, system columns, naming).
Everything here is generated from it — never hand-edit generated SQL back
into the registry.

- **`npm run schema:sql -w @three-acts/api`** — prints the full, idempotent
  schema (`create table if not exists`, check constraints, partial unique
  indexes, an `updated_at` trigger, and an RLS example) for every collection.
  Safe to re-run against a fresh or an existing database.
- **`npm run schema:json -w @three-acts/api`** — prints the registry as
  plain JSON, for tools that don't want to import TypeScript.
- **`npm run schema:diff -w @three-acts/api`** — no DB connection: diffs the
  registry against the committed `schema/snapshot.json` (or an empty schema
  if that file doesn't exist yet) and prints the migration SQL to bring an
  existing database in line.
- **`npm run schema:migrate -w @three-acts/api [-- <name>]`** — same diff,
  but also writes `schema/migrations/<timestamp>_<name>.sql` and updates
  `schema/snapshot.json` to match the current registry. Prints
  `-- No schema changes.` and writes nothing if there's no diff.

**Always review generated SQL before running it** (via `psql` or the
Supabase SQL editor) — types, constraints, and destructive changes should be
sanity-checked against your actual data.

Two things the differ can't do safely, so it flags them instead of acting:

- **Destructive drops** (a removed table or column) are emitted as a
  commented-out `-- drop ...` statement with a warning — uncomment only
  after confirming the data loss is intended.
- **Renames** look identical to an unrelated remove + add of a
  differently-named table/column. The differ cannot tell them apart; if you
  renamed something, fold the generated drop/add pair into a manual
  `alter ... rename to ...` yourself.
