import { Typography } from "../ui/typography";

/**
 * Newsletter callout: points down at the footer's `NewsletterForm` island
 * rather than mounting a second one here. These static pages ship zero JS
 * beyond the layout's own islands (cart/account/newsletter) — nesting a
 * second `client:visible` form inside this (non-hydrated) section wouldn't
 * actually hydrate, since Astro islands must be mounted directly in an
 * `.astro` file, not buried inside another React subtree.
 */
export function NewsletterSection() {
  return (
    <section className="border-y border-line bg-surface py-16 text-center desktop:py-20">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-6">
        <Typography.Eyebrow>Stay in the loop</Typography.Eyebrow>
        <Typography.Title as="h2">First access to new roasts</Typography.Title>
        <p className="max-w-md text-base leading-7 text-muted">
          Subscriber-only pre-orders, restock alerts and the odd roastery invite — sign up in the footer below, no
          spam, unsubscribe any time.
        </p>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-2 size-5 text-muted">
          <path d="M10 3v13m0 0l-5-5m5 5l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    </section>
  );
}
