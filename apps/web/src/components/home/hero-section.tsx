import { elementClass, componentAttributes, componentClass } from "../../lib/design";
import copy from "@three-acts/static-content/documents/home.json";
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
    <div className={componentClass("HeroSection", {})} {...componentAttributes("HeroSection", "home.hero", {})}>
      <Section.Container data-editor-id="source.hero-section.1">
        <div data-editor-base-class={"mx-auto max-w-[700px] text-center"} data-editor-id="source.hero-section.2" className={elementClass("source.hero-section.2", "mx-auto max-w-[700px] text-center")}>
          <Typography.Display data-editor-id="source.hero-section.3"><span data-editor-base-class={""} data-editor-id="home.hero_section.display_1" className={elementClass("home.hero_section.display_1", "")} data-static-field="home.hero_section.display_1">{copy.hero_section.display_1}</span></Typography.Display>
          <Typography.Lede data-editor-id="source.hero-section.4" className="mx-auto mt-6 max-w-[450px]">
            <span data-editor-base-class={""} data-editor-id="home.hero_section.lede_2" className={elementClass("home.hero_section.lede_2", "")} data-static-field="home.hero_section.lede_2">{copy.hero_section.lede_2}</span></Typography.Lede>
          <div data-editor-base-class={"mt-6"} data-editor-id="source.hero-section.5" className={elementClass("source.hero-section.5", "mt-6")}>
            <Button.Link data-editor-id="home.hero_section.href_3" data-static-field="home.hero_section.href_3" data-static-attribute="href" href={copy.hero_section.href_3} size="lg" icon="arrow">
              <span data-editor-base-class={""} data-editor-id="home.hero_section.link_4" className={elementClass("home.hero_section.link_4", "")} data-static-field="home.hero_section.link_4">{copy.hero_section.link_4}</span></Button.Link>
          </div>
        </div>
      </Section.Container>
      <Section.Container data-editor-id="source.hero-section.6" className="mt-[75px]">
        <span data-editor-base-class={"block aspect-hero w-full overflow-hidden bg-block"} data-editor-id="source.hero-section.7" className={elementClass("source.hero-section.7", "block aspect-hero w-full overflow-hidden bg-block")}>
          <Image src={coverImage.src} alt={coverImage.alt} width={1318} height={608} loading="eager" className="size-full object-cover" />
        </span>
      </Section.Container>
    </div>
  );
}
