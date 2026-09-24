/**
 * Snapshot-based migration diff for the shared CMS registry
 * (`@three-acts/cms-schema`). No DB connection: compares the registry
 * against the committed `apps/api/schema/snapshot.json` (or an empty
 * snapshot — i.e. the full schema — if that file doesn't exist yet) and
 * prints the SQL needed to bring a database in line.
 *
 * Usage:
 *   npm run schema:diff -w @three-acts/api            # print only
 *   npm run schema:migrate -w @three-acts/api          # write a migration + update the snapshot
 *   npm run schema:migrate -w @three-acts/api -- <name> # name the migration file
 *
 * `--write` writes `apps/api/schema/migrations/<YYYYMMDDHHMMSS>_<name>.sql`
 * (name defaults to "schema") and overwrites `snapshot.json` to match the
 * current registry. Always review the generated SQL before running it
 * against a real database — see `apps/api/schema/README.md`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectionRegistry } from "@three-acts/cms-schema";
import { diffSnapshots, emptySnapshot, snapshotOf, type SchemaSnapshot } from "./schema/diff";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const schemaDir = join(scriptsDir, "..", "schema");
const snapshotPath = join(schemaDir, "snapshot.json");
const migrationsDir = join(schemaDir, "migrations");

function readPreviousSnapshot(): { snapshot: SchemaSnapshot; source: string } {
  if (!existsSync(snapshotPath)) {
    return { snapshot: emptySnapshot(), source: "(no schema/snapshot.json yet — diffing against an empty schema)" };
  }
  const raw = readFileSync(snapshotPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse ${snapshotPath} as JSON: ${(error as Error).message}`);
  }
  if (typeof parsed !== "object" || parsed === null || !("tables" in parsed)) {
    throw new Error(`${snapshotPath} doesn't look like a schema snapshot (missing "tables").`);
  }
  return { snapshot: parsed as SchemaSnapshot, source: "apps/api/schema/snapshot.json" };
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds())
  ].join("");
}

function parseArgs(argv: string[]): { write: boolean; name: string } {
  const writeIndex = argv.indexOf("--write");
  if (writeIndex === -1) {
    return { write: false, name: "schema" };
  }
  const rawName = argv[writeIndex + 1];
  const name = rawName && !rawName.startsWith("--") ? rawName : "schema";
  const safeName = name.trim().replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "schema";
  return { write: true, name: safeName };
}

function main(): void {
  const { write, name } = parseArgs(process.argv.slice(2));
  const now = new Date();

  const { snapshot: previous, source } = readPreviousSnapshot();
  const next = snapshotOf(collectionRegistry, now.toISOString());
  const { sql, hasChanges } = diffSnapshots(previous, next);

  if (!hasChanges) {
    console.log("-- No schema changes.");
    return;
  }

  const header = [
    `-- Migration diff: ${source} -> the current @three-acts/cms-schema registry.`,
    `-- Generated ${now.toISOString()} by npm run schema:diff / schema:migrate -w @three-acts/api.`,
    "-- Review before running against your database (psql or the Supabase SQL editor).",
    ""
  ].join("\n");
  const output = `${header}\n${sql}\n`;

  console.log(output);

  if (write) {
    mkdirSync(migrationsDir, { recursive: true });
    const fileName = `${formatTimestamp(now)}_${name}.sql`;
    writeFileSync(join(migrationsDir, fileName), output, "utf8");
    writeFileSync(snapshotPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.error(`Wrote schema/migrations/${fileName} and updated schema/snapshot.json.`);
  }
}

main();
