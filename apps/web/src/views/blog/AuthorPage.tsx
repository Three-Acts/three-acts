import { cmsAttributes } from "@three-acts/cms-schema";
import { elementClass } from "../../lib/design";
import type { Article, ArticleCategory, Author } from "@three-acts/content";
import copy from "@three-acts/static-content/documents/author-template.json";
import { articleMetaLine } from "../../components/blog/article-meta-line";
import { authorSocialLinks } from "../../components/blog/author-card";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Avatar } from "../../components/ui/avatar";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Typography } from "../../components/ui/typography";

function AuthorBreadcrumb({ author }: { author: Author }) {
  return (
    <nav data-editor-base-class={"mb-8 text-small text-ink"} data-editor-id="source.AuthorPage.1" aria-label="Breadcrumb" className={elementClass("source.AuthorPage.1", "mb-8 text-small text-ink")}>
      <ol data-editor-base-class={"flex flex-wrap items-center gap-2"} data-editor-id="source.AuthorPage.2" className={elementClass("source.AuthorPage.2", "flex flex-wrap items-center gap-2")}>
        <li data-editor-base-class={"flex items-center gap-2"} data-editor-id="source.AuthorPage.3" className={elementClass("source.AuthorPage.3", "flex items-center gap-2")}>
          <a data-editor-base-class={"focus-ring hover:underline"} data-editor-id="author-template.journal_breadcrumb_href"
            data-static-field="author-template.journal_breadcrumb_href"
            data-static-attribute="href"
            href={copy.journal_breadcrumb_href}
            className={elementClass("author-template.journal_breadcrumb_href", "focus-ring hover:underline")}
          >
            <span data-editor-base-class={""} data-editor-id="author-template.journal_breadcrumb" className={elementClass("author-template.journal_breadcrumb", "")} data-static-field="author-template.journal_breadcrumb">{copy.journal_breadcrumb}</span>
          </a>
          <span data-editor-base-class={"text-block"} data-editor-id="source.AuthorPage.4" aria-hidden="true" className={elementClass("source.AuthorPage.4", "text-block")}>/</span>
        </li>
        <li data-editor-base-class={"font-medium text-ink"} data-editor-id="source.AuthorPage.5" aria-current="page" className={elementClass("source.AuthorPage.5", "font-medium text-ink")} {...cmsAttributes({ collectionId: "authors", recordId: author.id, label: author.name }, "name")}>{author.name}</li>
      </ol>
    </nav>
  );
}

type AuthorPageProps = {
  author: Author;
  /** Already filtered to this author, newest first (`loadArticles()` sorts that way). */
  articles: Article[];
  categories: ArticleCategory[];
};

