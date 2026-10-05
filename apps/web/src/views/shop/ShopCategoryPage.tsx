import type { Product, ProductCategory } from "@three-acts/ecommerce";
import copy from "@three-acts/static-content/documents/product-category-template.json";
import { Section } from "../../components/layout/section";
import { ProductGrid, sortProductsForGrid } from "../../components/shop/product-grid";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";

function CategoryBreadcrumb({ category }: { category: ProductCategory }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8 text-small text-ink">
      <ol className="flex flex-wrap items-center gap-2">
        <li className="flex items-center gap-2">
          <a
            data-static-field="product-category-template.shop_breadcrumb_href"
            data-static-attribute="href"
            href={copy.shop_breadcrumb_href}
            className="focus-ring hover:underline"
          >
            <span data-static-field="product-category-template.shop_breadcrumb">{copy.shop_breadcrumb}</span>
          </a>
          <span aria-hidden="true" className="text-block">/</span>
        </li>
        <li aria-current="page" className="font-medium text-ink" data-cms-bound="productCategories.name">{category.name}</li>
      </ol>
    </nav>
  );
}

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
        <CategoryBreadcrumb category={category} />
        <Section.Header
          eyebrow={<span data-static-field="product-category-template.shop_eyebrow">{copy.shop_eyebrow}</span>}
          title={<span data-cms-bound="productCategories.name">{category.name}</span>}
          lede={category.description ? <span data-cms-bound="productCategories.description">{category.description}</span> : undefined}
        />
        {sorted.length > 0 ? (
          <div data-cms-bound="products.inCategory"><ProductGrid products={sorted} /></div>
        ) : (
          <EmptyState.Root
            title={<span data-static-field="product-category-template.empty_title">{copy.empty_title}</span>}
            description={<span data-static-field="product-category-template.empty_description">{copy.empty_description}</span>}
            action={
              <Button.Link
                data-static-field="product-category-template.empty_action_href"
                data-static-attribute="href"
                href={copy.empty_action_href}
              >
                <span data-static-field="product-category-template.empty_action">{copy.empty_action}</span>
              </Button.Link>
            }
          />
        )}
      </Section.Container>
    </Section.Root>
  );
}

export default ShopCategoryPage;
