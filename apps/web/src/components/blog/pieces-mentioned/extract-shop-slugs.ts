const SHOP_LINK_PATTERN = /\/shop\/(?!category\/)([a-zA-Z0-9-]+)/g;

/**
 * Extracts, de-duplicated and in order of first appearance, every product
 * slug referenced as a `/shop/<slug>` link in `body` (an article's raw plain
 * text — the same links `Prose` autolinks when it renders). `/shop/category/*`
 * links are excluded since they name a category, not a product.
 */
export function extractShopSlugs(body: string): string[] {
  const seen = new Set<string>();
  const slugs: string[] = [];
  SHOP_LINK_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SHOP_LINK_PATTERN.exec(body))) {
    const slug = match[1];
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }
  return slugs;
}
