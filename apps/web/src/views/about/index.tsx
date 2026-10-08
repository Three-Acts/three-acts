import { elementClass } from "../../lib/design";
import copy from "@three-acts/static-content/documents/about.json";
import type { Author, Testimonial } from "@three-acts/content";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Tile } from "../../components/ui/tile";
import { Typography } from "../../components/ui/typography";

type AboutPageProps = {
  authors: Author[];
  testimonials: Testimonial[];
};

const STORY = copy.about.story_1;

const VALUE_TILES = copy.about.value_tiles_2;

const PROCESS_STEPS = copy.about.process_steps_3;

/**
 * The `/about` route: a two-column story + value-tile intro, the "how a
 * client site ships" process steps, a black "the team" band built from every
 * published author, a testimonials strip and a closing CTA row into
 * `/agencies`.
 */
export function AboutPage({ authors, testimonials }: AboutPageProps) {
  return (
    <>
      <Section.Root data-editor-id="source.index.1">
        <Section.Container data-editor-id="source.index.2">
          <Section.Header
            eyebrow={<span data-editor-base-class={""} data-editor-id="about.about.eyebrow_4" className={elementClass("about.about.eyebrow_4", "")} data-static-field="about.about.eyebrow_4">{copy.about.eyebrow_4}</span>}
            title={<span data-editor-base-class={""} data-editor-id="about.about.title_5" className={elementClass("about.about.title_5", "")} data-static-field="about.about.title_5">{copy.about.title_5}</span>}
            lede={<span data-editor-base-class={""} data-editor-id="about.about.lede_6" className={elementClass("about.about.lede_6", "")} data-static-field="about.about.lede_6">{copy.about.lede_6}</span>}
          />
          <div data-editor-base-class={"grid gap-x-gap gap-y-gap-y landscape:grid-cols-split"} data-editor-id="source.index.3" className={elementClass("source.index.3", "grid gap-x-gap gap-y-gap-y landscape:grid-cols-split")}>
            <div data-editor-base-class={"flex flex-col justify-between gap-8"} data-editor-id="source.index.4" className={elementClass("source.index.4", "flex flex-col justify-between gap-8")}>
              <Typography.Eyebrow data-editor-id="source.index.5"><span data-editor-base-class={""} data-editor-id="about.about.eyebrow_7" className={elementClass("about.about.eyebrow_7", "")} data-static-field="about.about.eyebrow_7">{copy.about.eyebrow_7}</span></Typography.Eyebrow>
              <div data-editor-base-class={"flex max-w-[640px] flex-col gap-6"} data-editor-id="source.index.6" className={elementClass("source.index.6", "flex max-w-[640px] flex-col gap-6")}>
                {STORY.map((paragraph, index) => (
                  <p data-editor-base-class={"text-body text-ink"} data-editor-id="source.index.7" key={index} className={elementClass("source.index.7", "text-body text-ink")}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
            <Grid.Root data-editor-id="source.index.8" cols={3}>
              {VALUE_TILES.map((tile) => (
                <Tile.Root key={tile.mark} mark={tile.mark} title={tile.title} description={tile.description} />
              ))}
            </Grid.Root>
          </div>
        </Section.Container>
      </Section.Root>

      <Section.Root data-editor-id="source.index.9">
        <Section.Container data-editor-id="source.index.10">
          <Section.Header eyebrow={<span data-editor-base-class={""} data-editor-id="about.about.eyebrow_8" className={elementClass("about.about.eyebrow_8", "")} data-static-field="about.about.eyebrow_8">{copy.about.eyebrow_8}</span>} title={<span data-editor-base-class={""} data-editor-id="about.about.title_9" className={elementClass("about.about.title_9", "")} data-static-field="about.about.title_9">{copy.about.title_9}</span>} />
          <div data-editor-base-class={""} data-editor-id="source.index.11" className={elementClass("source.index.11", "")}>
            {PROCESS_STEPS.map((step) => (
              <div data-editor-base-class={"grid gap-x-4 gap-y-2 border-t border-line-strong py-8 landscape:grid-cols-[120px_1fr]"} data-editor-id="source.index.12" key={step.number} className={elementClass("source.index.12", "grid gap-x-4 gap-y-2 border-t border-line-strong py-8 landscape:grid-cols-[120px_1fr]")}>
                <span data-editor-base-class={"text-h2 font-normal text-ink"} data-editor-id="source.index.13" className={elementClass("source.index.13", "text-h2 font-normal text-ink")}>{step.number}</span>
                <div data-editor-base-class={"flex flex-col gap-2"} data-editor-id="source.index.14" className={elementClass("source.index.14", "flex flex-col gap-2")}>
                  <h3 data-editor-base-class={"text-h3 font-medium text-ink"} data-editor-id="source.index.15" className={elementClass("source.index.15", "text-h3 font-medium text-ink")}>{step.title}</h3>
                  <p data-editor-base-class={"max-w-2xl text-body text-ink"} data-editor-id="source.index.16" className={elementClass("source.index.16", "max-w-2xl text-body text-ink")}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section.Container>
      </Section.Root>

      {authors.length > 0 && (
        <Section.Root data-editor-id="source.index.17" className="bg-ink text-surface">
          <Section.Container data-editor-id="source.index.18">
            <Typography.Title data-editor-id="source.index.19" className="mb-10 text-surface"><span data-editor-base-class={""} data-editor-id="about.about.title_10" className={elementClass("about.about.title_10", "")} data-static-field="about.about.title_10">{copy.about.title_10}</span></Typography.Title>
            <div data-editor-base-class={"grid gap-x-gap gap-y-gap-y landscape:grid-cols-label-grid"} data-editor-id="source.index.20" className={elementClass("source.index.20", "grid gap-x-gap gap-y-gap-y landscape:grid-cols-label-grid")}>
              <div data-editor-base-class={"flex items-baseline gap-2"} data-editor-id="source.index.21" className={elementClass("source.index.21", "flex items-baseline gap-2")}>
                <h3 data-editor-base-class={"text-h3 font-medium text-surface"} data-editor-id="source.index.22" className={elementClass("source.index.22", "text-h3 font-medium text-surface")}><span data-editor-base-class={""} data-editor-id="about.about.h3_11" className={elementClass("about.about.h3_11", "")} data-static-field="about.about.h3_11">{copy.about.h3_11}</span></h3>
                <span data-editor-base-class={"text-small text-surface"} data-editor-id="source.index.23" className={elementClass("source.index.23", "text-small text-surface")}>({authors.length})</span>
              </div>
              <div data-editor-base-class={"grid grid-cols-1 gap-x-gap gap-y-gap-y landscape:grid-cols-2 tablet:grid-cols-3"} data-editor-id="source.index.24" className={elementClass("source.index.24", "grid grid-cols-1 gap-x-gap gap-y-gap-y landscape:grid-cols-2 tablet:grid-cols-3")}>
                {authors.map((author) => (
                  <a data-editor-base-class={"focus-ring group flex flex-col items-center gap-3 border border-surface bg-surface p-6 text-center"} data-editor-id="source.index.25"
                    key={author.slug}
                    href={`/authors/${author.slug}`}
                    className={elementClass("source.index.25", "focus-ring group flex flex-col items-center gap-3 border border-surface bg-surface p-6 text-center")}
                  >
                    <Avatar.Root name={author.name} src={author.avatar?.src} size="lg" />
                    <span data-editor-base-class={"flex flex-col gap-1"} data-editor-id="source.index.26" className={elementClass("source.index.26", "flex flex-col gap-1")}>
                      <span data-editor-base-class={"text-body font-medium text-ink group-hover:underline"} data-editor-id="source.index.27" className={elementClass("source.index.27", "text-body font-medium text-ink group-hover:underline")}>{author.name}</span>
                      <span data-editor-base-class={"text-small text-ink"} data-editor-id="source.index.28" className={elementClass("source.index.28", "text-small text-ink")}>{author.role}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </Section.Container>
        </Section.Root>
      )}

      {testimonials.length > 0 && (
        <Section.Root data-editor-id="source.index.29">
          <Section.Container data-editor-id="source.index.30">
            <Section.Header align="center" eyebrow={<span data-editor-base-class={""} data-editor-id="about.about.eyebrow_12" className={elementClass("about.about.eyebrow_12", "")} data-static-field="about.about.eyebrow_12">{copy.about.eyebrow_12}</span>} title={<span data-editor-base-class={""} data-editor-id="about.about.title_13" className={elementClass("about.about.title_13", "")} data-static-field="about.about.title_13">{copy.about.title_13}</span>} />
            <Grid.Root data-editor-id="source.index.31" cols={testimonials.length >= 4 ? 4 : 3}>
              {testimonials.map((testimonial) => (
                <Card.Testimonial
                  key={testimonial.id}
                  quote={testimonial.quote}
                  customerName={testimonial.customerName}
                  customerTitle={testimonial.customerTitle}
                  company={testimonial.company}
                  avatar={testimonial.avatar}
                  rating={testimonial.rating}
                />
              ))}
            </Grid.Root>
          </Section.Container>
        </Section.Root>
      )}

      <Section.Root data-editor-id="source.index.32" className="pt-0">
        <Section.Container data-editor-id="source.index.33">
          <div data-editor-base-class={"flex flex-col gap-6 border border-line p-[30px] landscape:flex-row landscape:items-center landscape:justify-between"} data-editor-id="source.index.34" className={elementClass("source.index.34", "flex flex-col gap-6 border border-line p-[30px] landscape:flex-row landscape:items-center landscape:justify-between")}>
            <Typography.Title data-editor-id="source.index.35" as="h2"><span data-editor-base-class={""} data-editor-id="about.about.title_14" className={elementClass("about.about.title_14", "")} data-static-field="about.about.title_14">{copy.about.title_14}</span></Typography.Title>
            <Button.Link data-editor-id="about.about.href_15" data-static-field="about.about.href_15" data-static-attribute="href" href={copy.about.href_15} icon="arrow">
              <span data-editor-base-class={""} data-editor-id="about.about.link_16" className={elementClass("about.about.link_16", "")} data-static-field="about.about.link_16">{copy.about.link_16}</span></Button.Link>
          </div>
        </Section.Container>
      </Section.Root>
    </>
  );
}
