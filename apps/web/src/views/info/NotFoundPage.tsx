import { Section } from "../../components/layout/section";
import { Button } from "../../components/ui/button";
import { Typography } from "../../components/ui/typography";

/**
 * `/404`. No search box — the storefront has no site search yet — so this
 * offers the three routes most likely to recover a lost visitor instead.
 */
export function NotFoundPage() {
  return (
    <Section.Root className="py-24 desktop:py-32">
      <Section.Container className="max-w-2xl text-center">
        <Typography.Eyebrow className="justify-center">Error 404</Typography.Eyebrow>
        <Typography.Display className="mt-5 text-5xl landscape:text-6xl">Page not found</Typography.Display>
        <Typography.Lede className="mx-auto mt-6">
          The page you were looking for doesn&apos;t exist, or it&apos;s moved. Try one of these instead.
        </Typography.Lede>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button.Link href="/shop" size="lg">
            Shop coffee
          </Button.Link>
          <Button.Link href="/blog" variant="secondary" size="lg">
            Read the journal
          </Button.Link>
          <Button.Link href="/contact" variant="ghost" size="lg">
            Contact us
          </Button.Link>
        </div>
      </Section.Container>
    </Section.Root>
  );
}

export default NotFoundPage;
