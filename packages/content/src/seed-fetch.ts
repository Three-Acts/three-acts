import { collectionRegistry, hasPublishWorkflow, type CmsRecord, type CmsRecordValue } from "@three-acts/cms-schema";
import { cloneSeedCollections } from "@three-acts/cms-schema/seed";
import type { ContentFetch } from "./client";
import type { RedirectRule } from "./models";
import { toRedirectRule } from "./mappers";

/**
 * Serves the exact same envelope and pagination shape as `apps/api`'s public
 * content routes, straight out of `@three-acts/cms-schema/seed` — so the
 * zero-config web build (`CONTENT_SOURCE=mock`/unset) runs the very same
 * `createContentClient` code path as a deployed build, no server required.
 *
 * Mirrors `listPublishedRecords`/`listLiveRecords`
 * (`apps/api/api/_lib/cms/{service,memory-store}.ts`): only collections with
 * a publish workflow are served, only records with a non-null `liveValues`,
 * and `values` is replaced by that live snapshot.
 */

const COLLECTIONS_PATH = /^\/api\/content\/collections\/([^/]+)\/records$/;
const REDIRECTS_PATH = "/api/content/redirects";

function jsonResponse(status: number, body: unknown): { ok: boolean; status: number; json(): Promise<unknown> } {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function errorEnvelope(status: number, code: string, message: string) {
  return jsonResponse(status, { ok: false, error: { code, message } });
}

/** Mirrors `memory-store.ts`'s `getSortValue`: system fields by name, everything else from `values`. */
function sortValue(record: CmsRecord, key: string): CmsRecordValue {
  switch (key) {
    case "id":
      return record.id;
    case "publishStatus":
      return record.publishStatus;
    case "createdAt":
      return record.createdAt;
    case "modifiedAt":
      return record.modifiedAt;
    default:
      return record.values[key];
  }
}

/** Mirrors `memory-store.ts`'s `compareValues`. */
function compareValues(a: CmsRecordValue, b: CmsRecordValue): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1;
  return String(a).localeCompare(String(b));
}

function sortRecords(records: CmsRecord[], sortKey: string | null, sortDirection: string | null): CmsRecord[] {
  const key = sortKey ?? "modifiedAt";
  const direction = sortDirection === "asc" ? 1 : -1;
  return [...records].sort((a, b) => compareValues(sortValue(a, key), sortValue(b, key)) * direction);
}

function paginate(records: CmsRecord[], limitParam: string | null, offsetParam: string | null): { records: CmsRecord[]; total: number } {
  const total = records.length;
  const offset = offsetParam ? Number(offsetParam) : 0;
  const limit = limitParam !== null ? Number(limitParam) : undefined;
  const page = limit !== undefined ? records.slice(offset, offset + limit) : records.slice(offset);
  return { records: page, total };
}

/** The `redirect-rules` collection is `data`-mode (no publish workflow): every record's `values` is already current. */
function loadRedirects(): RedirectRule[] {
  const seed = cloneSeedCollections();
  const records = seed["redirect-rules"] ?? [];
  const redirects: RedirectRule[] = [];
  for (const record of records) {
    const redirect = toRedirectRule(record);
    if (redirect) {
      redirects.push(redirect);
    }
  }
  return redirects;
}

function loadLiveRecords(collectionId: string): CmsRecord[] {
  const seed = cloneSeedCollections();
  const records = seed[collectionId] ?? [];
  const live: CmsRecord[] = [];
  for (const record of records) {
    if (!record.liveValues) {
      continue;
    }
    live.push({ ...record, values: { ...record.liveValues } });
  }
  return live;
}

/** Builds a `ContentFetch` that serves the public content API straight from the shared seed, no server needed. */
export function createSeedContentFetch(): ContentFetch {
  return async (url) => {
    const parsed = new URL(url, "http://seed.local");
    const path = parsed.pathname;

    const collectionsMatch = path.match(COLLECTIONS_PATH);
    if (collectionsMatch) {
      const collectionId = decodeURIComponent(collectionsMatch[1]);
      const collection = collectionRegistry.find((entry) => entry.id === collectionId);
      if (!collection || !hasPublishWorkflow(collection)) {
        return errorEnvelope(404, "not_found", `Unknown collection: ${collectionId}`);
      }

      const sorted = sortRecords(loadLiveRecords(collectionId), parsed.searchParams.get("sortKey"), parsed.searchParams.get("sortDirection"));
      const { records, total } = paginate(sorted, parsed.searchParams.get("limit"), parsed.searchParams.get("offset"));
      return jsonResponse(200, { ok: true, data: { records, total } });
    }

    if (path === REDIRECTS_PATH) {
      return jsonResponse(200, { ok: true, data: { redirects: loadRedirects() } });
    }

    return errorEnvelope(404, "not_found", `Unknown content route: ${path}`);
  };
}
