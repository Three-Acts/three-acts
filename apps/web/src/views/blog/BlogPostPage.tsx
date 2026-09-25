import type { Article, ArticleCategory, Author } from "@three-acts/content";
import type { Product } from "@three-acts/ecommerce";
import { articleMetaLine } from "../../components/blog/article-meta-line";
import { AuthorCard } from "../../components/blog/author-card";
import { Byline } from "../../components/blog/byline";
import { ShopTheBrew } from "../../components/blog/shop-the-brew";
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
 * `/blog/:slug`: breadcrumb, header (category, title, excerpt lede, byline),
 * cover image, prose body, tags, an author card, a "Shop the brew" strip
 * (omitted when the body links no products), and "Keep reading".
 */
export function BlogPostPage({ article, author, category, categories, related, shopProducts }: BlogPostPageProps) {
  const breadcrumbItems: BreadcrumbItem[] = [{ label: "Journal", href: "/blog" }];
  if (category) {
    breadcrumbItems.push({ label: category.name, href: `/blog/category/${category.slug}` });
  }
  breadcrumbItems.push({ label: article.title });

  return (
    <>
      <article>
        <Section.Container className="max-w-prose pb-0 pt-10">
          <Breadcrumb.Root items={breadcrumbItems} className="mb-8" />
          <header className="flex flex-col gap-6">
            {category && <Badge.Root tone="accent">{category.name}</Badge.Root>}
            <Typography.Display as="h1" className="text-4xl landscape:text-5xl">
              {article.title}
            </Typography.Display>
            <Typography.Lede className="max-w-none text-xl">{article.excerpt}</Typography.Lede>
            <Byline author={author} publishedAt={article.publishedAt} readingTime={article.readingTime} avatarSize="md" />
          </header>
        </Section.Container>

        {article.coverImage && (
          <Section.Container className="py-10">
            <Image
              src={article.coverImage.src}
              alt={article.coverImage.alt || article.title}
              width={article.coverImage.width ?? 1600}
              height={article.coverImage.height ?? 900}
              loading="eager"
              className="w-full border border-line object-cover"
            />
          </Section.Container>
        )}

        <Section.Container className="max-w-prose py-10">
          <Prose.Root body={article.body} />
          {article.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <li key={tag}>
                  <Badge.Root>{tag}</Badge.Root>
                </li>
              ))}
            </ul>
          )}
        </Section.Container>
      </article>

      {author && (
        <Section.Container className="max-w-prose pb-16">
          <AuthorCard.Root author={author} />
        </Section.Container>
      )}

      {shopProducts.length > 0 && (
        <Section.Root className="border-t-2 border-line bg-surface-raised">
          <Section.Container>
            <ShopTheBrew products={shopProducts} />
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
                  excerpt={relatedArticle.excerpt}
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
