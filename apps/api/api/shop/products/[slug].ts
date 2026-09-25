import { ApiError, ok, withApi } from "../../_lib/http";
import { getLiveProduct } from "../../_lib/shop/catalogue";

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/**
 * GET /api/shop/products/:slug -> { product: Product }
 *
 * Public (no auth). 404 `not_found` when the slug doesn't match a live
 * (published, non-discontinued) product.
 */
export default withApi(["GET"], async (request, response) => {
  const slug = readStringParam(request.query.slug);
  if (!slug) {
    throw new ApiError(400, "invalid_query", "slug is required.");
  }

  const product = await getLiveProduct(slug);
  if (!product) {
    throw new ApiError(404, "not_found", `No product found for slug "${slug}".`);
  }

  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  ok(response, { product });
});
