import { elementClass } from "../../lib/design";
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
    <nav data-editor-base-class={"mb-8 text-small text-ink"} data-editor-id="source.BlogCategoryPage.1" aria-label="Breadcrumb" className={elementClass("source.BlogCategoryPage.1", "mb-8 text-small text-ink")}>
      <ol data-editor-base-class={"flex flex-wrap items-center gap-2"} data-editor-id="source.BlogCategoryPage.2" className={elementClass("source.BlogCategoryPage.2", "flex flex-wrap items-center gap-2")}>
        <li data-editor-base-class={"flex items-center gap-2"} data-editor-id="source.BlogCategoryPage.3" className={elementClass("source.BlogCategoryPage.3", "flex items-center gap-2")}>
          <a data-editor-base-class={"focus-ring hover:underline"} data-editor-id="article-category-template.journal_breadcrumb_href"
            data-static-field="article-category-template.journal_breadcrumb_href"
            data-static-attribute="href"
            href={copy.journal_breadcrumb_href}
            className={elementClass("article-category-template.journal_breadcrumb_href", "focus-ring hover:underline")}
          >
            <span data-editor-base-class={""} data-editor-id="article-category-template.journal_breadcrumb" className={elementClass("article-category-template.journal_breadcrumb", "")} data-static-field="article-category-template.journal_breadcrumb">{copy.journal_breadcrumb}</span>
          </a>
          <span data-editor-base-class={"text-block"} data-editor-id="source.BlogCategoryPage.4" aria-hidden="true" className={elementClass("source.BlogCategoryPage.4", "text-block")}>/</span>
        </li>
        <li data-editor-base-class={"font-medium text-ink"} data-editor-id="source.BlogCategoryPage.5" aria-current="page" className={elementClass("source.BlogCategoryPage.5", "font-medium text-ink")} data-cms-bound="articleCategories.name">{category.name}</li>
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
    <Section.Root data-editor-id="source.BlogCategoryPage.6">
      <Section.Container data-editor-id="source.BlogCategoryPage.7">
        <CategoryBreadcrumb category={category} />
        <Section.Header
          eyebrow={<span data-editor-base-class={""} data-editor-id="article-category-template.journal_eyebrow" className={elementClass("article-category-template.journal_eyebrow", "")} data-static-field="article-category-template.journal_eyebrow">{copy.journal_eyebrow}</span>}
          title={<span data-editor-base-class={""} data-editor-id="source.BlogCategoryPage.8" className={elementClass("source.BlogCategoryPage.8", "")} data-cms-bound="articleCategories.name">{category.name}</span>}
          lede={category.description ? <span data-editor-base-class={""} data-editor-id="source.BlogCategoryPage.9" className={elementClass("source.BlogCategoryPage.9", "")} data-cms-bound="articleCategories.description">{category.description}</span> : undefined}
        />
        <div data-editor-base-class={""} data-editor-id="source.BlogCategoryPage.10" className={elementClass("source.BlogCategoryPage.10", "")} data-cms-bound="articleCategories.navigation"><CategoryNav
          categories={categories}
          counts={counts}
          totalCount={totalCount}
          activeSlug={category.slug}
          className="mb-12 desktop:mb-16"
        /></div>

        {articles.length > 0 ? (
          <Grid.Root data-editor-id="source.BlogCategoryPage.11" cols={3} data-cms-bound="articles.inCategory">
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
            title={<span data-editor-base-class={""} data-editor-id="article-category-template.empty_title" className={elementClass("article-category-template.empty_title", "")} data-static-field="article-category-template.empty_title">{copy.empty_title}</span>}
            description={<span data-editor-base-class={""} data-editor-id="article-category-template.empty_description" className={elementClass("article-category-template.empty_description", "")} data-static-field="article-category-template.empty_description">{copy.empty_description}</span>}
            action={
              <Button.Link data-editor-id="article-category-template.empty_action_href"
                data-static-field="article-category-template.empty_action_href"
                data-static-attribute="href"
                href={copy.empty_action_href}
                variant="secondary"
              >
                <span data-editor-base-class={""} data-editor-id="article-category-template.empty_action" className={elementClass("article-category-template.empty_action", "")} data-static-field="article-category-template.empty_action">{copy.empty_action}</span>
              </Button.Link>
            }
          />
        )}
      </Section.Container>
    </Section.Root>
  );
}
