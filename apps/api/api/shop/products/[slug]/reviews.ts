import { ApiError, json, ok, readJsonBody, withApi } from "../../../_lib/http";
import { listApprovedReviews, submitReview } from "../../../_lib/shop/catalogue";

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/**
 * GET  /api/shop/products/:slug/reviews -> { reviews: ProductReview[] } (approved only, newest first)
 * POST /api/shop/products/:slug/reviews  body SubmitReviewRequest -> { review } 201
 *   (approved: false, source: "site"; verifiedPurchase is computed from a
 *   matching paid order, never trusted from the client)
 */
export default withApi(["GET", "POST"], async (request, response) => {
  const slug = readStringParam(request.query.slug);
  if (!slug) {
    throw new ApiError(400, "invalid_query", "slug is required.");
  }

  if (request.method === "GET") {
    ok(response, { reviews: await listApprovedReviews(slug) });
    return;
  }

  const body = readJsonBody<unknown>(request);
  const review = await submitReview(slug, body);
  json(response, 201, { ok: true, data: { review } });
});
