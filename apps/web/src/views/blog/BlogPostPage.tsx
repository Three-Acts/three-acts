import type { Article, ArticleCategory, Author } from "@three-acts/content";
import type { Product } from "@three-acts/ecommerce";
import { articleMetaLine } from "../../components/blog/article-meta-line";
import { AuthorCard } from "../../components/blog/author-card";
import { Byline } from "../../components/blog/byline";
import { PiecesMentioned } from "../../components/blog/pieces-mentioned";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Badge } from "../../components/ui/badge";
import { Breadcrumb, type BreadcrumbItem } from "../../components/ui/breadcrumb";
import { Card } from "../../components/ui/card";
import { Image } from "../../components/ui/image";
import { Prose } from "../../components/ui/prose";
import { Typography } from "../../components/ui/typography";

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
  const breadcrumbItems: BreadcrumbItem[] = [{ label: "Journal", href: "/blog" }];
  if (category) {
    breadcrumbItems.push({ label: category.name, href: `/blog/category/${category.slug}` });
  }
  breadcrumbItems.push({ label: article.title });

  return (
    <>
      <article className="pb-16 pt-14 desktop:pb-20 desktop:pt-20">
        <Section.Container className="max-w-3xl">
          <Breadcrumb.Root items={breadcrumbItems} className="mb-8" />
          <header className="flex flex-col gap-6">
            {category && <Badge.Root variant="outline">{category.name}</Badge.Root>}
            <Typography.Display as="h1" className="max-w-3xl">
              {article.title}
            </Typography.Display>
            <Typography.Lede className="max-w-none">{article.excerpt}</Typography.Lede>
            <Byline author={author} publishedAt={article.publishedAt} readingTime={article.readingTime} avatarSize="md" />
          </header>
        </Section.Container>

        {article.coverImage && (
          <Section.Container className="mt-12 desktop:mt-16">
            <span className="block aspect-hero w-full overflow-hidden bg-block">
              <Image
                src={article.coverImage.src}
                alt={article.coverImage.alt || article.title}
                width={article.coverImage.width ?? 1318}
                height={article.coverImage.height ?? 608}
                loading="eager"
                className="size-full object-cover"
              />
            </span>
          </Section.Container>
        )}

        <Section.Container className="mt-12 max-w-3xl desktop:mt-16">
          <Prose.Root body={article.body} />
          {article.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2">
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
          <AuthorCard.Root author={author} />
        </Section.Container>
      )}

      {shopProducts.length > 0 && (
        <Section.Root className="border-t border-line-strong">
          <Section.Container>
            <PiecesMentioned products={shopProducts} />
          </Section.Container>
        </Section.Root>
      )}

      {related.length > 0 && (
        <Section.Root>
          <Section.Container>
            <Section.Header eyebrow="Keep reading" title="More from the journal" />
            <Grid.Root cols={3}>
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
