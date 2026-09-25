import { availabilityLabel, shopConfig, type Product } from "@three-acts/ecommerce";
import { Badge, type BadgeTone } from "../ui/badge";

/**
 * Tone per `Product["availability"]`, folding "in stock but at/under the
 * low-stock threshold" into the same warning tone `availabilityLabel` uses
 * for its "Low stock" text (see `@three-acts/ecommerce`'s `pricing.ts`).
 */
function toneFor(product: Product): BadgeTone {
  if (product.availability === "in_stock") {
    return product.inventory > 0 && product.inventory <= shopConfig.lowStockThreshold ? "warning" : "success";
  }
  if (product.availability === "low_stock") {
    return "warning";
  }
  if (product.availability === "preorder") {
    return "accent";
  }
  if (product.availability === "out_of_stock") {
    return "danger";
  }
  return "neutral";
}

type AvailabilityBadgeProps = {
  product: Product;
  className?: string;
};

/** A product's stock state as a Badge — "In stock", "Low stock", "Out of stock", "Available for pre-order". */
export function AvailabilityBadge({ product, className }: AvailabilityBadgeProps) {
  return (
    <Badge.Root tone={toneFor(product)} className={className}>
      {availabilityLabel(product)}
    </Badge.Root>
  );
}

export default AvailabilityBadge;
