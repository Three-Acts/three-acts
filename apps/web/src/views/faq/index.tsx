import type { Faq } from "@three-acts/content";
import { Section } from "../../components/layout/section";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Prose } from "../../components/ui/prose";
import { Typography } from "../../components/ui/typography";
import { FAQ_TOPICS, topicAnchor } from "./topics";

type FaqPageProps = {
  faqs: Faq[];
};

/**
 * The `/faq` route: a topic nav, one section per topic (registry order,
 * skipping any topic with no live questions) with a native `<details>`
 * accordion per question — the first question in each topic open by default
 * — and a contact CTA at the end.
 */
export function FaqPage({ faqs }: FaqPageProps) {
  const groups = FAQ_TOPICS.map((topic) => ({
    ...topic,
    faqs: faqs.filter((faq) => faq.topic === topic.value).sort((a, b) => a.sortOrder - b.sortOrder)
  })).filter((group) => group.faqs.length > 0);

  return (
    <>
      <Section.Root className="pb-6">
        <Section.Container className="max-w-3xl">
          <Breadcrumb.Root items={[{ label: "Home", href: "/" }, { label: "FAQ" }]} className="mb-6" />
          <Typography.Eyebrow className="mb-5">Good to know</Typography.Eyebrow>
          <Typography.Display as="h1">Frequently asked questions</Typography.Display>
          <Typography.Lede className="mt-6">
            Answers to what people ask us most about ordering, brewing and shipping. Can't find it here? Reach out —
            we reply to every message.
          </Typography.Lede>

          {groups.length > 1 && (
            <nav aria-label="FAQ topics" className="mt-10 flex flex-wrap gap-2">
              {groups.map((group) => (
                <a
                  key={group.value}
                  href={`#${topicAnchor(group.value)}`}
                  className="focus-ring border border-line px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:border-line-strong hover:text-accent"
                >
                  {group.label}
                </a>
              ))}
            </nav>
          )}
        </Section.Container>
      </Section.Root>

      {groups.map((group) => (
        <Section.Root key={group.value} className="py-8 desktop:py-10">
          <Section.Container className="max-w-3xl">
            <h2 id={topicAnchor(group.value)} className="scroll-mt-24 font-serif text-2xl font-semibold tracking-tight text-ink">
              {group.label}
            </h2>
            <div className="mt-6 flex flex-col divide-y divide-line border-y border-line">
              {group.faqs.map((faq, index) => (
                <details key={faq.id} open={index === 0} className="group py-5">
                  <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-xl leading-none text-muted transition-transform duration-150 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="mt-4">
                    <Prose.Root body={faq.answer} className="text-base leading-7" />
                  </div>
                </details>
              ))}
            </div>
          </Section.Container>
        </Section.Root>
      ))}

      <Section.Root className="bg-surface-raised">
        <Section.Container className="max-w-3xl text-center">
          <Typography.Title as="h2">Still have a question?</Typography.Title>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted">
            Our team answers every message within a business day — ordering, wholesale, subscriptions, anything.
          </p>
          <div className="mt-6 flex justify-center">
            <Button.Link href="/contact">Contact us</Button.Link>
          </div>
        </Section.Container>
      </Section.Root>
    </>
  );
}
