import { cmsAttributes } from "@three-acts/cms-schema";
import { elementClass } from "../../lib/design";
import copy from "@three-acts/static-content/documents/home.json";
import type { Faq } from "@three-acts/content";
import { Section } from "../layout/section";
import { Button } from "../ui/button";
import { Prose } from "../ui/prose";

type FaqTeaserSectionProps = {
  /** Already selected by the caller — general/shipping FAQs, up to 4. */
  faqs: Faq[];
};

/** A short FAQ accordion (native `<details>`, no JS) with a link through to the full `/faq` page. */
export function FaqTeaserSection({ faqs }: FaqTeaserSectionProps) {
  if (faqs.length === 0) {
    return null;
  }

  return (
    <Section.Root data-editor-id="source.faq-teaser-section.1">
      <Section.Container data-editor-id="source.faq-teaser-section.2" className="max-w-3xl">
        <Section.Header
          align="center"
          eyebrow={<span data-editor-base-class={""} data-editor-id="home.faq_teaser_section.eyebrow_1" className={elementClass("home.faq_teaser_section.eyebrow_1", "")} data-static-field="home.faq_teaser_section.eyebrow_1">{copy.faq_teaser_section.eyebrow_1}</span>}
          title={<span data-editor-base-class={""} data-editor-id="home.faq_teaser_section.title_2" className={elementClass("home.faq_teaser_section.title_2", "")} data-static-field="home.faq_teaser_section.title_2">{copy.faq_teaser_section.title_2}</span>}
          action={
            <Button.Link data-editor-id="home.faq_teaser_section.href_3" data-static-field="home.faq_teaser_section.href_3" data-static-attribute="href" href={copy.faq_teaser_section.href_3} variant="ghost" icon="arrow">
              <span data-editor-base-class={""} data-editor-id="home.faq_teaser_section.link_4" className={elementClass("home.faq_teaser_section.link_4", "")} data-static-field="home.faq_teaser_section.link_4">{copy.faq_teaser_section.link_4}</span></Button.Link>
          }
        />
        <div data-editor-base-class={"flex flex-col border-t border-line"} data-editor-id="source.faq-teaser-section.3" className={elementClass("source.faq-teaser-section.3", "flex flex-col border-t border-line")}>
          {faqs.map((faq) => (
            <details data-editor-base-class={"group border-b border-line py-5"} data-editor-id="source.faq-teaser-section.4" key={faq.id} className={elementClass("source.faq-teaser-section.4", "group border-b border-line py-5")}>
              <summary {...cmsAttributes({ collectionId: "faqs", recordId: faq.id, label: faq.question }, "question")} data-editor-base-class={"focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden"} data-editor-id="source.faq-teaser-section.5" className={elementClass("source.faq-teaser-section.5", "focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden")}>
                {faq.question}
                <span data-editor-base-class={"shrink-0 text-h3 leading-none text-ink"} data-editor-id="source.faq-teaser-section.6" aria-hidden="true" className={elementClass("source.faq-teaser-section.6", "shrink-0 text-h3 leading-none text-ink")}>
                  +
                </span>
              </summary>
              <div data-editor-base-class={"mt-4"} data-editor-id="source.faq-teaser-section.7" className={elementClass("source.faq-teaser-section.7", "mt-4")}>
                <Prose.Root {...cmsAttributes({ collectionId: "faqs", recordId: faq.id, label: faq.question }, "answer")} body={faq.answer} />
              </div>
            </details>
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}
