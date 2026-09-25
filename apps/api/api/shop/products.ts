import { ok, withApi } from "../_lib/http";
import { listLiveProducts } from "../_lib/shop/catalogue";

/**
 * GET /api/shop/products -> { products: Product[] }
 *
 * Public (no auth): every live product (published, not discontinued).
 * Cacheable like the other public content routes.
 */
export default withApi(["GET"], async (_request, response) => {
  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  ok(response, { products: await listLiveProducts() });
});
