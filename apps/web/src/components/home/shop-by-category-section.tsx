import type { ProductCategory } from "@three-acts/ecommerce";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Card } from "../ui/card";

type ShopByCategorySectionProps = {
  categories: ProductCategory[];
};

/** "Shop by category" — every product category as a Card.Category tile. */
export function ShopByCategorySection({ categories }: ShopByCategorySectionProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <Section.Root>
      <Section.Container>
        <Section.Header eyebrow="The range" title="Shop by category" lede="Single origins, blends and decaf, plus the brewers and grinders to go with them." />
        <Grid.Root cols={4}>
          {categories.map((category) => (
            <Card.Category
              key={category.slug}
              title={category.name}
              href={`/shop/category/${category.slug}`}
              image={category.image}
              excerpt={category.description}
            />
          ))}
        </Grid.Root>
      </Section.Container>
    </Section.Root>
  );
}
