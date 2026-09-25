import type { Article, Faq, Testimonial } from "@three-acts/content";
import type { Product } from "@three-acts/ecommerce";

/** Featured items first (source order preserved within each group), then the rest, capped at `count`. */
function featuredFirst<T extends { featured: boolean }>(items: readonly T[], count: number): T[] {
  const featured = items.filter((item) => item.featured);
  const rest = items.filter((item) => !item.featured);
  return [...featured, ...rest].slice(0, count);
}

/** "Fresh off the roaster": featured products first, then the rest — capped at `count` — skipping any product with no image to show. */
export function pickFeaturedProducts(products: readonly Product[], count: number): Product[] {
  return featuredFirst(
    products.filter((product) => product.images.length > 0),
    count
  );
}

/** "From the journal": featured articles first, then the most recently published — capped at `count`. */
export function pickFeaturedArticles(articles: readonly Article[], count: number): Article[] {
  const byRecency = [...articles].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return featuredFirst(byRecency, count);
}

/** Featured testimonials, capped at `max`; pads with the next highest-`sortOrder` testimonials if there aren't `min` featured ones. */
export function pickFeaturedTestimonials(testimonials: readonly Testimonial[], min: number, max: number): Testimonial[] {
  const bySortOrder = [...testimonials].sort((a, b) => a.sortOrder - b.sortOrder);
  const featured = bySortOrder.filter((testimonial) => testimonial.featured).slice(0, max);
  if (featured.length >= min) {
    return featured;
  }
  const rest = bySortOrder.filter((testimonial) => !testimonial.featured);
  return [...featured, ...rest].slice(0, max);
}

/** The FAQ teaser: `general`/`shipping` questions, ordered by `sortOrder`, capped at `count`. */
export function pickFaqTeaser(faqs: readonly Faq[], count: number): Faq[] {
  return faqs
    .filter((faq) => faq.topic === "general" || faq.topic === "shipping")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, count);
}

/** Distinct single-origin coffees currently live in the shop — the hero's "origins" stat. */
export function countOrigins(products: readonly Product[]): number {
  return products.filter((product) => product.categorySlug === "single-origin").length;
}
