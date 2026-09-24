import type { ListRecordsOptions } from "@three-acts/cms-schema";
import { ApiError, ok, withApi } from "../../../_lib/http";
import { listPublishedRecords } from "../../../_lib/cms/service";

const MAX_LIMIT = 500;

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const readIntParam = (value: unknown, name: string): number | undefined => {
  const raw = readStringParam(value);
  if (raw === undefined) {
    return undefined;
  }
  if (!/^\d+$/.test(raw)) {
    throw new ApiError(400, "invalid_query", `${name} must be a non-negative integer.`);
  }
  return Number(raw);
};

/**
 * GET /api/content/collections/:collectionId/records?sortKey&sortDirection&limit&offset -> ListRecordsResult
 *
 * Public (no bearer token): the static site fetches published content here at
 * build time. The service restricts it to editorial collections and
 * `published` records, so nothing an editor hasn't published, and nothing
 * from `data`/`readonly` collections, is reachable. Responses are cacheable.
 */
export default withApi(["GET"], async (request, response) => {
  const collectionId = readStringParam(request.query.collectionId);
  if (!collectionId) {
    throw new ApiError(400, "invalid_query", "collectionId is required.");
  }

  const sortKey = readStringParam(request.query.sortKey);
  const sortDirectionRaw = readStringParam(request.query.sortDirection);
  if (sortDirectionRaw !== undefined && sortDirectionRaw !== "asc" && sortDirectionRaw !== "desc") {
    throw new ApiError(400, "invalid_query", "sortDirection must be 'asc' or 'desc'.");
  }

  const limit = readIntParam(request.query.limit, "limit");
  if (limit !== undefined && (limit < 1 || limit > MAX_LIMIT)) {
    throw new ApiError(400, "invalid_query", `limit must be between 1 and ${MAX_LIMIT}.`);
  }
  const offset = readIntParam(request.query.offset, "offset");

  const options: ListRecordsOptions = {
    sort: sortKey ? { key: sortKey, direction: sortDirectionRaw === "asc" ? "asc" : "desc" } : undefined,
    limit,
    offset
  };

  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  ok(response, await listPublishedRecords(collectionId, options));
});
