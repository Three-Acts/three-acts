import type { ReactNode } from "react";
import { Section } from "../../components/layout/section";
import { Prose } from "../../components/ui/prose";

export type InfoPageSection = {
  heading: string;
  body: string;
};

export type InfoPageProps = {
  eyebrow?: string;
  title: string;
  lede?: string;
  sections: InfoPageSection[];
  /** Extra content rendered between the header and the heading/body rows — the pricing tiles on `/licenses`, the "coming soon" Notice on `/changelog`. */
  children?: ReactNode;
};

/**
 * Shared layout for the storefront's plain, mostly-static info pages
 * (`/docs`, `/licenses`, `/refunds`, `/terms`, `/privacy`, `/careers`,
 * `/changelog`): a `Section.Header` (eyebrow/title/lede), then a stack of
 * heading/body rows, each `border-t border-line-strong py-8`, the heading
 * in a fixed-width label column on landscape+ and the body — plain text
 * through `Prose.Root` (supports `\n\n`-separated paragraphs, `- ` lists,
 * and autolinks bare `/shop`, `/blog` paths and `https://` URLs) — filling
 * the rest. Every info page composes this from plain data rather than
 * hand-rolled markup, so the pages stay visually consistent.
 */
export function InfoPage({ eyebrow, title, lede, sections, children }: InfoPageProps) {
  return (
    <Section.Root>
      <Section.Container className="max-w-4xl">
        <Section.Header eyebrow={eyebrow} title={title} lede={lede} />
        {children}
        <div className="flex flex-col">
          {sections.map((section) => (
            <section
              key={section.heading}
              className="grid gap-4 border-t border-line-strong py-8 landscape:grid-cols-[16rem_1fr] landscape:gap-x-gap"
            >
              <h3 className="text-h3 font-medium text-ink">{section.heading}</h3>
              <Prose.Root body={section.body} />
            </section>
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}

export default InfoPage;
