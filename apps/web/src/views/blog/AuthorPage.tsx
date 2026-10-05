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
    <nav aria-label="Breadcrumb" className="mb-8 text-small text-ink">
      <ol className="flex flex-wrap items-center gap-2">
        <li className="flex items-center gap-2">
          <a
            data-static-field="author-template.journal_breadcrumb_href"
            data-static-attribute="href"
            href={copy.journal_breadcrumb_href}
            className="focus-ring hover:underline"
          >
            <span data-static-field="author-template.journal_breadcrumb">{copy.journal_breadcrumb}</span>
          </a>
          <span aria-hidden="true" className="text-block">/</span>
        </li>
        <li aria-current="page" className="font-medium text-ink" data-cms-bound="authors.name">{author.name}</li>
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
    <Section.Root>
      <Section.Container className="max-w-3xl">
        <AuthorBreadcrumb author={author} />
        <div className="flex flex-col gap-6 border border-line-strong bg-surface p-6 landscape:flex-row landscape:items-start landscape:gap-8 desktop:p-8">
          <span data-cms-bound="authors.avatar">
            <Avatar.Root name={author.name} src={author.avatar?.src} size="lg" />
          </span>
          <div className="flex flex-col gap-3">
            <Typography.Title as="h1" data-cms-bound="authors.name">{author.name}</Typography.Title>
            {author.role && <p className="text-small uppercase tracking-eyebrow text-ink" data-cms-bound="authors.role">{author.role}</p>}
            {author.bio && <p className="text-body text-ink" data-cms-bound="authors.bio">{author.bio}</p>}
            {links.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-4">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      data-cms-bound="authors.socialLinks.href"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring text-small text-ink underline decoration-1 underline-offset-4 hover:no-underline"
                    >
                      <span data-cms-bound="authors.socialLinks.label">{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section.Container>

      <Section.Container className="mt-12 desktop:mt-16">
        <Section.Header
          title={<><span data-static-field="author-template.articles_by">{copy.articles_by}</span> <span data-cms-bound="authors.name">{author.name}</span></>}
        />
        {articles.length > 0 ? (
          <Grid.Root cols={3} data-cms-bound="articles.byAuthor">
            {articles.map((article) => (
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
          <EmptyState.Root
            title={<span data-static-field="author-template.no_articles_title">{copy.no_articles_title}</span>}
            description={
              <>
                <span data-cms-bound="authors.name">{author.name}</span> <span data-static-field="author-template.no_articles_description_suffix">{copy.no_articles_description_suffix}</span>
              </>
            }
          />
        )}
      </Section.Container>
    </Section.Root>
  );
}
