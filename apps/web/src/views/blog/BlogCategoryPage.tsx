import type { Article, ArticleCategory } from "@three-acts/content";
import { articleMetaLine } from "../../components/blog/article-meta-line";
import { CategoryNav } from "../../components/blog/category-nav";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";

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
        <Breadcrumb.Root items={[{ label: "Journal", href: "/blog" }, { label: category.name }]} className="mb-8" />
        <Section.Header eyebrow="Journal" title={category.name} lede={category.description || undefined} />
        <CategoryNav
          categories={categories}
          counts={counts}
          totalCount={totalCount}
          activeSlug={category.slug}
          className="mb-12 desktop:mb-16"
        />

        {articles.length > 0 ? (
          <Grid.Root cols={3}>
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
            title={`No ${category.name.toLowerCase()} articles yet`}
            description="Check back soon — new articles are on the way."
            action={
              <Button.Link href="/blog" variant="secondary">
                Browse the journal
              </Button.Link>
            }
          />
        )}
      </Section.Container>
    </Section.Root>
  );
}
