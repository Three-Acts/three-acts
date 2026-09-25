import type { Product, ProductCategory } from "@three-acts/ecommerce";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { ProductGrid, sortProductsForGrid } from "../../components/shop/product-grid";
import { Card } from "../../components/ui/card";
import { Typography } from "../../components/ui/typography";
import type { PageMeta } from "../../page-meta";

export type ShopIndexPageProps = {
  meta: PageMeta;
  categories: ProductCategory[];
  products: Product[];
};

/**
 * `/shop`: a hero band built from the live `shopIndexMeta` (so an editor's
 * page-settings override flows straight into the on-page heading/lede, not
 * just the `<title>`), a category strip, then the full product grid.
 */
export function ShopIndexPage({ meta, categories, products }: ShopIndexPageProps) {
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedProducts = sortProductsForGrid(products);

  return (
    <>
      <Section.Root className="pb-10 pt-6">
        <Section.Container>
          <Typography.Eyebrow>The full range</Typography.Eyebrow>
          <Typography.Display as="h1" className="mt-5 text-4xl landscape:text-5xl">
            {meta.seo.title}
          </Typography.Display>
          <Typography.Lede className="mt-5">{meta.seo.description}</Typography.Lede>
        </Section.Container>
      </Section.Root>

      {sortedCategories.length > 0 && (
        <Section.Root className="py-0 pb-16">
          <Section.Container>
            <Grid.Root cols={4}>
              {sortedCategories.map((category) => (
                <Card.Category
                  key={category.id}
                  title={category.name}
                  href={`/shop/category/${category.slug}`}
                  image={category.image}
                  excerpt={category.description}
                />
              ))}
            </Grid.Root>
          </Section.Container>
        </Section.Root>
      )}

      <Section.Root className="pt-0">
        <Section.Container>
          <Section.Header title="All coffee & gear" lede="Every roast, blend and piece of gear currently in stock." />
          <ProductGrid products={sortedProducts} />
        </Section.Container>
      </Section.Root>
    </>
  );
}

export default ShopIndexPage;
