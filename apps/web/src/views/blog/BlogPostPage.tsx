import type { Article, ArticleCategory, Author } from "@three-acts/content";
import type { Product } from "@three-acts/ecommerce";
import copy from "@three-acts/static-content/documents/article-template.json";
import { articleMetaLine } from "../../components/blog/article-meta-line";
import { AuthorCard } from "../../components/blog/author-card";
import { Byline } from "../../components/blog/byline";
import { PiecesMentioned } from "../../components/blog/pieces-mentioned";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { Image } from "../../components/ui/image";
import { Prose } from "../../components/ui/prose";
import { Typography } from "../../components/ui/typography";

function PostBreadcrumb({ article, category }: { article: Article; category?: ArticleCategory }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8 text-small text-ink">
      <ol className="flex flex-wrap items-center gap-2">
        <li className="flex items-center gap-2">
          <a
            data-static-field="article-template.journal_breadcrumb_href"
            data-static-attribute="href"
            href={copy.journal_breadcrumb_href}
            className="focus-ring hover:underline"
          >
            <span data-static-field="article-template.journal_breadcrumb">{copy.journal_breadcrumb}</span>
          </a>
          <span aria-hidden="true" className="text-block">/</span>
        </li>
        {category && (
          <li className="flex items-center gap-2">
            <a
              href={`/blog/category/${category.slug}`}
              data-cms-bound="articleCategories.slug"
              className="focus-ring hover:underline"
            >
              <span data-cms-bound="articleCategories.name">{category.name}</span>
            </a>
            <span aria-hidden="true" className="text-block">/</span>
          </li>
        )}
        <li aria-current="page" className="font-medium text-ink" data-cms-bound="articles.title">{article.title}</li>
      </ol>
    </nav>
  );
}

type BlogPostPageProps = {
  article: Article;
  author?: Author;
  category?: ArticleCategory;
  /** Every journal category, for related-article meta lines. */
  categories: ArticleCategory[];
  /** `relatedArticles(article, all, 3)` — same category first, then tag overlap. */
  related: Article[];
  /** Products referenced by the article body's `/shop/<slug>` links, already resolved and capped at 3. */
  shopProducts: Product[];
};

/**
 * `/blog/:slug`: breadcrumb, header (category badge, title, excerpt lede,
 * byline row), cover image, prose body, tags, an author module, a "Pieces
 * mentioned" strip (omitted when the body links no products), and "Keep
 * reading".
 */
export function BlogPostPage({ article, author, category, categories, related, shopProducts }: BlogPostPageProps) {
  return (
    <>
      <article className="pb-16 pt-14 desktop:pb-20 desktop:pt-20">
        <Section.Container className="max-w-3xl">
          <PostBreadcrumb article={article} category={category} />
          <header className="flex flex-col gap-6">
            {category && <Badge.Root variant="outline"><span data-cms-bound="articleCategories.name">{category.name}</span></Badge.Root>}
            <Typography.Display as="h1" className="max-w-3xl" data-cms-bound="articles.title">
              {article.title}
            </Typography.Display>
            <Typography.Lede className="max-w-none" data-cms-bound="articles.excerpt">{article.excerpt}</Typography.Lede>
            <Byline data-cms-bound="articles.byline" author={author} publishedAt={article.publishedAt} readingTime={article.readingTime} avatarSize="md" />
          </header>
        </Section.Container>

        {article.coverImage && (
          <Section.Container className="mt-12 desktop:mt-16">
            <span className="block aspect-hero w-full overflow-hidden bg-block">
              <Image
                src={article.coverImage.src}
                alt={article.coverImage.alt || article.title}
                data-cms-bound="articles.coverImage"
                width={article.coverImage.width ?? 1318}
                height={article.coverImage.height ?? 608}
                loading="eager"
                className="size-full object-cover"
              />
            </span>
          </Section.Container>
        )}

        <Section.Container className="mt-12 max-w-3xl desktop:mt-16">
          <Prose.Root body={article.body} data-cms-bound="articles.body" />
          {article.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2" data-cms-bound="articles.tags">
              {article.tags.map((tag) => (
                <li key={tag}>
                  <Badge.Root variant="outline">{tag}</Badge.Root>
                </li>
              ))}
            </ul>
          )}
        </Section.Container>
      </article>

      {author && (
        <Section.Container className="max-w-3xl pb-16 desktop:pb-20">
          <AuthorCard.Root data-cms-bound="authors.profile" author={author} />
        </Section.Container>
      )}

      {shopProducts.length > 0 && (
        <Section.Root className="border-t border-line-strong">
          <Section.Container>
            <div data-cms-bound="products.mentioned">
              <PiecesMentioned products={shopProducts} />
            </div>
          </Section.Container>
        </Section.Root>
      )}

      {related.length > 0 && (
        <Section.Root>
          <Section.Container>
            <Section.Header
              eyebrow={<span data-static-field="article-template.keep_reading">{copy.keep_reading}</span>}
              title={<span data-static-field="article-template.more_from_journal">{copy.more_from_journal}</span>}
            />
            <Grid.Root cols={3} data-cms-bound="articles.related">
              {related.map((relatedArticle) => (
                <Card.Article
                  key={relatedArticle.slug}
                  title={relatedArticle.title}
                  href={`/blog/${relatedArticle.slug}`}
                  image={relatedArticle.coverImage}
                  meta={articleMetaLine(relatedArticle, categories)}
                />
              ))}
            </Grid.Root>
          </Section.Container>
        </Section.Root>
      )}
    </>
  );
}
