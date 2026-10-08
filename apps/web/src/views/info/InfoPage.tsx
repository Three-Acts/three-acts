import { elementClass } from "../../lib/design";
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
  staticContentPrefix?: string;
  staticHeaderFields?: { eyebrow?: string; title?: string; lede?: string };
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
export function InfoPage({ eyebrow, title, lede, sections, children, staticContentPrefix, staticHeaderFields }: InfoPageProps) {
  return (
    <Section.Root data-editor-id="source.InfoPage.1">
      <Section.Container data-editor-id="source.InfoPage.2" className="max-w-4xl">
        <Section.Header eyebrow={eyebrow && <span data-editor-base-class={""} data-editor-id="source.InfoPage.3" className={elementClass("source.InfoPage.3", "")} data-static-field={staticHeaderFields?.eyebrow}>{eyebrow}</span>} title={<span data-editor-base-class={""} data-editor-id="source.InfoPage.4" className={elementClass("source.InfoPage.4", "")} data-static-field={staticHeaderFields?.title}>{title}</span>} lede={lede && <span data-editor-base-class={""} data-editor-id="source.InfoPage.5" className={elementClass("source.InfoPage.5", "")} data-static-field={staticHeaderFields?.lede}>{lede}</span>} />
        {children}
        <div data-editor-base-class={"flex flex-col"} data-editor-id="source.InfoPage.6" className={elementClass("source.InfoPage.6", "flex flex-col")}>
          {sections.map((section, index) => (
            <section data-editor-base-class={"grid gap-4 border-t border-line-strong py-8 landscape:grid-cols-[16rem_1fr] landscape:gap-x-gap"} data-editor-id="source.InfoPage.7"
              key={section.heading}
              className={elementClass("source.InfoPage.7", "grid gap-4 border-t border-line-strong py-8 landscape:grid-cols-[16rem_1fr] landscape:gap-x-gap")}
            >
              <h3 data-editor-base-class={"text-h3 font-medium text-ink"} data-editor-id="source.InfoPage.8" data-static-field={staticContentPrefix ? `${staticContentPrefix}.${index}.heading` : undefined} className={elementClass("source.InfoPage.8", "text-h3 font-medium text-ink")}>{section.heading}</h3>
              <Prose.Root body={section.body} data-static-field={staticContentPrefix ? `${staticContentPrefix}.${index}.body` : undefined} data-static-format="prose" />
            </section>
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}

export default InfoPage;
