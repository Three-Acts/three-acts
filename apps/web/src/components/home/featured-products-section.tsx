import copy from "@three-acts/static-content/documents/home.json";
import type { Product } from "@three-acts/ecommerce";
import { Grid } from "../layout/grid";
import { Section } from "../layout/section";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

type FeaturedProductsSectionProps = {
  /** Already selected/ordered by the caller — featured products first, up to 6. */
  products: Product[];
};

const AVAILABILITY_LABEL: Partial<Record<Product["availability"], string>> = copy.featured_products_section.availability_label_1;

/** "Featured pieces" — a grid of featured (then most-recent) live products. */
export function FeaturedProductsSection({ products }: FeaturedProductsSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <Section.Root>
      <Section.Container>
        <Section.Header
          eyebrow={<span data-static-field="home.featured_products_section.eyebrow_2">{copy.featured_products_section.eyebrow_2}</span>}
          title={<span data-static-field="home.featured_products_section.title_3">{copy.featured_products_section.title_3}</span>}
          lede={<span data-static-field="home.featured_products_section.lede_4">{copy.featured_products_section.lede_4}</span>}
          action={
            <Button.Link data-static-field="home.featured_products_section.href_5" data-static-attribute="href" href={copy.featured_products_section.href_5} variant="ghost" icon="arrow">
              <span data-static-field="home.featured_products_section.link_6">{copy.featured_products_section.link_6}</span></Button.Link>
          }
        />
        <Grid.Root cols={3}>
          {products.map((product) => {
            const availabilityLabel = AVAILABILITY_LABEL[product.availability];
            return (
              <Card.Product
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
