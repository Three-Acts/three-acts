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
      <Section.Root>
        <Section.Container>
          <Section.Header
            eyebrow={<span data-static-field="about.about.eyebrow_4">{copy.about.eyebrow_4}</span>}
            title={<span data-static-field="about.about.title_5">{copy.about.title_5}</span>}
            lede={<span data-static-field="about.about.lede_6">{copy.about.lede_6}</span>}
          />
          <div className="grid gap-x-gap gap-y-gap-y landscape:grid-cols-split">
            <div className="flex flex-col justify-between gap-8">
              <Typography.Eyebrow><span data-static-field="about.about.eyebrow_7">{copy.about.eyebrow_7}</span></Typography.Eyebrow>
              <div className="flex max-w-[640px] flex-col gap-6">
                {STORY.map((paragraph, index) => (
                  <p key={index} className="text-body text-ink">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
            <Grid.Root cols={3}>
              {VALUE_TILES.map((tile) => (
                <Tile.Root key={tile.mark} mark={tile.mark} title={tile.title} description={tile.description} />
              ))}
            </Grid.Root>
          </div>
        </Section.Container>
      </Section.Root>

      <Section.Root>
        <Section.Container>
          <Section.Header eyebrow={<span data-static-field="about.about.eyebrow_8">{copy.about.eyebrow_8}</span>} title={<span data-static-field="about.about.title_9">{copy.about.title_9}</span>} />
          <div>
            {PROCESS_STEPS.map((step) => (
              <div key={step.number} className="grid gap-x-4 gap-y-2 border-t border-line-strong py-8 landscape:grid-cols-[120px_1fr]">
                <span className="text-h2 font-normal text-ink">{step.number}</span>
                <div className="flex flex-col gap-2">
                  <h3 className="text-h3 font-medium text-ink">{step.title}</h3>
                  <p className="max-w-2xl text-body text-ink">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section.Container>
      </Section.Root>

      {authors.length > 0 && (
        <Section.Root className="bg-ink text-surface">
          <Section.Container>
            <Typography.Title className="mb-10 text-surface"><span data-static-field="about.about.title_10">{copy.about.title_10}</span></Typography.Title>
            <div className="grid gap-x-gap gap-y-gap-y landscape:grid-cols-label-grid">
              <div className="flex items-baseline gap-2">
                <h3 className="text-h3 font-medium text-surface"><span data-static-field="about.about.h3_11">{copy.about.h3_11}</span></h3>
                <span className="text-small text-surface">({authors.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-x-gap gap-y-gap-y landscape:grid-cols-2 tablet:grid-cols-3">
                {authors.map((author) => (
                  <a
                    key={author.slug}
                    href={`/authors/${author.slug}`}
                    className="focus-ring group flex flex-col items-center gap-3 border border-surface bg-surface p-6 text-center"
                  >
                    <Avatar.Root name={author.name} src={author.avatar?.src} size="lg" />
                    <span className="flex flex-col gap-1">
                      <span className="text-body font-medium text-ink group-hover:underline">{author.name}</span>
                      <span className="text-small text-ink">{author.role}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </Section.Container>
        </Section.Root>
      )}

      {testimonials.length > 0 && (
        <Section.Root>
          <Section.Container>
            <Section.Header align="center" eyebrow={<span data-static-field="about.about.eyebrow_12">{copy.about.eyebrow_12}</span>} title={<span data-static-field="about.about.title_13">{copy.about.title_13}</span>} />
            <Grid.Root cols={testimonials.length >= 4 ? 4 : 3}>
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

      <Section.Root className="pt-0">
        <Section.Container>
          <div className="flex flex-col gap-6 border border-line p-[30px] landscape:flex-row landscape:items-center landscape:justify-between">
            <Typography.Title as="h2"><span data-static-field="about.about.title_14">{copy.about.title_14}</span></Typography.Title>
            <Button.Link data-static-field="about.about.href_15" data-static-attribute="href" href={copy.about.href_15} icon="arrow">
              <span data-static-field="about.about.link_16">{copy.about.link_16}</span></Button.Link>
          </div>
        </Section.Container>
      </Section.Root>
    </>
  );
}
