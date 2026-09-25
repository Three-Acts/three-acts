import type { Article, ArticleCategory } from "@three-acts/content";
import { formatDate } from "../../lib/format";

/** Looks up a category's display name by slug, falling back to the raw slug so a dangling `categorySlug` reference never renders blank. */
export function categoryNameFor(categories: readonly ArticleCategory[], slug: string): string {
  return categories.find((category) => category.slug === slug)?.name ?? slug;
}

type ArticleMetaLineOptions = {
  /** Set `false` when the surrounding page already makes the category obvious (a category listing, an author's articles). Defaults to `true`. */
  includeCategory?: boolean;
};

/** The small eyebrow line under a journal card's title, e.g. "Brew Guides · 25 September 2026 · 5 min read". */
export function articleMetaLine(article: Article, categories: readonly ArticleCategory[], options: ArticleMetaLineOptions = {}): string {
  const includeCategory = options.includeCategory ?? true;
  const parts = [
    includeCategory ? categoryNameFor(categories, article.categorySlug) : null,
    formatDate(article.publishedAt),
    `${article.readingTime} min read`
  ].filter((part): part is string => Boolean(part));
  return parts.join(" · ");
}
