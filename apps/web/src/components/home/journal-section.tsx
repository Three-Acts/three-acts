import { elementClass } from "../../lib/design";
import { defaultSectionScope, type HomeSectionScopeProps } from "./section-scope";
import type { Article } from "@three-acts/content";
import { Section } from "../layout/section";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Typography } from "../ui/typography";

type JournalSectionProps = HomeSectionScopeProps & {
  /** Already selected/ordered by the caller — featured then latest, up to 3. */
  articles: Article[];
};

/** The black "From the journal" band: a label-grid split (label + count / 3-up inverse cards) and a bordered CTA row. */
export function JournalSection({ articles, composition }: JournalSectionProps) {
  const { copy, id, field } = composition ?? defaultSectionScope;
  if (articles.length === 0) {
    return null;
  }

  return (
    <Section.Root data-editor-id={id("source.journal-section.1")} className="bg-ink text-surface">
      <Section.Container data-editor-id={id("source.journal-section.2")}>
        <Typography.Title data-editor-id={id("source.journal-section.3")} className="mb-10 text-surface"><span data-editor-base-class={""} data-editor-id={id("home.journal_section.title_1")} className={elementClass(id("home.journal_section.title_1"), "")} data-static-field={field("home.journal_section.title_1")}>{copy.journal_section.title_1}</span></Typography.Title>

        <div data-editor-base-class={"grid gap-x-gap gap-y-gap-y landscape:grid-cols-label-grid"} data-editor-id={id("source.journal-section.4")} className={elementClass(id("source.journal-section.4"), "grid gap-x-gap gap-y-gap-y landscape:grid-cols-label-grid")}>
          <div data-editor-base-class={"flex items-baseline gap-2"} data-editor-id={id("source.journal-section.5")} className={elementClass(id("source.journal-section.5"), "flex items-baseline gap-2")}>
            <h3 data-editor-base-class={"text-h3 font-medium text-surface"} data-editor-id={id("source.journal-section.6")} className={elementClass(id("source.journal-section.6"), "text-h3 font-medium text-surface")}><span data-editor-base-class={""} data-editor-id={id("home.journal_section.h3_2")} className={elementClass(id("home.journal_section.h3_2"), "")} data-static-field={field("home.journal_section.h3_2")}>{copy.journal_section.h3_2}</span></h3>
            <span data-editor-base-class={"text-small text-surface"} data-editor-id={id("source.journal-section.7")} className={elementClass(id("source.journal-section.7"), "text-small text-surface")}>({articles.length})</span>
          </div>
          <div data-editor-base-class={"grid grid-cols-1 gap-x-gap gap-y-gap-y landscape:grid-cols-2 tablet:grid-cols-3"} data-editor-id={id("source.journal-section.8")} className={elementClass(id("source.journal-section.8"), "grid grid-cols-1 gap-x-gap gap-y-gap-y landscape:grid-cols-2 tablet:grid-cols-3")}>
            {articles.map((article) => (
              <Card.Article
                cmsSource={{ collectionId: "articles", recordId: article.id, label: article.title }}
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

        <div data-editor-base-class={"mt-10 flex flex-col items-start gap-6 border border-line-strong bg-surface p-6 landscape:flex-row landscape:items-center landscape:justify-between"} data-editor-id={id("source.journal-section.9")} className={elementClass(id("source.journal-section.9"), "mt-10 flex flex-col items-start gap-6 border border-line-strong bg-surface p-6 landscape:flex-row landscape:items-center landscape:justify-between")}>
          <p data-editor-base-class={"text-h3 font-medium text-ink"} data-editor-id={id("source.journal-section.10")} className={elementClass(id("source.journal-section.10"), "text-h3 font-medium text-ink")}><span data-editor-base-class={""} data-editor-id={id("home.journal_section.p_3")} className={elementClass(id("home.journal_section.p_3"), "")} data-static-field={field("home.journal_section.p_3")}>{copy.journal_section.p_3}</span></p>
          <Button.Link data-editor-id={id("home.journal_section.href_4")} data-static-field={field("home.journal_section.href_4")} data-static-attribute="href" href={copy.journal_section.href_4} variant="primary">
            <span data-editor-base-class={""} data-editor-id={id("home.journal_section.link_5")} className={elementClass(id("home.journal_section.link_5"), "")} data-static-field={field("home.journal_section.link_5")}>{copy.journal_section.link_5}</span></Button.Link>
        </div>
      </Section.Container>
    </Section.Root>
  );
}
