import type { Article, ArticleCategory, Author } from "@three-acts/content";
import { articleMetaLine } from "../../components/blog/article-meta-line";
import { authorSocialLinks } from "../../components/blog/author-card";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Avatar } from "../../components/ui/avatar";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Typography } from "../../components/ui/typography";

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
        <Breadcrumb.Root items={[{ label: "Journal", href: "/blog" }, { label: author.name }]} className="mb-8" />
        <div className="flex flex-col gap-6 border border-line-strong bg-surface p-6 landscape:flex-row landscape:items-start landscape:gap-8 desktop:p-8">
          <Avatar.Root name={author.name} src={author.avatar?.src} size="lg" />
          <div className="flex flex-col gap-3">
            <Typography.Title as="h1">{author.name}</Typography.Title>
            {author.role && <p className="text-small uppercase tracking-eyebrow text-ink">{author.role}</p>}
            {author.bio && <p className="text-body text-ink">{author.bio}</p>}
            {links.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-4">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring text-small text-ink underline decoration-1 underline-offset-4 hover:no-underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section.Container>

      <Section.Container className="mt-12 desktop:mt-16">
        <Section.Header title={`Articles by ${author.name}`} />
        {articles.length > 0 ? (
          <Grid.Root cols={3}>
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
          <EmptyState.Root title="No articles yet" description={`${author.name} hasn't published anything on the journal yet.`} />
        )}
      </Section.Container>
    </Section.Root>
  );
}
