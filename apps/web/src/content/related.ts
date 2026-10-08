import type { Article } from "@three-acts/content";
import type { Product } from "@three-acts/ecommerce";

function tagOverlap(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  return b.reduce((count, tag) => count + (setA.has(tag) ? 1 : 0), 0);
}

/** Same category first, then the highest tag overlap, then the source list's own order. Never includes `article` itself. */
export function relatedArticles(article: Article, all: readonly Article[], count: number): Article[] {
  const others = all.filter((candidate) => candidate.slug !== article.slug);
  const sameCategory = others.filter((candidate) => candidate.categorySlug === article.categorySlug);
  const rest = others.filter((candidate) => candidate.categorySlug !== article.categorySlug);
  const byOverlap = rest
    .map((candidate) => ({ candidate, overlap: tagOverlap(article.tags, candidate.tags) }))
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .map((entry) => entry.candidate);
  return [...sameCategory, ...byOverlap].slice(0, count);
}

/** Same category first, then the highest tag overlap, then the source list's own order. Never includes `product` itself. */
export function relatedProducts(product: Product, all: readonly Product[], count: number): Product[] {
  const others = all.filter((candidate) => candidate.slug !== product.slug);
  const sameCategory = others.filter((candidate) => candidate.categorySlug === product.categorySlug);
  const rest = others.filter((candidate) => candidate.categorySlug !== product.categorySlug);
  const byOverlap = rest
    .map((candidate) => ({ candidate, overlap: tagOverlap(product.tags, candidate.tags) }))
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .map((entry) => entry.candidate);
  return [...sameCategory, ...byOverlap].slice(0, count);
}
