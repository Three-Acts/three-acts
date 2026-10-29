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

const STORY = [
  "We built Three Acts after the same brief showed up for the fourth time: a marketing site, somewhere non-technical for an editor to make changes, and no budget to rebuild the plumbing from scratch each time. Three Acts is that shape, built once and left open to configure rather than rewrite.",
  "The public site renders to static HTML by default. React only ships where a page actually needs it — cart, checkout, sign-in, a form — as an isolated island, not a framework wrapped around every route.",
  "Every collection, field and constraint is declared once in the collection registry. The editor, the API's validation and the generated Postgres schema all read the same file, so the three never drift apart.",
  "Neither the public site nor the editorial app ever holds a database credential or a payment key. Every write and every auth call goes through the API app — the one place secrets live, and the one place to audit.",
  "A client fork edits the registry, the seed data, the shop config and the theme tokens — not the plumbing underneath. Swap the backend, keep the site."
];

const VALUE_TILES = [
  { mark: "01", title: "Static-first", description: "Every route pre-renders to HTML; islands hydrate only what needs to be interactive." },
  { mark: "02", title: "One registry", description: "Collections, fields and constraints declared once, shared by the editor, the API and the schema." },
  { mark: "03", title: "Swap the backend", description: "File-backed storage today, Postgres or Supabase tomorrow — the same interface either way." },
  { mark: "04", title: "Everything through the API", description: "Every browser write and every auth call goes through one app. No app holds a provider credential." },
  { mark: "05", title: "Fork in an afternoon", description: "Rename the brand, edit the registry, swap the seed data — the plumbing stays put." },
  { mark: "06", title: "Wireframe design system", description: "Black, white and one gray. Hierarchy comes from size and space, not colour." }
];

const PROCESS_STEPS = [
  { number: "01", title: "Fork", description: "Clone the repo, then rename the brand in site.ts and the design tokens in theme.css." },
  { number: "02", title: "Configure the registry", description: "Add, remove or retype collections and fields in the collection registry for the client's real content and product model." },
  { number: "03", title: "Seed and design", description: "Replace the example seed data, swap in the client's real copy and imagery, and adjust the theme tokens to the client's brand." },
  { number: "04", title: "Connect a store", description: "Point the data and storage backends at Postgres or Supabase — or keep the zero-configuration file-backed store for a lightweight site with no shop." },
  { number: "05", title: "Deploy", description: "Set the client's own secrets, deploy the web, CMS and API apps, and run the first publish." }
];

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
            eyebrow="About"
            title="One template, three apps, no re-plumbing"
            lede="Three Acts is a static-first Astro site, a private CMS and a typed API bridge, versioned together in one repo. Here's why we built it that way, and what forking it actually looks like."
          />
          <div className="grid gap-x-gap gap-y-gap-y landscape:grid-cols-split">
            <div className="flex flex-col justify-between gap-8">
              <Typography.Eyebrow>The short version</Typography.Eyebrow>
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
          <Section.Header eyebrow="Process" title="How a client site ships" />
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
            <Typography.Title className="mb-10 text-surface">The team</Typography.Title>
            <div className="grid gap-x-gap gap-y-gap-y landscape:grid-cols-label-grid">
              <div className="flex items-baseline gap-2">
                <h3 className="text-h3 font-medium text-surface">Team</h3>
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
            <Section.Header align="center" eyebrow="Agencies" title="What agencies say" />
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
            <Typography.Title as="h2">Talk to us about an agency licence</Typography.Title>
            <Button.Link href="/agencies" icon="arrow">
              See agency licensing
            </Button.Link>
          </div>
        </Section.Container>
      </Section.Root>
    </>
  );
}
