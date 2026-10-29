import { site } from "../../site";

/**
 * The bordered "get in touch" module for `/contact`'s left column: email,
 * support hours, address and social links, all read from `site.ts` so this
 * never drifts from the footer/JSON-LD copy of the same facts.
 */
export function ContactDetails() {
  return (
    <div className="flex flex-col gap-8 border border-line-strong bg-surface p-6 desktop:p-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-small uppercase tracking-eyebrow text-ink">Email</h2>
        <a href={`mailto:${site.email}`} className="focus-ring w-fit text-body text-ink hover:underline">
          {site.email}
        </a>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="text-small uppercase tracking-eyebrow text-ink">Support hours</h2>
        <dl className="flex flex-col gap-1">
          {site.hours.map((entry) => (
            <div key={entry.days} className="flex flex-wrap justify-between gap-4 text-body text-ink">
              <dt>{entry.days}</dt>
              <dd>{entry.hours}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="text-small uppercase tracking-eyebrow text-ink">Address</h2>
        <address className="not-italic text-body text-ink">
          {site.address.street}
          <br />
          {site.address.locality}, {site.address.postalCode}
          <br />
          {site.address.country}
        </address>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="text-small uppercase tracking-eyebrow text-ink">Elsewhere</h2>
        <ul className="flex flex-wrap gap-4">
          {site.social.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring text-body text-ink hover:underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ContactDetails;
