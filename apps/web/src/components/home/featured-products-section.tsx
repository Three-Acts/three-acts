import { elementClass } from "../../lib/design";
import { defaultSectionScope, type HomeSectionScopeProps } from "./section-scope";
import type { Product } from "@three-acts/ecommerce";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type FeaturedProductsSectionProps = HomeSectionScopeProps & {
  /** Already selected/ordered by the caller — featured products first, up to 6. */
  products: Product[];
};


/** "Featured pieces" — a grid of featured (then most-recent) live products. */
export function FeaturedProductsSection({ products, composition }: FeaturedProductsSectionProps) {
  const { copy, id, field } = composition ?? defaultSectionScope;
  const AVAILABILITY_LABEL: Partial<Record<Product["availability"], string>> = copy.featured_products_section.availability_label_1;
  if (products.length === 0) {
    return null;
  }

  return (
    <Section.Root data-editor-id={id("source.featured-products-section.1")}>
      <Section.Container data-editor-id={id("source.featured-products-section.2")}>
        <Section.Header
          eyebrow={<span data-editor-base-class={""} data-editor-id={id("home.featured_products_section.eyebrow_2")} className={elementClass(id("home.featured_products_section.eyebrow_2"), "")} data-static-field={field("home.featured_products_section.eyebrow_2")}>{copy.featured_products_section.eyebrow_2}</span>}
          title={<span data-editor-base-class={""} data-editor-id={id("home.featured_products_section.title_3")} className={elementClass(id("home.featured_products_section.title_3"), "")} data-static-field={field("home.featured_products_section.title_3")}>{copy.featured_products_section.title_3}</span>}
          lede={<span data-editor-base-class={""} data-editor-id={id("home.featured_products_section.lede_4")} className={elementClass(id("home.featured_products_section.lede_4"), "")} data-static-field={field("home.featured_products_section.lede_4")}>{copy.featured_products_section.lede_4}</span>}
          action={
            <Button.Link data-editor-id={id("home.featured_products_section.href_5")} data-static-field={field("home.featured_products_section.href_5")} data-static-attribute="href" href={copy.featured_products_section.href_5} variant="ghost" icon="arrow">
              <span data-editor-base-class={""} data-editor-id={id("home.featured_products_section.link_6")} className={elementClass(id("home.featured_products_section.link_6"), "")} data-static-field={field("home.featured_products_section.link_6")}>{copy.featured_products_section.link_6}</span></Button.Link>
          }
        />
        <Grid.Root data-editor-id={id("source.featured-products-section.3")} cols={3}>
          {products.map((product) => {
            const availabilityLabel = AVAILABILITY_LABEL[product.availability];
            return (
              <Card.Product
                cmsSource={{ collectionId: "products", recordId: product.id, label: product.title }}
                key={product.slug}
                title={product.title}
                href={`/shop/${product.slug}`}
                image={product.images[0]!}
                price={product.price}
                compareAtPrice={product.compareAtPrice}
                currency={product.currency}
                meta={availabilityLabel && <Badge.Root tone="warning">{availabilityLabel}</Badge.Root>}
              />
            );
          })}
        </Grid.Root>
      </Section.Container>
    </Section.Root>
  );
}
