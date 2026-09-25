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
      <Section.Root>
        <Section.Container>
          <Section.Header
            eyebrow="FAQ"
            title="Frequently asked questions"
            lede="Answers to what people ask before and after they fork Three Acts — orders, delivery, refunds, licensing and account questions, grouped by topic. Can't find it here? Reach out."
          />
          <div className="grid gap-x-gap gap-y-gap-y landscape:grid-cols-[16rem_1fr]">
            {groups.length > 1 && (
              <nav aria-label="FAQ topics" className="flex flex-row flex-wrap gap-x-6 gap-y-3 landscape:sticky landscape:top-32 landscape:h-fit landscape:flex-col landscape:flex-nowrap">
                {groups.map((group) => (
                  <a
                    key={group.value}
                    href={`#${topicAnchor(group.value)}`}
                    className="focus-ring w-fit text-body text-ink underline decoration-1 underline-offset-4 hover:no-underline"
                  >
                    {group.label}
                  </a>
                ))}
              </nav>
            )}

            <div className="flex flex-col gap-16">
              {groups.map((group) => (
                <div key={group.value}>
                  <h3 id={topicAnchor(group.value)} className="scroll-mt-24 text-h3 font-medium text-ink">
                    {group.label}
                  </h3>
                  <div className="mt-6">
                    {group.faqs.map((faq, index) => (
                      <details key={faq.id} open={index === 0} className="group border-t border-line-strong py-5">
                        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden">
                          {faq.question}
                          <span
                            aria-hidden="true"
                            className="shrink-0 text-h3 leading-none text-ink transition-transform duration-150 group-open:rotate-45"
                          >
                            +
                          </span>
                        </summary>
                        <div className="mt-4">
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

      <Section.Root className="pt-0">
        <Section.Container>
          <div className="flex flex-col gap-6 border border-line p-[30px] landscape:flex-row landscape:items-center landscape:justify-between">
            <Typography.Title as="h2">Still have a question?</Typography.Title>
            <Button.Link href="/contact" icon="arrow">
              Contact us
            </Button.Link>
          </div>
        </Section.Container>
      </Section.Root>
    </>
  );
}
