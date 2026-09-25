import { Section } from "../layout/section";
import { Button } from "../ui/button";
import { Image } from "../ui/image";
import { Typography } from "../ui/typography";

type HeroSectionProps = {
  coverImage: { src: string; alt: string };
};

/**
 * The home page's opening section — Relume "Header 1" with the AlterG
 * composition: a centred display headline + lede + one primary button, then
 * a full-width `aspect-hero` photo below, both inside the page container
 * (edge to edge of the viewport this is not — only full-bleed bands are).
 * Not wrapped in Section.Root — it owns its own `pt-[75px]`/`pb-8` rhythm.
 */
export function HeroSection({ coverImage }: HeroSectionProps) {
  return (
    <div className="pb-8 pt-[75px]">
      <Section.Container>
        <div className="mx-auto max-w-[700px] text-center">
          <Typography.Display>The client website template that ships production-ready.</Typography.Display>
          <Typography.Lede className="mx-auto mt-6 max-w-[450px]">
            A static-first Astro site, a private CMS and a typed API bridge in one repo — storefront, journal, forms
            and accounts built in. Fork it, configure the registry, ship.
          </Typography.Lede>
          <div className="mt-6">
            <Button.Link href="/shop" size="lg" icon="arrow">
              Shop the template
            </Button.Link>
          </div>
        </div>
      </Section.Container>
      <Section.Container className="mt-[75px]">
        <span className="block aspect-hero w-full overflow-hidden bg-block">
          <Image src={coverImage.src} alt={coverImage.alt} width={1318} height={608} loading="eager" className="size-full object-cover" />
        </span>
      </Section.Container>
    </div>
  );
}
