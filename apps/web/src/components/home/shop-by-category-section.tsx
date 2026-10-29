import type { ProductCategory } from "@three-acts/ecommerce";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Tile } from "../ui/tile";
import { Typography } from "../ui/typography";

type ShopByCategorySectionProps = {
  categories: ProductCategory[];
};

/** "What's in the box" — the shop's top categories as plain, photo-free Tiles. */
export function ShopByCategorySection({ categories }: ShopByCategorySectionProps) {
  if (categories.length === 0) {
    return null;
  }

  const shown = categories.slice(0, 4);

  return (
    <Section.Root>
      <Section.Container>
        <div className="mb-10 flex flex-col gap-4">
          <Typography.Eyebrow mark="01">Shop</Typography.Eyebrow>
          <Typography.Title className="max-w-[700px]">What&apos;s in the box</Typography.Title>
        </div>
        <Grid.Root cols={4}>
          {shown.map((category, index) => (
            <Tile.Root
              key={category.slug}
              mark={String(index + 1).padStart(2, "0")}
              title={category.name}
              description={category.description}
              href={`/shop/category/${category.slug}`}
            />
          ))}
        </Grid.Root>
      </Section.Container>
    </Section.Root>
  );
}
