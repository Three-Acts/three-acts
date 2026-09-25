import type { Article } from "@three-acts/content";
import { Section } from "../layout/section";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Typography } from "../ui/typography";

type JournalSectionProps = {
  /** Already selected/ordered by the caller — featured then latest, up to 3. */
  articles: Article[];
};

/** The black "From the journal" band: a label-grid split (label + count / 3-up inverse cards) and a bordered CTA row. */
export function JournalSection({ articles }: JournalSectionProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <Section.Root className="bg-ink text-surface">
      <Section.Container>
        <Typography.Title className="mb-10 text-surface">From the journal</Typography.Title>

        <div className="grid gap-x-gap gap-y-gap-y landscape:grid-cols-label-grid">
          <div className="flex items-baseline gap-2">
            <h3 className="text-h3 font-medium text-surface">Latest</h3>
            <span className="text-small text-surface">({articles.length})</span>
          </div>
          <div className="grid grid-cols-1 gap-x-gap gap-y-gap-y landscape:grid-cols-2 tablet:grid-cols-3">
            {articles.map((article) => (
              <Card.Article
                key={article.slug}
                inverse
                title={article.title}
                href={`/blog/${article.slug}`}
                image={article.coverImage}
                meta={`${article.readingTime} min read`}
              />
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-6 border border-line-strong bg-surface p-6 landscape:flex-row landscape:items-center landscape:justify-between">
          <p className="text-h3 font-medium text-ink">Read the journal</p>
          <Button.Link href="/blog" variant="primary">
            Read the journal
          </Button.Link>
        </div>
      </Section.Container>
    </Section.Root>
  );
}
