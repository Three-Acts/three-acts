import { createElement, type ReactNode } from "react";
import { cmsAttributes } from "@three-acts/cms-schema";
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

/** The small eyebrow line under a journal card's title, e.g. "Guides · 25 September 2026 · 5 min read". */
export function articleMetaLine(article: Article, categories: readonly ArticleCategory[], options: ArticleMetaLineOptions = {}): ReactNode {
  const source = { collectionId: "articles", recordId: article.id, label: article.title };
  const category = categories.find(category => category.slug === article.categorySlug);
  const categorySource = category ? { collectionId: "article-categories", recordId: category.id, label: category.name } : source;
  const parts = [
    { value: options.includeCategory === false ? "" : categoryNameFor(categories, article.categorySlug), source: categorySource, field: category ? "name" : "category" },
    { value: formatDate(article.publishedAt), source, field: "publishedAt" },
    { value: `${article.readingTime} min read`, source, field: "readingTime" }
  ].filter(part => Boolean(part.value));
  return parts.flatMap((part, index) => [index ? " · " : "", createElement("span", { ...cmsAttributes(part.source, part.field), key: part.field }, part.value)]);
}
