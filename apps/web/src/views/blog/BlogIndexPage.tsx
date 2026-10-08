import { elementClass } from "../../lib/design";
import type { Article, ArticleCategory, Author } from "@three-acts/content";
import { cn } from "@three-acts/utils";
import { articleMetaLine } from "../../components/blog/article-meta-line";
import { Byline } from "../../components/blog/byline";
import { CategoryNav } from "../../components/blog/category-nav";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Image } from "../../components/ui/image";
import { Typography } from "../../components/ui/typography";

type BlogIndexPageProps = {
  articles: Article[];
  categories: ArticleCategory[];
  authors: Author[];
};

function countByCategory(articles: readonly Article[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const article of articles) {
    counts[article.categorySlug] = (counts[article.categorySlug] ?? 0) + 1;
  }
  return counts;
}

type LeadArticleProps = {
  article: Article;
  author?: Author;
  categories: ArticleCategory[];
  className?: string;
};

/** The lead card at the top of the journal: a 2-column black-bordered module, `aspect-card` cover left, meta/title/excerpt/byline right. */
function LeadArticle({ article, author, categories, className }: LeadArticleProps) {
  return (
    <article data-editor-base-class={cn("grid border border-line-strong bg-surface landscape:grid-cols-2", className)} data-editor-id="source.BlogIndexPage.1" className={elementClass("source.BlogIndexPage.1", cn("grid border border-line-strong bg-surface landscape:grid-cols-2", className))}>
      <a data-editor-base-class={"focus-ring block aspect-card w-full overflow-hidden bg-block"} data-editor-id="source.BlogIndexPage.2" href={`/blog/${article.slug}`} className={elementClass("source.BlogIndexPage.2", "focus-ring block aspect-card w-full overflow-hidden bg-block")}>
        {article.coverImage && (
          <Image
            src={article.coverImage.src}
            alt={article.coverImage.alt || article.title}
            width={article.coverImage.width ?? 800}
            height={article.coverImage.height ?? 1000}
            loading="eager"
            className="size-full object-cover"
          />
        )}
      </a>
      <div data-editor-base-class={"flex flex-col justify-center gap-4 p-6 desktop:p-8"} data-editor-id="source.BlogIndexPage.3" className={elementClass("source.BlogIndexPage.3", "flex flex-col justify-center gap-4 p-6 desktop:p-8")}>
        <span data-editor-base-class={"text-small text-ink"} data-editor-id="source.BlogIndexPage.4" className={elementClass("source.BlogIndexPage.4", "text-small text-ink")}>{articleMetaLine(article, categories)}</span>
        <a data-editor-base-class={"focus-ring"} data-editor-id="source.BlogIndexPage.5" href={`/blog/${article.slug}`} className={elementClass("source.BlogIndexPage.5", "focus-ring")}>
          <Typography.Title data-editor-id="source.BlogIndexPage.6" as="h2" className="hover:underline">
            {article.title}
          </Typography.Title>
        </a>
        <p data-editor-base-class={"text-body text-ink"} data-editor-id="source.BlogIndexPage.7" className={elementClass("source.BlogIndexPage.7", "text-body text-ink")}>{article.excerpt}</p>
        <Byline author={author} publishedAt={article.publishedAt} readingTime={article.readingTime} />
      </div>
    </article>
  );
}

/**
 * `/blog`: a section header ("Journal" → "Notes from the team" → lede), the
 * category filter strip, an editorial lead module (first `featured` article,
 * else the newest), and a 3-up grid of the rest, newest first
 * (`loadArticles()` already sorts that way — see `@three-acts/content`'s
 * `sortArticles`).
 */
export function BlogIndexPage({ articles, categories, authors }: BlogIndexPageProps) {
  const authorMap = new Map(authors.map((author) => [author.slug, author]));
  const counts = countByCategory(articles);
  const featured = articles.find((article) => article.featured) ?? articles[0];
  const rest = featured ? articles.filter((article) => article.slug !== featured.slug) : articles;

  return (
    <Section.Root data-editor-id="source.BlogIndexPage.8">
      <Section.Container data-editor-id="source.BlogIndexPage.9">
        <Section.Header
          eyebrow="Journal"
          title="Notes from the team"
          lede="Guides, architecture notes, design-system posts and release notes from the people building Three Acts."
        />
        <CategoryNav categories={categories} counts={counts} totalCount={articles.length} className="mb-12 desktop:mb-16" />

        {featured && (
          <LeadArticle
            article={featured}
            author={authorMap.get(featured.authorSlug)}
            categories={categories}
            className="mb-12 desktop:mb-16"
          />
        )}

        {rest.length > 0 ? (
          <Grid.Root data-editor-id="source.BlogIndexPage.10" cols={3}>
            {rest.map((article) => (
              <Card.Article
                key={article.slug}
                title={article.title}
                href={`/blog/${article.slug}`}
                image={article.coverImage}
                meta={articleMetaLine(article, categories)}
              />
            ))}
          </Grid.Root>
        ) : (
          !featured && <EmptyState.Root title="No articles yet" description="Check back soon — new articles are on the way." />
        )}
      </Section.Container>
    </Section.Root>
  );
}
