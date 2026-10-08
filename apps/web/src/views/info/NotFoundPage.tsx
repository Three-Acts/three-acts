import { elementClass } from "../../lib/design";
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
    <Section.Root data-editor-id="source.NotFoundPage.1">
      <Section.Container data-editor-id="source.NotFoundPage.2" className="max-w-2xl text-center">
        <Typography.Eyebrow data-editor-id="source.NotFoundPage.3" className="justify-center">Error 404</Typography.Eyebrow>
        <Typography.Display data-editor-id="source.NotFoundPage.4" as="h1" className="mt-5">
          Page not found
        </Typography.Display>
        <Typography.Lede data-editor-id="source.NotFoundPage.5" className="mx-auto mt-6">
          The page you were looking for doesn&apos;t exist, or it&apos;s moved. Try one of these instead.
        </Typography.Lede>

        <ul data-editor-base-class={"mt-12 flex flex-col divide-y divide-line border border-line-strong bg-surface text-left"} data-editor-id="source.NotFoundPage.6" className={elementClass("source.NotFoundPage.6", "mt-12 flex flex-col divide-y divide-line border border-line-strong bg-surface text-left")}>
          {LINKS.map((link) => (
            <li data-editor-base-class={""} data-editor-id="source.NotFoundPage.7" className={elementClass("source.NotFoundPage.7", "")} key={link.href}>
              <a data-editor-base-class={"focus-ring flex items-center justify-between px-6 py-4 text-body font-medium text-ink hover:underline desktop:px-8"} data-editor-id="source.NotFoundPage.8"
                href={link.href}
                className={elementClass("source.NotFoundPage.8", "focus-ring flex items-center justify-between px-6 py-4 text-body font-medium text-ink hover:underline desktop:px-8")}
              >
                {link.label}
                <span data-editor-base-class={""} data-editor-id="source.NotFoundPage.9" className={elementClass("source.NotFoundPage.9", "")} aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </Section.Container>
    </Section.Root>
  );
}

export default NotFoundPage;
