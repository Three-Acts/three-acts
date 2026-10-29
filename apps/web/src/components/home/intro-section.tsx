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

const VALUES = [
  { mark: "01", title: "Static-first", description: "Every route pre-rendered; islands hydrate only what's interactive." },
  { mark: "02", title: "One registry", description: "Products, articles, pages and settings all typed against one schema." },
  { mark: "03", title: "Swap the backend", description: "Postgres today, anything tomorrow — the API bridge doesn't care." },
  { mark: "04", title: "Typed end-to-end", description: "The same types flow from the CMS to the storefront." },
  { mark: "05", title: "Self-hosted CMS", description: "No SaaS lock-in — the CMS ships in the same repo." },
  { mark: "06", title: "Fork and go", description: "Clone it, rename the brand, configure the registry." }
];

const FALLBACK_IMAGE = { src: "https://picsum.photos/seed/three-acts-row/600/840", alt: "" };

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
            <Typography.Title className="max-w-[640px]">Why Three Acts</Typography.Title>
            <p className="max-w-[640px] text-body text-ink">
              We built Three Acts after forking the same starter for the fifth client in a row. Every project needed
              the same shape — a fast public site, a place for a non-technical editor to make changes, and a way to
              sell a handful of products — rebuilt from scratch each time. Three Acts is that shape, done once, done
              properly, and left open for you to configure rather than rebuild.
            </p>
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
