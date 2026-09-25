import type { Article, ArticleCategory, Author } from "@three-acts/content";
import { articleMetaLine } from "../../components/blog/article-meta-line";
import { Byline } from "../../components/blog/byline";
import { CategoryNav } from "../../components/blog/category-nav";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Badge } from "../../components/ui/badge";
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

type FeaturedArticleProps = {
  article: Article;
  author?: Author;
  category?: ArticleCategory;
};

/** The large lead card at the top of the journal: cover, category badge, reading time, and the author byline. */
function FeaturedArticle({ article, author, category }: FeaturedArticleProps) {
  return (
    <article className="grid overflow-hidden border border-line bg-surface-raised landscape:grid-cols-2">
      <a href={`/blog/${article.slug}`} className="focus-ring group relative block aspect-[16/10] overflow-hidden bg-ink landscape:aspect-auto">
        {article.coverImage && (
          <Image
            src={article.coverImage.src}
            alt={article.coverImage.alt || article.title}
            width={article.coverImage.width ?? 1200}
            height={article.coverImage.height ?? 750}
            loading="eager"
            className="size-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
          />
        )}
      </a>
      <div className="flex flex-col justify-center gap-5 p-8 landscape:p-12">
        <div className="flex flex-wrap items-center gap-3">
          {category && <Badge.Root tone="accent">{category.name}</Badge.Root>}
          <span className="text-xs font-semibold uppercase tracking-eyebrow text-muted">{article.readingTime} min read</span>
        </div>
        <a href={`/blog/${article.slug}`} className="focus-ring">
          <Typography.Title as="h2" className="text-3xl landscape:text-4xl">
            {article.title}
          </Typography.Title>
        </a>
        <p className="text-lg leading-8 text-muted">{article.excerpt}</p>
        <Byline author={author} publishedAt={article.publishedAt} avatarSize="md" />
      </div>
    </article>
  );
}

/**
 * `/blog`: an editorial lead card (first `featured` article, else the newest)
 * above a category filter strip and a 3-up grid of the rest, newest first
 * (`loadArticles()` already sorts that way — see `@three-acts/content`'s
 * `sortArticles`).
 */
export function BlogIndexPage({ articles, categories, authors }: BlogIndexPageProps) {
  const authorMap = new Map(authors.map((author) => [author.slug, author]));
  const categoryMap = new Map(categories.map((category) => [category.slug, category]));
  const counts = countByCategory(articles);
  const featured = articles.find((article) => article.featured) ?? articles[0];
  const rest = featured ? articles.filter((article) => article.slug !== featured.slug) : articles;

  return (
    <>
      <Section.Container className="pb-10 pt-14 desktop:pt-20">
        <Typography.Eyebrow className="mb-5">The journal</Typography.Eyebrow>
        <Typography.Display>Field notes from the roastery.</Typography.Display>
        <Typography.Lede className="mt-6">
          Brew guides, origin trips and roastery news from the people who roast, buy and pour your coffee.
        </Typography.Lede>
        <CategoryNav categories={categories} counts={counts} totalCount={articles.length} className="mt-10" />
      </Section.Container>

      {featured && (
        <Section.Container className="pb-16 desktop:pb-20">
          <FeaturedArticle article={featured} author={authorMap.get(featured.authorSlug)} category={categoryMap.get(featured.categorySlug)} />
        </Section.Container>
      )}

      <Section.Root className="pt-0">
        <Section.Container>
          {rest.length > 0 ? (
            <>
              <Section.Header eyebrow="Latest" title="More from the journal" />
              <Grid.Root cols={3}>
                {rest.map((article) => (
                  <Card.Article
                    key={article.slug}
                    title={article.title}
                    href={`/blog/${article.slug}`}
                    image={article.coverImage}
                    excerpt={article.excerpt}
                    meta={articleMetaLine(article, categories)}
                  />
                ))}
              </Grid.Root>
            </>
          ) : (
            <EmptyState.Root title="No articles yet" description="Check back soon — we're always brewing something new for the journal." />
          )}
        </Section.Container>
      </Section.Root>
    </>
  );
}
