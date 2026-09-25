import type { Product, ProductCategory } from "@three-acts/ecommerce";
import { Section } from "../../components/layout/section";
import { ProductGrid, sortProductsForGrid } from "../../components/shop/product-grid";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";

export type ShopCategoryPageProps = {
  category: ProductCategory;
  products: Product[];
};

/** `/shop/category/[slug]`: a breadcrumb, a Section.Header built from the category's own name/description, then that category's product grid (with an EmptyState when it has none). */
export function ShopCategoryPage({ category, products }: ShopCategoryPageProps) {
  const sorted = sortProductsForGrid(products);

  return (
    <Section.Root>
      <Section.Container>
        <Breadcrumb.Root items={[{ label: "Shop", href: "/shop" }, { label: category.name }]} className="mb-8" />
        <Section.Header eyebrow="Shop" title={category.name} lede={category.description} />
        <ProductGrid
          products={sorted}
          emptyTitle="No pieces in this category yet"
          emptyDescription="Check back soon, or browse the full shop."
          emptyAction={<Button.Link href="/shop">Browse all pieces</Button.Link>}
        />
      </Section.Container>
    </Section.Root>
  );
}

export default ShopCategoryPage;
