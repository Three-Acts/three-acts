import { shopApiPaths, type Product } from "@three-acts/ecommerce";
import { apiFetch } from "../../lib/api-client";

/**
 * Module-scope cache over `GET /api/shop/products` — every island that needs
 * to resolve cart lines to live products (`CartPage`, `CheckoutForm`) shares
 * this one in-flight/resolved promise instead of each firing its own
 * request. Reset on failure so a later call retries the network rather than
 * replaying a cached rejection forever.
 */
let cached: Promise<Product[]> | undefined;

export function loadProducts(): Promise<Product[]> {
  if (!cached) {
    cached = apiFetch<{ products: Product[] }>(shopApiPaths.products()).then((response) => response.products);
    cached.catch(() => {
      cached = undefined;
    });
  }
  return cached;
}

/** `Product[]` -> a `Map` keyed by slug, for O(1) cart-line resolution. */
export function indexBySlug(products: readonly Product[]): Map<string, Product> {
  return new Map(products.map((product) => [product.slug, product]));
}
