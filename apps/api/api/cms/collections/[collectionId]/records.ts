import type { CreateRecordBody, ListRecordsOptions } from "@three-acts/cms-schema";
import { ApiError, ok, readJsonBody, withApi } from "../../../_lib/http";
import { requireAuth } from "../../../_lib/auth";
import { createRecord, listRecords } from "../../../_lib/cms/service";

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const readIntParam = (value: unknown, name: string): number | undefined => {
  const raw = readStringParam(value);
  if (raw === undefined) {
    return undefined;
  }

  if (!/^-?\d+$/.test(raw)) {
    throw new ApiError(400, "invalid_query", `${name} must be an integer.`);
  }

  return Number(raw);
};

/**
 * GET  /api/cms/collections/:collectionId/records?search&sortKey&sortDirection&limit&offset -> ListRecordsResult
 * POST /api/cms/collections/:collectionId/records  body CreateRecordBody -> CmsRecord
 */
export default withApi(["GET", "POST"], async (request, response) => {
  requireAuth(request);

  const collectionId = readStringParam(request.query.collectionId);
  if (!collectionId) {
    throw new ApiError(400, "invalid_query", "collectionId is required.");
  }

  if (request.method === "GET") {
    const search = readStringParam(request.query.search);
    const sortKey = readStringParam(request.query.sortKey);
    const sortDirectionRaw = readStringParam(request.query.sortDirection);

    if (sortDirectionRaw !== undefined && sortDirectionRaw !== "asc" && sortDirectionRaw !== "desc") {
      throw new ApiError(400, "invalid_query", "sortDirection must be 'asc' or 'desc'.");
    }

    const limit = readIntParam(request.query.limit, "limit");
    const offset = readIntParam(request.query.offset, "offset");

    const options: ListRecordsOptions = {
      search: search || undefined,
      sort: sortKey ? { key: sortKey, direction: sortDirectionRaw === "asc" ? "asc" : "desc" } : undefined,
      limit,
      offset
    };

    ok(response, await listRecords(collectionId, options));
    return;
  }

  const body = readJsonBody<CreateRecordBody>(request);
  ok(response, await createRecord(collectionId, body.values));
});
