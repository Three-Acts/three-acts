import { cmsAttributes } from "@three-acts/cms-schema";
import { elementClass } from "../../lib/design";
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
    <nav data-editor-base-class={"mb-8 text-small text-ink"} data-editor-id="source.BlogPostPage.1" aria-label="Breadcrumb" className={elementClass("source.BlogPostPage.1", "mb-8 text-small text-ink")}>
      <ol data-editor-base-class={"flex flex-wrap items-center gap-2"} data-editor-id="source.BlogPostPage.2" className={elementClass("source.BlogPostPage.2", "flex flex-wrap items-center gap-2")}>
        <li data-editor-base-class={"flex items-center gap-2"} data-editor-id="source.BlogPostPage.3" className={elementClass("source.BlogPostPage.3", "flex items-center gap-2")}>
          <a data-editor-base-class={"focus-ring hover:underline"} data-editor-id="article-template.journal_breadcrumb_href"
            data-static-field="article-template.journal_breadcrumb_href"
            data-static-attribute="href"
            href={copy.journal_breadcrumb_href}
            className={elementClass("article-template.journal_breadcrumb_href", "focus-ring hover:underline")}
          >
            <span data-editor-base-class={""} data-editor-id="article-template.journal_breadcrumb" className={elementClass("article-template.journal_breadcrumb", "")} data-static-field="article-template.journal_breadcrumb">{copy.journal_breadcrumb}</span>
          </a>
          <span data-editor-base-class={"text-block"} data-editor-id="source.BlogPostPage.4" aria-hidden="true" className={elementClass("source.BlogPostPage.4", "text-block")}>/</span>
        </li>
        {category && (
          <li data-editor-base-class={"flex items-center gap-2"} data-editor-id="source.BlogPostPage.5" className={elementClass("source.BlogPostPage.5", "flex items-center gap-2")}>
            <a data-editor-base-class={"focus-ring hover:underline"} data-editor-id="source.BlogPostPage.6"
              href={`/blog/category/${category.slug}`}
              {...cmsAttributes({ collectionId: "article-categories", recordId: category.id, label: category.name }, "slug")}
              className={elementClass("source.BlogPostPage.6", "focus-ring hover:underline")}
            >
              <span data-editor-base-class={""} data-editor-id="source.BlogPostPage.7" className={elementClass("source.BlogPostPage.7", "")} {...cmsAttributes({ collectionId: "article-categories", recordId: category.id, label: category.name }, "name")}>{category.name}</span>
            </a>
            <span data-editor-base-class={"text-block"} data-editor-id="source.BlogPostPage.8" aria-hidden="true" className={elementClass("source.BlogPostPage.8", "text-block")}>/</span>
          </li>
        )}
        <li data-editor-base-class={"font-medium text-ink"} data-editor-id="source.BlogPostPage.9" aria-current="page" className={elementClass("source.BlogPostPage.9", "font-medium text-ink")} {...cmsAttributes({ collectionId: "articles", recordId: article.id, label: article.title }, "title")}>{article.title}</li>
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
      <article data-editor-base-class={"pb-16 pt-14 desktop:pb-20 desktop:pt-20"} data-editor-id="source.BlogPostPage.10" className={elementClass("source.BlogPostPage.10", "pb-16 pt-14 desktop:pb-20 desktop:pt-20")}>
        <Section.Container data-editor-id="source.BlogPostPage.11" className="max-w-3xl">
          <PostBreadcrumb article={article} category={category} />
          <header data-editor-base-class={"flex flex-col gap-6"} data-editor-id="source.BlogPostPage.12" className={elementClass("source.BlogPostPage.12", "flex flex-col gap-6")}>
            {category && <Badge.Root variant="outline"><span data-editor-base-class={""} data-editor-id="source.BlogPostPage.13" className={elementClass("source.BlogPostPage.13", "")} {...cmsAttributes({ collectionId: "article-categories", recordId: category.id, label: category.name }, "name")}>{category.name}</span></Badge.Root>}
            <Typography.Display data-editor-id="source.BlogPostPage.14" as="h1" className="max-w-3xl" {...cmsAttributes({ collectionId: "articles", recordId: article.id, label: article.title }, "title")}>
              {article.title}
            </Typography.Display>
            <Typography.Lede data-editor-id="source.BlogPostPage.15" className="max-w-none" {...cmsAttributes({ collectionId: "articles", recordId: article.id, label: article.title }, "excerpt")}>{article.excerpt}</Typography.Lede>
            <Byline articleSource={{ collectionId: "articles", recordId: article.id, label: article.title }} data-cms-bound="articles.byline" author={author} publishedAt={article.publishedAt} readingTime={article.readingTime} avatarSize="md" />
          </header>
        </Section.Container>

        {article.coverImage && (
          <Section.Container data-editor-id="source.BlogPostPage.16" className="mt-12 desktop:mt-16">
            <span data-editor-base-class={"block aspect-hero w-full overflow-hidden bg-block"} data-editor-id="source.BlogPostPage.17" className={elementClass("source.BlogPostPage.17", "block aspect-hero w-full overflow-hidden bg-block")}>
              <Image
                src={article.coverImage.src}
                alt={article.coverImage.alt || article.title}
                {...cmsAttributes({ collectionId: "articles", recordId: article.id, label: article.title }, "coverImage")}
                width={article.coverImage.width ?? 1318}
                height={article.coverImage.height ?? 608}
                loading="eager"
                className="size-full object-cover"
              />
            </span>
          </Section.Container>
        )}

        <Section.Container data-editor-id="source.BlogPostPage.18" className="mt-12 max-w-3xl desktop:mt-16">
          <Prose.Root body={article.body} {...cmsAttributes({ collectionId: "articles", recordId: article.id, label: article.title }, "body")} />
          {article.tags.length > 0 && (
            <ul data-editor-base-class={"mt-10 flex flex-wrap gap-2"} data-editor-id="source.BlogPostPage.19" className={elementClass("source.BlogPostPage.19", "mt-10 flex flex-wrap gap-2")} {...cmsAttributes({ collectionId: "articles", recordId: article.id, label: article.title }, "tags")}>
              {article.tags.map((tag) => (
                <li data-editor-base-class={""} data-editor-id="source.BlogPostPage.20" className={elementClass("source.BlogPostPage.20", "")} key={tag}>
                  <Badge.Root variant="outline">{tag}</Badge.Root>
                </li>
              ))}
            </ul>
          )}
        </Section.Container>
      </article>

      {author && (
        <Section.Container data-editor-id="source.BlogPostPage.21" className="max-w-3xl pb-16 desktop:pb-20">
          <AuthorCard.Root data-cms-bound="authors.profile" author={author} />
        </Section.Container>
      )}

      {shopProducts.length > 0 && (
        <Section.Root data-editor-id="source.BlogPostPage.22" className="border-t border-line-strong">
          <Section.Container data-editor-id="source.BlogPostPage.23">
            <div data-editor-base-class={""} data-editor-id="source.BlogPostPage.24" className={elementClass("source.BlogPostPage.24", "")} data-cms-bound="products.mentioned">
              <PiecesMentioned products={shopProducts} />
            </div>
          </Section.Container>
        </Section.Root>
      )}

      {related.length > 0 && (
        <Section.Root data-editor-id="source.BlogPostPage.25">
          <Section.Container data-editor-id="source.BlogPostPage.26">
            <Section.Header
              eyebrow={<span data-editor-base-class={""} data-editor-id="article-template.keep_reading" className={elementClass("article-template.keep_reading", "")} data-static-field="article-template.keep_reading">{copy.keep_reading}</span>}
              title={<span data-editor-base-class={""} data-editor-id="article-template.more_from_journal" className={elementClass("article-template.more_from_journal", "")} data-static-field="article-template.more_from_journal">{copy.more_from_journal}</span>}
            />
            <Grid.Root data-editor-id="source.BlogPostPage.27" cols={3} data-cms-bound="articles.related">
              {related.map((relatedArticle) => (
                <Card.Article
                  cmsSource={{ collectionId: "articles", recordId: relatedArticle.id, label: relatedArticle.title }}
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
