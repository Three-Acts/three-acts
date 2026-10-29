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

const AVAILABILITY_LABEL: Partial<Record<Product["availability"], string>> = {
  low_stock: "Low stock",
  preorder: "Pre-order"
};

/** "Featured pieces" — a grid of featured (then most-recent) live products. */
export function FeaturedProductsSection({ products }: FeaturedProductsSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <Section.Root>
      <Section.Container>
        <Section.Header
          eyebrow="Featured"
          title="Featured pieces"
          lede="A rotating edit of what's live in the shop right now."
          action={
            <Button.Link href="/shop" variant="ghost" icon="arrow">
              Shop all
            </Button.Link>
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
