import { elementClass } from "../../lib/design";
import copy from "@three-acts/static-content/documents/faq.json";
import type { Faq } from "@three-acts/content";
import { Section } from "../../components/layout/section";
import { Button } from "../../components/ui/button";
import { Prose } from "../../components/ui/prose";
import { Typography } from "../../components/ui/typography";
import { FAQ_TOPICS, topicAnchor } from "./topics";

type FaqPageProps = {
  faqs: Faq[];
};

/**
 * The `/faq` route: a sticky topic nav left, one `<details>`-accordion
 * section per topic (registry order, skipping any topic with no live
 * questions, first question in each topic open by default) right, and a
 * contact CTA row at the end.
 */
export function FaqPage({ faqs }: FaqPageProps) {
  const groups = FAQ_TOPICS.map((topic) => ({
    ...topic,
    faqs: faqs.filter((faq) => faq.topic === topic.value).sort((a, b) => a.sortOrder - b.sortOrder)
  })).filter((group) => group.faqs.length > 0);

  return (
    <>
      <Section.Root data-editor-id="source.faq.1">
        <Section.Container data-editor-id="source.faq.2">
          <Section.Header
            eyebrow={<span data-editor-base-class={""} data-editor-id="faq.faq.eyebrow_1" className={elementClass("faq.faq.eyebrow_1", "")} data-static-field="faq.faq.eyebrow_1">{copy.faq.eyebrow_1}</span>}
            title={<span data-editor-base-class={""} data-editor-id="faq.faq.title_2" className={elementClass("faq.faq.title_2", "")} data-static-field="faq.faq.title_2">{copy.faq.title_2}</span>}
            lede={<span data-editor-base-class={""} data-editor-id="faq.faq.lede_3" className={elementClass("faq.faq.lede_3", "")} data-static-field="faq.faq.lede_3">{copy.faq.lede_3}</span>}
          />
          <div data-editor-base-class={"grid gap-x-gap gap-y-gap-y landscape:grid-cols-[16rem_1fr]"} data-editor-id="source.faq.3" className={elementClass("source.faq.3", "grid gap-x-gap gap-y-gap-y landscape:grid-cols-[16rem_1fr]")}>
            {groups.length > 1 && (
              <nav data-editor-base-class={"flex flex-row flex-wrap gap-x-6 gap-y-3 landscape:sticky landscape:top-32 landscape:h-fit landscape:flex-col landscape:flex-nowrap"} data-editor-id="source.faq.4" aria-label="FAQ topics" className={elementClass("source.faq.4", "flex flex-row flex-wrap gap-x-6 gap-y-3 landscape:sticky landscape:top-32 landscape:h-fit landscape:flex-col landscape:flex-nowrap")}>
                {groups.map((group) => (
                  <a data-editor-base-class={"focus-ring w-fit text-body text-ink underline decoration-1 underline-offset-4 hover:no-underline"} data-editor-id="source.faq.5"
                    key={group.value}
                    href={`#${topicAnchor(group.value)}`}
                    className={elementClass("source.faq.5", "focus-ring w-fit text-body text-ink underline decoration-1 underline-offset-4 hover:no-underline")}
                  >
                    {group.label}
                  </a>
                ))}
              </nav>
            )}

            <div data-editor-base-class={"flex flex-col gap-16"} data-editor-id="source.faq.6" className={elementClass("source.faq.6", "flex flex-col gap-16")}>
              {groups.map((group) => (
                <div data-editor-base-class={""} data-editor-id="source.faq.7" className={elementClass("source.faq.7", "")} key={group.value}>
                  <h3 data-editor-base-class={"scroll-mt-24 text-h3 font-medium text-ink"} data-editor-id="source.faq.8" id={topicAnchor(group.value)} className={elementClass("source.faq.8", "scroll-mt-24 text-h3 font-medium text-ink")}>
                    {group.label}
                  </h3>
                  <div data-editor-base-class={"mt-6"} data-editor-id="source.faq.9" className={elementClass("source.faq.9", "mt-6")}>
                    {group.faqs.map((faq, index) => (
                      <details data-editor-base-class={"group border-t border-line-strong py-5"} data-editor-id="source.faq.10" key={faq.id} open={index === 0} className={elementClass("source.faq.10", "group border-t border-line-strong py-5")}>
                        <summary data-editor-base-class={"focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden"} data-editor-id="source.faq.11" className={elementClass("source.faq.11", "focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden")}>
                          {faq.question}
                          <span data-editor-base-class={"shrink-0 text-h3 leading-none text-ink transition-transform duration-150 group-open:rotate-45"} data-editor-id="source.faq.12"
                            aria-hidden="true"
                            className={elementClass("source.faq.12", "shrink-0 text-h3 leading-none text-ink transition-transform duration-150 group-open:rotate-45")}
                          >
                            +
                          </span>
                        </summary>
                        <div data-editor-base-class={"mt-4"} data-editor-id="source.faq.13" className={elementClass("source.faq.13", "mt-4")}>
                          <Prose.Root body={faq.answer} />
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section.Container>
      </Section.Root>

      <Section.Root data-editor-id="source.faq.14" className="pt-0">
        <Section.Container data-editor-id="source.faq.15">
          <div data-editor-base-class={"flex flex-col gap-6 border border-line p-[30px] landscape:flex-row landscape:items-center landscape:justify-between"} data-editor-id="source.faq.16" className={elementClass("source.faq.16", "flex flex-col gap-6 border border-line p-[30px] landscape:flex-row landscape:items-center landscape:justify-between")}>
            <Typography.Title data-editor-id="source.faq.17" as="h2"><span data-editor-base-class={""} data-editor-id="faq.faq.title_4" className={elementClass("faq.faq.title_4", "")} data-static-field="faq.faq.title_4">{copy.faq.title_4}</span></Typography.Title>
            <Button.Link data-editor-id="faq.faq.href_5" data-static-field="faq.faq.href_5" data-static-attribute="href" href={copy.faq.href_5} icon="arrow">
              <span data-editor-base-class={""} data-editor-id="faq.faq.link_6" className={elementClass("faq.faq.link_6", "")} data-static-field="faq.faq.link_6">{copy.faq.link_6}</span></Button.Link>
          </div>
        </Section.Container>
      </Section.Root>
    </>
  );
}
