import { Button } from "../ui/button";
import { Typography } from "../ui/typography";
import { site } from "../../site";

/**
 * The dark "roastery" band: a short brand-story teaser linking to `/about`,
 * alongside the visit-us block (address + hours, from `site.ts`). Uses
 * `bg-ink`/`text-paper` directly — never `Section.Header`, whose Typography
 * children hardcode light-surface ink colors.
 */
export function RoasteryBandSection() {
  return (
    <section className="bg-ink py-16 text-paper desktop:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 tablet:grid-cols-2">
        <div>
          <Typography.Eyebrow className="text-paper/60">Our story</Typography.Eyebrow>
          <Typography.Title as="h2" className="mt-4 text-paper">
            Started on a 5&nbsp;kg roaster in a Woodstock garage.
          </Typography.Title>
          <p className="mt-6 max-w-lg text-lg leading-8 text-paper/75">
            Fynbos &amp; Fire began in 2019 with one small drum roaster, a handful of direct-trade relationships and a
            conviction that Cape Town deserved coffee roasted with more care than volume. We've since moved into a
            proper roastery in Observatory, but the batches are still small, the sourcing is still direct, and every
            bag still gets tasted before it ships.
          </p>
          <div className="mt-8">
            <Button.Link href="/about" variant="light">
              Our story →
            </Button.Link>
          </div>
        </div>

        <div className="border border-paper/20 p-8">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-paper/60">Visit the roastery</p>
          <p className="mt-4 text-xl font-semibold tracking-tight text-paper font-serif">{site.address.street}</p>
          <p className="text-paper/75">
            {site.address.locality}, {site.address.postalCode}
          </p>
          <p className="text-paper/75">{site.address.country}</p>
          <dl className="mt-6 flex flex-col gap-1.5 text-sm text-paper/75">
            {site.hours.map((entry) => (
              <div key={entry.days} className="flex justify-between gap-4">
                <dt>{entry.days}</dt>
                <dd>{entry.hours}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button.Link href="/visit-the-roastery" variant="light" size="sm">
              Plan a visit
            </Button.Link>
            <Button.Link href={`tel:${site.phoneHref}`} variant="ghost" size="sm" className="text-paper hover:bg-paper/10">
              {site.phone}
            </Button.Link>
          </div>
        </div>
      </div>
    </section>
  );
}
