import type { Product, ProductCategory } from "@three-acts/ecommerce";
import { Grid } from "../../components/layout/grid";
import { Section } from "../../components/layout/section";
import { ProductGrid, sortProductsForGrid } from "../../components/shop/product-grid";
import { Tile } from "../../components/ui/tile";
import type { PageMeta } from "../../page-meta";

export type ShopIndexPageProps = {
  meta: PageMeta;
  categories: ProductCategory[];
  products: Product[];
};

/**
 * `/shop`: a Section.Header ("Shop" → "Everything in the template"), a 4-up
 * Tile grid of every category, then the full product grid (featured pieces
 * first — see `sortProductsForGrid`).
 */
export function ShopIndexPage({ meta, categories, products }: ShopIndexPageProps) {
  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedProducts = sortProductsForGrid(products);

  return (
    <>
      <Section.Root data-editor-id="source.ShopIndexPage.1" className="pb-0">
        <Section.Container data-editor-id="source.ShopIndexPage.2">
          <Section.Header eyebrow="Shop" title="Everything in the template" lede={meta.seo.description} />
          <Grid.Root data-editor-id="source.ShopIndexPage.3" cols={4}>
            {sortedCategories.map((category, index) => (
              <Tile.Root
              cmsSource={{ collectionId: "product-categories", recordId: category.id, label: category.name }}
              key={category.id}
                mark={String(index + 1).padStart(2, "0")}
                title={category.name}
                description={category.description}
                href={`/shop/category/${category.slug}`}
              />
            ))}
          </Grid.Root>
        </Section.Container>
      </Section.Root>

      <Section.Root data-editor-id="source.ShopIndexPage.4" className="pt-0">
        <Section.Container data-editor-id="source.ShopIndexPage.5">
          <Section.Header title="All pieces" lede="Every app, package, module, theme, integration, licence, service and bundle currently for sale." />
          <ProductGrid products={sortedProducts} />
        </Section.Container>
      </Section.Root>
    </>
  );
}

export default ShopIndexPage;
