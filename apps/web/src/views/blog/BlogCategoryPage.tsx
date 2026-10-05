import type { Article, ArticleCategory } from "@three-acts/content";
import copy from "@three-acts/static-content/documents/article-category-template.json";
import { articleMetaLine } from "../../components/blog/article-meta-line";
import { CategoryNav } from "../../components/blog/category-nav";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";

function CategoryBreadcrumb({ category }: { category: ArticleCategory }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8 text-small text-ink">
      <ol className="flex flex-wrap items-center gap-2">
        <li className="flex items-center gap-2">
          <a
            data-static-field="article-category-template.journal_breadcrumb_href"
            data-static-attribute="href"
            href={copy.journal_breadcrumb_href}
            className="focus-ring hover:underline"
          >
            <span data-static-field="article-category-template.journal_breadcrumb">{copy.journal_breadcrumb}</span>
          </a>
          <span aria-hidden="true" className="text-block">/</span>
        </li>
        <li aria-current="page" className="font-medium text-ink" data-cms-bound="articleCategories.name">{category.name}</li>
      </ol>
    </nav>
  );
}

type BlogCategoryPageProps = {
  category: ArticleCategory;
  /** Already filtered to this category. */
  articles: Article[];
  /** Every journal category, for the filter strip. */
  categories: ArticleCategory[];
  /** Article count per category slug, across the whole journal. */
  counts: Record<string, number>;
  /** The "All" link's count. */
  totalCount: number;
};

/** `/blog/category/:slug`: breadcrumb, the category's own name/description as the section header, the shared category filter strip, and a grid of its articles (or an empty state). */
export function BlogCategoryPage({ category, articles, categories, counts, totalCount }: BlogCategoryPageProps) {
  return (
    <Section.Root>
      <Section.Container>
        <CategoryBreadcrumb category={category} />
        <Section.Header
          eyebrow={<span data-static-field="article-category-template.journal_eyebrow">{copy.journal_eyebrow}</span>}
          title={<span data-cms-bound="articleCategories.name">{category.name}</span>}
          lede={category.description ? <span data-cms-bound="articleCategories.description">{category.description}</span> : undefined}
        />
        <div data-cms-bound="articleCategories.navigation"><CategoryNav
          categories={categories}
          counts={counts}
          totalCount={totalCount}
          activeSlug={category.slug}
          className="mb-12 desktop:mb-16"
        /></div>

        {articles.length > 0 ? (
          <Grid.Root cols={3} data-cms-bound="articles.inCategory">
            {articles.map((article) => (
              <Card.Article
                key={article.slug}
                title={article.title}
                href={`/blog/${article.slug}`}
                image={article.coverImage}
                meta={articleMetaLine(article, categories, { includeCategory: false })}
              />
            ))}
          </Grid.Root>
        ) : (
          <EmptyState.Root
            title={<span data-static-field="article-category-template.empty_title">{copy.empty_title}</span>}
            description={<span data-static-field="article-category-template.empty_description">{copy.empty_description}</span>}
            action={
              <Button.Link
                data-static-field="article-category-template.empty_action_href"
                data-static-attribute="href"
                href={copy.empty_action_href}
                variant="secondary"
              >
                <span data-static-field="article-category-template.empty_action">{copy.empty_action}</span>
              </Button.Link>
            }
          />
        )}
      </Section.Container>
    </Section.Root>
  );
}