/** `/authors/:slug`: breadcrumb, a bordered profile module (avatar, name, role, bio, links), then a grid of the author's articles, newest first. */
export function AuthorPage({ author, articles, categories }: AuthorPageProps) {
  const links = authorSocialLinks(author);

  return (
    <Section.Root data-editor-id="source.AuthorPage.6">
      <Section.Container data-editor-id="source.AuthorPage.7" className="max-w-3xl">
        <AuthorBreadcrumb author={author} />
        <div data-editor-base-class={"flex flex-col gap-6 border border-line-strong bg-surface p-6 landscape:flex-row landscape:items-start landscape:gap-8 desktop:p-8"} data-editor-id="source.AuthorPage.8" className={elementClass("source.AuthorPage.8", "flex flex-col gap-6 border border-line-strong bg-surface p-6 landscape:flex-row landscape:items-start landscape:gap-8 desktop:p-8")}>
          <span data-editor-base-class={""} data-editor-id="source.AuthorPage.9" className={elementClass("source.AuthorPage.9", "")} {...cmsAttributes({ collectionId: "authors", recordId: author.id, label: author.name }, "avatar")}>
            <Avatar.Root name={author.name} src={author.avatar?.src} size="lg" />
          </span>
          <div data-editor-base-class={"flex flex-col gap-3"} data-editor-id="source.AuthorPage.10" className={elementClass("source.AuthorPage.10", "flex flex-col gap-3")}>
            <Typography.Title data-editor-id="source.AuthorPage.11" as="h1" {...cmsAttributes({ collectionId: "authors", recordId: author.id, label: author.name }, "name")}>{author.name}</Typography.Title>
            {author.role && <p data-editor-base-class={"text-small uppercase tracking-eyebrow text-ink"} data-editor-id="source.AuthorPage.12" className={elementClass("source.AuthorPage.12", "text-small uppercase tracking-eyebrow text-ink")} {...cmsAttributes({ collectionId: "authors", recordId: author.id, label: author.name }, "role")}>{author.role}</p>}
            {author.bio && <p data-editor-base-class={"text-body text-ink"} data-editor-id="source.AuthorPage.13" className={elementClass("source.AuthorPage.13", "text-body text-ink")} {...cmsAttributes({ collectionId: "authors", recordId: author.id, label: author.name }, "bio")}>{author.bio}</p>}
            {links.length > 0 && (
              <ul data-editor-base-class={"mt-1 flex flex-wrap gap-4"} data-editor-id="source.AuthorPage.14" className={elementClass("source.AuthorPage.14", "mt-1 flex flex-wrap gap-4")}>
                {links.map((link) => (
                  <li data-editor-base-class={""} data-editor-id="source.AuthorPage.15" className={elementClass("source.AuthorPage.15", "")} key={link.label}>
                    <a data-editor-base-class={"focus-ring text-small text-ink underline decoration-1 underline-offset-4 hover:no-underline"} data-editor-id="source.AuthorPage.16"
                      href={link.href}
                      {...cmsAttributes({ collectionId: "authors", recordId: author.id, label: author.name }, link.field)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={elementClass("source.AuthorPage.16", "focus-ring text-small text-ink underline decoration-1 underline-offset-4 hover:no-underline")}
                    >
                      <span data-editor-base-class={""} data-editor-id="source.AuthorPage.17" className={elementClass("source.AuthorPage.17", "")} {...cmsAttributes({ collectionId: "authors", recordId: author.id, label: author.name }, link.field)}>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section.Container>

      <Section.Container data-editor-id="source.AuthorPage.18" className="mt-12 desktop:mt-16">
        <Section.Header
          title={<><span data-editor-base-class={""} data-editor-id="author-template.articles_by" className={elementClass("author-template.articles_by", "")} data-static-field="author-template.articles_by">{copy.articles_by}</span> <span data-editor-base-class={""} data-editor-id="source.AuthorPage.19" className={elementClass("source.AuthorPage.19", "")} {...cmsAttributes({ collectionId: "authors", recordId: author.id, label: author.name }, "name")}>{author.name}</span></>}
        />
        {articles.length > 0 ? (
          <Grid.Root data-editor-id="source.AuthorPage.20" cols={3} data-cms-bound="articles.byAuthor">
            {articles.map((article) => (
              <Card.Article
                cmsSource={{ collectionId: "articles", recordId: article.id, label: article.title }}
                key={article.slug}
                title={article.title}
                href={`/blog/${article.slug}`}
                image={article.coverImage}
                meta={articleMetaLine(article, categories)}
              />
            ))}
          </Grid.Root>
        ) : (
          <EmptyState.Root
            title={<span data-editor-base-class={""} data-editor-id="author-template.no_articles_title" className={elementClass("author-template.no_articles_title", "")} data-static-field="author-template.no_articles_title">{copy.no_articles_title}</span>}
            description={
              <>
                <span data-editor-base-class={""} data-editor-id="source.AuthorPage.21" className={elementClass("source.AuthorPage.21", "")} {...cmsAttributes({ collectionId: "authors", recordId: author.id, label: author.name }, "name")}>{author.name}</span> <span data-editor-base-class={""} data-editor-id="author-template.no_articles_description_suffix" className={elementClass("author-template.no_articles_description_suffix", "")} data-static-field="author-template.no_articles_description_suffix">{copy.no_articles_description_suffix}</span>
              </>
            }
          />
        )}
      </Section.Container>
    </Section.Root>
  );
}
