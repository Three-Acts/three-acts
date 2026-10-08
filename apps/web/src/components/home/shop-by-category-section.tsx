import { elementClass } from "../../lib/design";
import { defaultSectionScope, type HomeSectionScopeProps } from "./section-scope";
import type { ProductCategory } from "@three-acts/ecommerce";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Tile } from "../ui/tile";
import { Typography } from "../ui/typography";

type ShopByCategorySectionProps = HomeSectionScopeProps & {
  categories: ProductCategory[];
};

/** "What's in the box" — the shop's top categories as plain, photo-free Tiles. */
export function ShopByCategorySection({ categories, composition }: ShopByCategorySectionProps) {
  const { copy, id, field } = composition ?? defaultSectionScope;
  if (categories.length === 0) {
    return null;
  }

  const shown = categories.slice(0, 4);

  return (
    <Section.Root data-editor-id={id("source.shop-by-category-section.1")}>
      <Section.Container data-editor-id={id("source.shop-by-category-section.2")}>
        <div data-editor-base-class={"mb-10 flex flex-col gap-4"} data-editor-id={id("source.shop-by-category-section.3")} className={elementClass(id("source.shop-by-category-section.3"), "mb-10 flex flex-col gap-4")}>
          <Typography.Eyebrow data-editor-id={id("source.shop-by-category-section.4")} mark="01"><span data-editor-base-class={""} data-editor-id={id("home.shop_by_category_section.eyebrow_1")} className={elementClass(id("home.shop_by_category_section.eyebrow_1"), "")} data-static-field={field("home.shop_by_category_section.eyebrow_1")}>{copy.shop_by_category_section.eyebrow_1}</span></Typography.Eyebrow>
          <Typography.Title data-editor-id={id("source.shop-by-category-section.5")} className="max-w-[700px]"><span data-editor-base-class={""} data-editor-id={id("home.shop_by_category_section.title_2")} className={elementClass(id("home.shop_by_category_section.title_2"), "")} data-static-field={field("home.shop_by_category_section.title_2")}>{copy.shop_by_category_section.title_2}</span></Typography.Title>
        </div>
        <Grid.Root data-editor-id={id("source.shop-by-category-section.6")} cols={4}>
          {shown.map((category, index) => (
            <Tile.Root
              cmsSource={{ collectionId: "product-categories", recordId: category.id, label: category.name }}
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
