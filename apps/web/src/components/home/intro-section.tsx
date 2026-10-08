import { elementClass } from "../../lib/design";
import { cmsAttributes, type CmsSource } from "@three-acts/cms-schema";
import { defaultSectionScope, type HomeSectionScopeProps } from "./section-scope";
import type { Product } from "@three-acts/ecommerce";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Image } from "../ui/image";
import { Tile } from "../ui/tile";
import { Typography } from "../ui/typography";

type IntroSectionProps = HomeSectionScopeProps & {
  /** Up to 3 product images for the closing image row — falls back to a placeholder block when there aren't enough. */
  images: Array<Product["images"][number] & { cmsSource?: CmsSource }>;
};



/**
 * The AlterG-style two-column intro: a left column with the heading pinned
 * top and the story paragraph pinned to the bottom, a right column of value
 * Tiles, then a three-up row of `aspect-tall` images below the full grid.
 */
export function IntroSection({ images, composition }: IntroSectionProps) {
  const { copy, id, field } = composition ?? defaultSectionScope;
  const FALLBACK_IMAGE = copy.intro_section.fallback_image_2;
  const VALUES = copy.intro_section.values_1;
  const row = [0, 1, 2].map((index) => images[index] ?? FALLBACK_IMAGE);

  return (
    <Section.Root data-editor-id={id("source.intro-section.1")}>
      <Section.Container data-editor-id={id("source.intro-section.2")}>
        <div data-editor-base-class={"grid gap-x-gap gap-y-gap-y landscape:grid-cols-split"} data-editor-id={id("source.intro-section.3")} className={elementClass(id("source.intro-section.3"), "grid gap-x-gap gap-y-gap-y landscape:grid-cols-split")}>
          <div data-editor-base-class={"flex flex-col justify-between gap-8"} data-editor-id={id("source.intro-section.4")} className={elementClass(id("source.intro-section.4"), "flex flex-col justify-between gap-8")}>
            <Typography.Title data-editor-id={id("source.intro-section.5")} className="max-w-[640px]"><span data-editor-base-class={""} data-editor-id={id("home.intro_section.title_3")} className={elementClass(id("home.intro_section.title_3"), "")} data-static-field={field("home.intro_section.title_3")}>{copy.intro_section.title_3}</span></Typography.Title>
            <p data-editor-base-class={"max-w-[640px] text-body text-ink"} data-editor-id={id("source.intro-section.6")} className={elementClass(id("source.intro-section.6"), "max-w-[640px] text-body text-ink")}>
              <span data-editor-base-class={""} data-editor-id={id("home.intro_section.p_4")} className={elementClass(id("home.intro_section.p_4"), "")} data-static-field={field("home.intro_section.p_4")}>{copy.intro_section.p_4}</span></p>
          </div>
          <Grid.Root data-editor-id={id("source.intro-section.7")} cols={3}>
            {VALUES.map((value, index) => (
              <Tile.Root key={index}
                mark={<span data-editor-base-class="" data-editor-id={id(`home.intro_section.values_1.${index}.mark`)} className={elementClass(id(`home.intro_section.values_1.${index}.mark`), "")} data-static-field={field(`home.intro_section.values_1.${index}.mark`)}>{value.mark}</span>}
                title={<span data-editor-base-class="" data-editor-id={id(`home.intro_section.values_1.${index}.title`)} className={elementClass(id(`home.intro_section.values_1.${index}.title`), "")} data-static-field={field(`home.intro_section.values_1.${index}.title`)}>{value.title}</span>}
                description={<span data-editor-base-class="" data-editor-id={id(`home.intro_section.values_1.${index}.description`)} className={elementClass(id(`home.intro_section.values_1.${index}.description`), "")} data-static-field={field(`home.intro_section.values_1.${index}.description`)}>{value.description}</span>}/>
            ))}
          </Grid.Root>
        </div>
        <div data-editor-base-class={"mt-[75px]"} data-editor-id={id("source.intro-section.8")} className={elementClass(id("source.intro-section.8"), "mt-[75px]")}>
          <Grid.Root data-editor-id={id("source.intro-section.9")} cols={3}>
            {row.map((image, index) => (
              <span data-editor-base-class={"block aspect-tall w-full overflow-hidden bg-block"} data-editor-id={id("source.intro-section.10")} key={index} className={elementClass(id("source.intro-section.10"), "block aspect-tall w-full overflow-hidden bg-block")}>
                <Image src={image.src} alt={image.alt} {...("cmsSource" in image && image.cmsSource ? cmsAttributes(image.cmsSource, image.cmsSource.field) : {})} data-static-media={image === FALLBACK_IMAGE ? field("home.intro_section.fallback_image_2") : undefined} width={429} height={602} className="size-full object-cover" />
              </span>
            ))}
          </Grid.Root>
        </div>
      </Section.Container>
    </Section.Root>
  );
}
