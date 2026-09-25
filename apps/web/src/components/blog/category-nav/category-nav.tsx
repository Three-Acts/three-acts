import type { HTMLAttributes } from "react";
import type { ArticleCategory } from "@three-acts/content";
import { cn } from "@three-acts/utils";

type CategoryNavProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  className?: string;
  categories: readonly ArticleCategory[];
  /** Article count per category slug, e.g. from counting `loadArticles()` by `categorySlug`. Missing entries render as 0. */
  counts: Record<string, number>;
  /** Count shown on the "All" pill — usually `articles.length`. */
  totalCount: number;
  /** The current category's slug on `/blog/category/:slug`; omit on `/blog` itself so "All" is the active pill. */
  activeSlug?: string;
};

function pillClass(active: boolean) {
  return cn(
    "focus-ring inline-flex items-center gap-1.5 whitespace-nowrap border px-3.5 py-2 text-sm font-medium transition-colors duration-150",
    active ? "border-ink bg-ink text-paper" : "border-line bg-surface-raised text-ink hover:border-line-strong"
  );
}

/** Horizontal strip of journal category filter pills with counts, linking to `/blog` and `/blog/category/:slug`. */
export function CategoryNav({ categories, counts, totalCount, activeSlug, className, ...props }: CategoryNavProps) {
  return (
    <nav aria-label="Journal categories" className={cn("flex flex-wrap gap-2", className)} {...props}>
      <a href="/blog" aria-current={activeSlug ? undefined : "page"} className={pillClass(!activeSlug)}>
        All <span className={activeSlug ? "text-muted" : "text-paper/70"}>({totalCount})</span>
      </a>
      {categories.map((category) => {
        const active = category.slug === activeSlug;
        return (
          <a
            key={category.slug}
            href={`/blog/category/${category.slug}`}
            aria-current={active ? "page" : undefined}
            className={pillClass(active)}
          >
            {category.name} <span className={active ? "text-paper/70" : "text-muted"}>({counts[category.slug] ?? 0})</span>
          </a>
        );
      })}
    </nav>
  );
}

export type { CategoryNavProps };
