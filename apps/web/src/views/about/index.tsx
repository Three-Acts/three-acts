import type { Author, Testimonial } from "@three-acts/content";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { Avatar } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Prose } from "../../components/ui/prose";
import { Typography } from "../../components/ui/typography";
import { site } from "../../site";

type AboutPageProps = {
  authors: Author[];
  testimonials: Testimonial[];
};

const STORY = [
  "Fynbos & Fire started in 2019 on a single 5 kg Toper drum roaster in a Woodstock garage. Cape Town had no shortage of coffee, but we wanted slower coffee: small batches, tasted and adjusted roast by roast, from farms we could name.",
  "That meant sourcing trips instead of broker catalogues. We buy direct from washing stations and cooperatives in Ethiopia, Colombia, Rwanda and beyond, pay above commodity price, and keep a Q-grader on staff so every lot is cupped before it's bought and again before it ships. As the orders grew past what the garage could roast, we moved the drums into a proper roastery in Observatory — bigger, but built around the same one-batch-at-a-time habits.",
  "Every coffee still gets tasted the morning it's roasted. Blends are built to a cup profile, not a price point, and our brewing gear is chosen the same way: the drippers, grinders and filters we'd actually recommend to a friend, not just what's easiest to stock.",
  "The roastery bar is open to the public through the week, we train home baristas and café staff through our education program, and we supply wholesale to independent cafés across the country. Coffee this good only works as a small, direct, slightly obsessive supply chain — so that's what we've built."
].join("\n\n");

const VALUES = [
  {
    title: "Sourcing",
    description:
      "Direct-trade relationships with growers and washing stations, paid above commodity price, revisited every season rather than locked into a single contract."
  },
  {
    title: "Roasting",
    description:
      "Small batches on the drum, cupped the morning they're roasted. A profile is only \"done\" once it tastes right in the cup — not when the timer says so."
  },
  {
    title: "Sustainability",
    description:
      "Compostable bags, returnable 1 kg roastery tins for local customers, and a standing commitment to fair, transparent pricing back to the farms we buy from."
  }
];

/**
 * The `/about` route: founding story, values, "the team" (published authors
 * as profile cards), a testimonials strip and the visit-us block.
 */
export function AboutPage({ authors, testimonials }: AboutPageProps) {
  return (
    <>
      <Section.Root className="pb-10">
        <Section.Container className="max-w-3xl">
          <Typography.Eyebrow className="mb-5">Since 2019 · Observatory, Cape Town</Typography.Eyebrow>
          <Typography.Display as="h1">Small batches, direct sourcing, no shortcuts.</Typography.Display>
          <Typography.Lede className="mt-6">
            Fynbos & Fire is a specialty coffee roaster built around one habit: taste everything, roast in small
            batches, and buy direct from the farms whose names go on the bag.
          </Typography.Lede>
        </Section.Container>
      </Section.Root>

      <Section.Root className="pt-0">
        <Section.Container className="max-w-3xl">
          <Prose.Root body={STORY} />
        </Section.Container>
      </Section.Root>

      <Section.Root className="bg-surface-raised">
        <Section.Container>
          <Section.Header eyebrow="What we stand for" title="How we work" />
          <Grid.Root cols={3}>
            {VALUES.map((value) => (
              <article key={value.title} className="flex flex-col gap-3 border border-line bg-surface p-6">
                <h3 className="font-serif text-xl font-semibold tracking-tight text-ink">{value.title}</h3>
                <p className="text-sm leading-6 text-muted">{value.description}</p>
              </article>
            ))}
          </Grid.Root>
        </Section.Container>
      </Section.Root>

      {authors.length > 0 && (
        <Section.Root>
          <Section.Container>
            <Section.Header eyebrow="Who we are" title="The team" />
            <Grid.Root cols={4}>
              {authors.map((author) => (
                <a
                  key={author.slug}
                  href={`/authors/${author.slug}`}
                  className="focus-ring group flex flex-col items-center gap-3 border border-line bg-surface-raised p-6 text-center transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <Avatar.Root name={author.name} src={author.avatar?.src} size="lg" />
                  <span className="font-serif text-lg font-semibold tracking-tight text-ink">{author.name}</span>
                  <span className="text-sm text-muted">{author.role}</span>
                </a>
              ))}
            </Grid.Root>
          </Section.Container>
        </Section.Root>
      )}

      {testimonials.length > 0 && (
        <Section.Root className="bg-surface-raised">
          <Section.Container>
            <Section.Header align="center" eyebrow="Word on the street" title="What people are saying" />
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

      <Section.Root>
        <Section.Container>
          <div className="grid gap-10 border border-line bg-surface-raised p-8 tablet:grid-cols-2 tablet:p-10">
            <div>
              <Typography.Eyebrow>Visit the roastery</Typography.Eyebrow>
              <Typography.Title as="h2" className="mt-4">
                {site.address.street}
              </Typography.Title>
              <p className="mt-1 text-muted">
                {site.address.locality}, {site.address.postalCode}
              </p>
              <p className="text-muted">{site.address.country}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button.Link href="/visit-the-roastery" size="sm">
                  Plan a visit
                </Button.Link>
                <Button.Link href="/contact" variant="secondary" size="sm">
                  Get in touch
                </Button.Link>
              </div>
            </div>
            <dl className="flex flex-col gap-1.5 self-start text-sm text-muted">
              {site.hours.map((entry) => (
                <div key={entry.days} className="flex justify-between gap-4 border-b border-line py-2 first:pt-0">
                  <dt className="font-medium text-ink">{entry.days}</dt>
                  <dd>{entry.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section.Container>
      </Section.Root>
    </>
  );
}
