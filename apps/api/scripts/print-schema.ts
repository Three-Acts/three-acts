/**
 * Prints `CREATE TABLE IF NOT EXISTS` SQL (plus deterministic check
 * constraints, unique indexes, and an `updated_at` trigger) for every
 * collection in the shared CMS registry (`@three-acts/cms-schema`), using
 * the exact same column mapping the API's `SupabaseDataStore` reads and
 * writes. Point any Postgres database at this schema and the CMS backend
 * works against it.
 *
 * Usage: `npm run schema:sql -w @three-acts/api` (prints to stdout; pipe to a
 * file or `psql` as needed). Review before running — adjust types,
 * constraints, and the RLS example to your needs.
 *
 * For incremental changes against an existing database, see
 * `npm run schema:diff` / `npm run schema:migrate` instead (schema/diff.ts).
 */
import { collectionRegistry } from "@three-acts/cms-schema";
import { fullSchemaSql } from "./schema/sql";

console.log(fullSchemaSql(collectionRegistry));
