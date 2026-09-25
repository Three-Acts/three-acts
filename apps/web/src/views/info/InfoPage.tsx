import { Section } from "../../components/layout/section";
import { Prose } from "../../components/ui/prose";
import { Typography } from "../../components/ui/typography";

export type InfoPageSection = {
  heading: string;
  body: string;
};

export type InfoPageProps = {
  title: string;
  lede?: string;
  sections: InfoPageSection[];
};

/**
 * Shared layout for the storefront's plain, mostly-static info pages
 * (`/visit-the-roastery`, `/shipping`, `/returns`, `/terms`, `/privacy`,
 * `/careers`, `/subscriptions`): a single `<h1>` + optional lede, then a
 * stack of heading/body sections. Every info page composes this from plain
 * data rather than hand-rolled markup, so the pages stay visually
 * consistent. `body` is plain text rendered through `Prose.Root` (supports
 * `\n\n`-separated paragraphs, `- ` lists, and autolinks bare `/shop`,
 * `/blog` paths and `https://` URLs) — write real sentences, not markdown
 * headings; the section's own `heading` already covers that.
 */
export function InfoPage({ title, lede, sections }: InfoPageProps) {
  return (
    <Section.Root className="py-16 desktop:py-24">
      <Section.Container className="max-w-3xl">
        <Typography.Eyebrow>Fynbos &amp; Fire</Typography.Eyebrow>
        <Typography.Display className="mt-5 text-5xl landscape:text-6xl">{title}</Typography.Display>
        {lede && <Typography.Lede className="mt-6 max-w-2xl">{lede}</Typography.Lede>}

        <div className="mt-14 flex flex-col gap-10">
          {sections.map((section) => (
            <section
              key={section.heading}
              className="flex flex-col gap-3 border-t border-line pt-8 first:border-t-0 first:pt-0"
            >
              <h2 className="text-2xl font-semibold tracking-tight text-ink font-serif">{section.heading}</h2>
              <Prose.Root body={section.body} className="gap-3 text-base leading-7 text-ink" />
            </section>
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}

export default InfoPage;
