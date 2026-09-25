import type { Product, ProductCategory } from "@three-acts/ecommerce";
import { Section } from "../../components/layout/section";
import { ProductGrid, sortProductsForGrid } from "../../components/shop/product-grid";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Image } from "../../components/ui/image";
import { Typography } from "../../components/ui/typography";

export type ShopCategoryPageProps = {
  category: ProductCategory;
  products: Product[];
};

/** `/shop/category/[slug]`: a breadcrumb, an image + copy header, then that category's product grid (with an empty state when it has none). */
export function ShopCategoryPage({ category, products }: ShopCategoryPageProps) {
  const sorted = sortProductsForGrid(products);

  return (
    <>
      <Section.Root className="pb-10 pt-6">
        <Section.Container>
          <Breadcrumb.Root items={[{ label: "Shop", href: "/shop" }, { label: category.name }]} className="mb-8" />
          <div className="grid gap-8 landscape:grid-cols-[1.1fr_1fr] landscape:items-center">
            <div>
              <Typography.Eyebrow>Shop</Typography.Eyebrow>
              <Typography.Display as="h1" className="mt-5 text-4xl landscape:text-5xl">
                {category.name}
              </Typography.Display>
              {category.description && <Typography.Lede className="mt-5">{category.description}</Typography.Lede>}
            </div>
            {category.image && (
              <div className="aspect-4/3 w-full overflow-hidden border border-line bg-ink">
                <Image
                  src={category.image.src}
                  alt={category.image.alt || category.name}
                  width={category.image.width ?? 1200}
                  height={category.image.height ?? 900}
                  loading="eager"
                  className="size-full object-cover opacity-90"
                />
              </div>
            )}
          </div>
        </Section.Container>
      </Section.Root>

      <Section.Root className="pt-0">
        <Section.Container>
          <ProductGrid
            products={sorted}
            emptyTitle="No products in this category yet"
            emptyDescription="Check back soon, or browse the full shop."
            emptyAction={<Button.Link href="/shop">Browse all products</Button.Link>}
          />
        </Section.Container>
      </Section.Root>
    </>
  );
}

export default ShopCategoryPage;
