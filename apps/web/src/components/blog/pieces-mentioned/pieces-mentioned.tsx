import type { Product } from "@three-acts/ecommerce";
import { Grid } from "../../layout/grid";
import { Card } from "../../ui/card";
import { Typography } from "../../ui/typography";

type PiecesMentionedProps = {
  /** Already resolved against the live product catalog and capped (callers pass at most 3) — this component just renders them. */
  products: Product[];
};

/** The "Pieces mentioned" strip at the end of an article: the products it links to (via `/shop/<slug>`), as `Card.Product` tiles. Renders nothing for an empty list — callers should skip their own wrapping chrome too when `products` is empty. */
export function PiecesMentioned({ products }: PiecesMentionedProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <Typography.Eyebrow>Pieces mentioned</Typography.Eyebrow>
      <Grid.Root cols={3}>
        {products.map((product) => {
          const image = product.images[0];
          if (!image) {
            return null;
          }
          return (
            <Card.Product
              key={product.slug}
              title={product.title}
              href={`/shop/${product.slug}`}
              image={image}
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              currency={product.currency}
            />
          );
        })}
      </Grid.Root>
    </div>
  );
}
