/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import type { Product } from "@three-acts/ecommerce";
import { Grid } from "../layout/grid";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { AvailabilityBadge } from "./availability-badge";

/** Featured products first (in their existing relative order), then the rest alphabetically by title. */
export function sortProductsForGrid(products: readonly Product[]): Product[] {
  const featured = products.filter((product) => product.featured);
  const rest = products.filter((product) => !product.featured).sort((a, b) => a.title.localeCompare(b.title));
  return [...featured, ...rest];
}

type ProductGridProps = {
  products: readonly Product[];
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
};

/**
 * A 3-up (2-up landscape, 1-up portrait) grid of `Card.Product` tiles, each
 * carrying an `AvailabilityBadge` and compare-at pricing. Renders an
 * `EmptyState` instead of an empty grid when `products` is empty.
 */
export function ProductGrid({ products, className, emptyTitle = "No products here yet", emptyDescription, emptyAction }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyState.Root
        title={emptyTitle}
        description={emptyDescription ?? "Check back soon — we're roasting more."}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <Grid.Root cols={3} className={className}>
      {products.map((product) => (
        <Card.Product
          key={product.id}
          title={product.title}
          href={`/shop/${product.slug}`}
          image={product.images[0] ?? { src: "/og-default.png", alt: product.title }}
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          currency={product.currency}
          excerpt={product.shortDescription}
          meta={<AvailabilityBadge product={product} />}
        />
      ))}
    </Grid.Root>
  );
}

export default ProductGrid;
