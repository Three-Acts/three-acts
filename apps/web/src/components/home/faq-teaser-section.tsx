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
    <Section.Root>
      <Section.Container className="max-w-3xl">
        <Section.Header
          align="center"
          eyebrow={<span data-static-field="home.faq_teaser_section.eyebrow_1">{copy.faq_teaser_section.eyebrow_1}</span>}
          title={<span data-static-field="home.faq_teaser_section.title_2">{copy.faq_teaser_section.title_2}</span>}
          action={
            <Button.Link data-static-field="home.faq_teaser_section.href_3" data-static-attribute="href" href={copy.faq_teaser_section.href_3} variant="ghost" icon="arrow">
              <span data-static-field="home.faq_teaser_section.link_4">{copy.faq_teaser_section.link_4}</span></Button.Link>
          }
        />
        <div className="flex flex-col border-t border-line">
          {faqs.map((faq) => (
            <details key={faq.id} className="group border-b border-line py-5">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span aria-hidden="true" className="shrink-0 text-h3 leading-none text-ink">
                  +
                </span>
              </summary>
              <div className="mt-4">
                <Prose.Root body={faq.answer} />
              </div>
            </details>
          ))}
        </div>
      </Section.Container>
    </Section.Root>
  );
}
