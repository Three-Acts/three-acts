import { site } from "../../site";

/**
 * The roastery's address, hours, email and phone as a `<address>` block,
 * with a short map-free "how to find us" note underneath. Used by
 * `/contact`'s left column; reads every fact from `site.ts` so it never
 * drifts from the footer/JSON-LD copy of the same details.
 */
export function RoasteryDetails() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-moss">Roastery</h2>
        <address className="not-italic text-base leading-7 text-ink">
          {site.address.street}
          <br />
          {site.address.locality}, {site.address.postalCode}
          <br />
          {site.address.country}
        </address>
        <ul className="flex flex-col gap-1 text-sm text-muted">
          {site.hours.map((entry) => (
            <li key={entry.days}>
              {entry.days}: {entry.hours}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 text-base">
        <a href={`mailto:${site.email}`} className="focus-ring w-fit font-medium text-ink hover:text-accent">
          {site.email}
        </a>
        <a href={`tel:${site.phoneHref}`} className="focus-ring w-fit font-medium text-ink hover:text-accent">
          {site.phone}
        </a>
      </div>

      <div className="border border-line bg-surface-raised p-5">
        <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-moss">How to find us</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          We&apos;re on Lower Main Road in Observatory, a five-minute walk from Obz Square, with metered street
          parking right outside. For directions, parking notes and public transport, see{" "}
          <a
            href="/visit-the-roastery"
            className="text-ink underline decoration-1 underline-offset-2 hover:text-accent"
          >
            Visit the roastery
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default RoasteryDetails;
