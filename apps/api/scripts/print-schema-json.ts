/**
 * Prints the shared CMS registry (`@three-acts/cms-schema`) as plain JSON, so
 * non-TypeScript tools (or a quick `jq`/diff) can consume the collection
 * config without importing the package.
 *
 * Usage: `npm run schema:json -w @three-acts/api`
 */
import { collectionRegistry } from "@three-acts/cms-schema";

console.log(JSON.stringify(collectionRegistry, null, 2));
