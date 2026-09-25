import type { Article, ArticleCategory } from "@three-acts/content";
import { articleMetaLine } from "../../components/blog/article-meta-line";
import { CategoryNav } from "../../components/blog/category-nav";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Typography } from "../../components/ui/typography";

type BlogCategoryPageProps = {
  category: ArticleCategory;
  /** Already filtered to this category. */
  articles: Article[];
  /** Every journal category, for the filter strip. */
  categories: ArticleCategory[];
  /** Article count per category slug, across the whole journal. */
  counts: Record<string, number>;
  /** The "All" pill's count. */
  totalCount: number;
};

/** `/blog/category/:slug`: the category's description, the shared category filter strip, and a grid of its articles (or an empty state). */
export function BlogCategoryPage({ category, articles, categories, counts, totalCount }: BlogCategoryPageProps) {
  return (
    <>
      <Section.Container className="pb-10 pt-14 desktop:pt-20">
        <Breadcrumb.Root items={[{ label: "Journal", href: "/blog" }, { label: category.name }]} className="mb-6" />
        <Typography.Eyebrow className="mb-5">The journal</Typography.Eyebrow>
        <Typography.Display>{category.name}</Typography.Display>
        {category.description && <Typography.Lede className="mt-6">{category.description}</Typography.Lede>}
        <CategoryNav categories={categories} counts={counts} totalCount={totalCount} activeSlug={category.slug} className="mt-10" />
      </Section.Container>

      <Section.Root className="pt-0">
        <Section.Container>
          {articles.length > 0 ? (
            <Grid.Root cols={3}>
              {articles.map((article) => (
                <Card.Article
                  key={article.slug}
                  title={article.title}
                  href={`/blog/${article.slug}`}
                  image={article.coverImage}
                  excerpt={article.excerpt}
                  meta={articleMetaLine(article, categories, { includeCategory: false })}
                />
              ))}
            </Grid.Root>
          ) : (
            <EmptyState.Root
              title={`No ${category.name.toLowerCase()} articles yet`}
              description="Check back soon — we're always brewing something new for the journal."
              action={
                <Button.Link href="/blog" variant="secondary">
                  Browse the journal
                </Button.Link>
              }
            />
          )}
        </Section.Container>
      </Section.Root>
    </>
  );
}
