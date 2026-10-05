import copy from "@three-acts/static-content/documents/home.json";
import type { Product } from "@three-acts/ecommerce";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Image } from "../ui/image";
import { Tile } from "../ui/tile";
import { Typography } from "../ui/typography";

type IntroSectionProps = {
  /** Up to 3 product images for the closing image row — falls back to a placeholder block when there aren't enough. */
  images: Product["images"];
};

const VALUES = copy.intro_section.values_1;

const FALLBACK_IMAGE = copy.intro_section.fallback_image_2;

/**
 * The AlterG-style two-column intro: a left column with the heading pinned
 * top and the story paragraph pinned to the bottom, a right column of value
 * Tiles, then a three-up row of `aspect-tall` images below the full grid.
 */
export function IntroSection({ images }: IntroSectionProps) {
  const row = [0, 1, 2].map((index) => images[index] ?? FALLBACK_IMAGE);

  return (
    <Section.Root>
      <Section.Container>
        <div className="grid gap-x-gap gap-y-gap-y landscape:grid-cols-split">
          <div className="flex flex-col justify-between gap-8">
            <Typography.Title className="max-w-[640px]"><span data-static-field="home.intro_section.title_3">{copy.intro_section.title_3}</span></Typography.Title>
            <p className="max-w-[640px] text-body text-ink">
              <span data-static-field="home.intro_section.p_4">{copy.intro_section.p_4}</span></p>
          </div>
          <Grid.Root cols={3}>
            {VALUES.map((value) => (
              <Tile.Root key={value.mark} mark={value.mark} title={value.title} description={value.description} />
            ))}
          </Grid.Root>
        </div>
        <div className="mt-[75px]">
          <Grid.Root cols={3}>
            {row.map((image, index) => (
              <span key={index} className="block aspect-tall w-full overflow-hidden bg-block">
                <Image src={image.src} alt={image.alt} width={429} height={602} className="size-full object-cover" />
              </span>
            ))}
          </Grid.Root>
        </div>
      </Section.Container>
    </Section.Root>
  );
}
