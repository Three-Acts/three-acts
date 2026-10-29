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

function linkClass(active: boolean) {
  return cn(
    "focus-ring text-body text-ink underline decoration-1 underline-offset-4 hover:no-underline",
    active && "font-medium no-underline"
  );
}

/** Horizontal strip of journal category text links with counts — underlined, no pills, no fills. */
export function CategoryNav({ categories, counts, totalCount, activeSlug, className, ...props }: CategoryNavProps) {
  return (
    <nav aria-label="Journal categories" className={cn("flex flex-wrap items-center gap-x-6 gap-y-3", className)} {...props}>
      <a href="/blog" aria-current={activeSlug ? undefined : "page"} className={linkClass(!activeSlug)}>
        All <span className="text-small">({totalCount})</span>
      </a>
      {categories.map((category) => {
        const active = category.slug === activeSlug;
        return (
          <a
            key={category.slug}
            href={`/blog/category/${category.slug}`}
            aria-current={active ? "page" : undefined}
            className={linkClass(active)}
          >
            {category.name} <span className="text-small">({counts[category.slug] ?? 0})</span>
          </a>
        );
      })}
    </nav>
  );
}

export type { CategoryNavProps };
