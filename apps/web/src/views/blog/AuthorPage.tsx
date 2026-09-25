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

/** `/authors/:slug`: profile header (avatar, role, bio, social links) and a grid of the author's articles, newest first. */
export function AuthorPage({ author, articles, categories }: AuthorPageProps) {
  const links = authorSocialLinks(author);

  return (
    <>
      <Section.Container className="max-w-3xl pb-10 pt-14 desktop:pt-20">
        <Breadcrumb.Root items={[{ label: "Journal", href: "/blog" }, { label: author.name }]} className="mb-8" />
        <div className="flex flex-col items-start gap-6 landscape:flex-row landscape:items-center">
          <Avatar.Root name={author.name} src={author.avatar?.src} size="lg" className="size-24 text-2xl" />
          <div className="flex flex-col gap-2">
            <Typography.Display as="h1" className="text-4xl landscape:text-5xl">
              {author.name}
            </Typography.Display>
            {author.role && <p className="text-sm font-semibold uppercase tracking-eyebrow text-moss">{author.role}</p>}
          </div>
        </div>
        {author.bio && <p className="mt-8 text-lg leading-8 text-muted">{author.bio}</p>}
        {links.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-5">
            {links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring text-sm font-semibold text-ink hover:text-accent"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section.Container>

      <Section.Root className="pt-0">
        <Section.Container>
          <Section.Header title={`Articles by ${author.name}`} />
          {articles.length > 0 ? (
            <Grid.Root cols={3}>
              {articles.map((article) => (
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
          ) : (
            <EmptyState.Root title="No articles yet" description={`${author.name} hasn't published anything on the journal yet.`} />
          )}
        </Section.Container>
      </Section.Root>
    </>
  );
}
