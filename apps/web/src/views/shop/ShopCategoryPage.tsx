import { elementClass } from "../../lib/design";
import type { Product, ProductCategory } from "@three-acts/ecommerce";
import copy from "@three-acts/static-content/documents/product-category-template.json";
import { Section } from "../../components/layout/section";
import { ProductGrid, sortProductsForGrid } from "../../components/shop/product-grid";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";

function CategoryBreadcrumb({ category }: { category: ProductCategory }) {
  return (
    <nav data-editor-base-class={"mb-8 text-small text-ink"} data-editor-id="source.ShopCategoryPage.1" aria-label="Breadcrumb" className={elementClass("source.ShopCategoryPage.1", "mb-8 text-small text-ink")}>
      <ol data-editor-base-class={"flex flex-wrap items-center gap-2"} data-editor-id="source.ShopCategoryPage.2" className={elementClass("source.ShopCategoryPage.2", "flex flex-wrap items-center gap-2")}>
        <li data-editor-base-class={"flex items-center gap-2"} data-editor-id="source.ShopCategoryPage.3" className={elementClass("source.ShopCategoryPage.3", "flex items-center gap-2")}>
          <a data-editor-base-class={"focus-ring hover:underline"} data-editor-id="product-category-template.shop_breadcrumb_href"
            data-static-field="product-category-template.shop_breadcrumb_href"
            data-static-attribute="href"
            href={copy.shop_breadcrumb_href}
            className={elementClass("product-category-template.shop_breadcrumb_href", "focus-ring hover:underline")}
          >
            <span data-editor-base-class={""} data-editor-id="product-category-template.shop_breadcrumb" className={elementClass("product-category-template.shop_breadcrumb", "")} data-static-field="product-category-template.shop_breadcrumb">{copy.shop_breadcrumb}</span>
          </a>
          <span data-editor-base-class={"text-block"} data-editor-id="source.ShopCategoryPage.4" aria-hidden="true" className={elementClass("source.ShopCategoryPage.4", "text-block")}>/</span>
        </li>
        <li data-editor-base-class={"font-medium text-ink"} data-editor-id="source.ShopCategoryPage.5" aria-current="page" className={elementClass("source.ShopCategoryPage.5", "font-medium text-ink")} data-cms-bound="productCategories.name">{category.name}</li>
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
    <Section.Root data-editor-id="source.ShopCategoryPage.6">
      <Section.Container data-editor-id="source.ShopCategoryPage.7">
        <CategoryBreadcrumb category={category} />
        <Section.Header
          eyebrow={<span data-editor-base-class={""} data-editor-id="product-category-template.shop_eyebrow" className={elementClass("product-category-template.shop_eyebrow", "")} data-static-field="product-category-template.shop_eyebrow">{copy.shop_eyebrow}</span>}
          title={<span data-editor-base-class={""} data-editor-id="source.ShopCategoryPage.8" className={elementClass("source.ShopCategoryPage.8", "")} data-cms-bound="productCategories.name">{category.name}</span>}
          lede={category.description ? <span data-editor-base-class={""} data-editor-id="source.ShopCategoryPage.9" className={elementClass("source.ShopCategoryPage.9", "")} data-cms-bound="productCategories.description">{category.description}</span> : undefined}
        />
        {sorted.length > 0 ? (
          <div data-editor-base-class={""} data-editor-id="source.ShopCategoryPage.10" className={elementClass("source.ShopCategoryPage.10", "")} data-cms-bound="products.inCategory"><ProductGrid products={sorted} /></div>
        ) : (
          <EmptyState.Root
            title={<span data-editor-base-class={""} data-editor-id="product-category-template.empty_title" className={elementClass("product-category-template.empty_title", "")} data-static-field="product-category-template.empty_title">{copy.empty_title}</span>}
            description={<span data-editor-base-class={""} data-editor-id="product-category-template.empty_description" className={elementClass("product-category-template.empty_description", "")} data-static-field="product-category-template.empty_description">{copy.empty_description}</span>}
            action={
              <Button.Link data-editor-id="product-category-template.empty_action_href"
                data-static-field="product-category-template.empty_action_href"
                data-static-attribute="href"
                href={copy.empty_action_href}
              >
                <span data-editor-base-class={""} data-editor-id="product-category-template.empty_action" className={elementClass("product-category-template.empty_action", "")} data-static-field="product-category-template.empty_action">{copy.empty_action}</span>
              </Button.Link>
            }
          />
        )}
      </Section.Container>
    </Section.Root>
  );
}

export default ShopCategoryPage;
