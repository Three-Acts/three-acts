import { Section } from "../../components/layout/section";
import { Typography } from "../../components/ui/typography";

const LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "Journal", href: "/blog" },
  { label: "Docs", href: "/docs" },
  { label: "Contact", href: "/contact" }
];

/**
 * `/404`. No search box — the storefront has no site search yet — so this
 * offers a bordered module of the four routes most likely to recover a
 * lost visitor instead.
 */
export function NotFoundPage() {
  return (
    <Section.Root>
      <Section.Container className="max-w-2xl text-center">
        <Typography.Eyebrow className="justify-center">Error 404</Typography.Eyebrow>
        <Typography.Display as="h1" className="mt-5">
          Page not found
        </Typography.Display>
        <Typography.Lede className="mx-auto mt-6">
          The page you were looking for doesn&apos;t exist, or it&apos;s moved. Try one of these instead.
        </Typography.Lede>

        <ul className="mt-12 flex flex-col divide-y divide-line border border-line-strong bg-surface text-left">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="focus-ring flex items-center justify-between px-6 py-4 text-body font-medium text-ink hover:underline desktop:px-8"
              >
                {link.label}
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </Section.Container>
    </Section.Root>
  );
}

export default NotFoundPage;
