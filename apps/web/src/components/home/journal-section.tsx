import type { Article } from "@three-acts/content";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type JournalSectionProps = {
  /** Already selected/ordered by the caller — featured then latest, up to 3. */
  articles: Article[];
};

/** "From the journal" — the latest/featured brewing guides and roastery news. */
export function JournalSection({ articles }: JournalSectionProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <Section.Root className="bg-surface-raised">
      <Section.Container>
        <Section.Header
          eyebrow="The journal"
          title="From the journal"
          lede="Brewing guides, origin notes and roastery news."
          action={
            <Button.Link href="/blog" variant="ghost">
              Read the journal →
            </Button.Link>
          }
        />
        <Grid.Root cols={3}>
          {articles.map((article) => (
            <Card.Article
              key={article.slug}
              title={article.title}
              href={`/blog/${article.slug}`}
              image={article.coverImage}
              excerpt={article.excerpt}
              meta={`${article.readingTime} min read`}
            />
          ))}
        </Grid.Root>
      </Section.Container>
    </Section.Root>
  );
}
