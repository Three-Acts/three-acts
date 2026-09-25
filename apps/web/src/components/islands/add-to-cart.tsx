import { useMemo, useState } from "react";
import { useCart } from "@three-acts/ecommerce/react";
import type { ProductAvailability } from "@three-acts/ecommerce";
import { AppProviders } from "../../lib/providers";
import { Button } from "../ui/button";

/**
 * Everything the island needs from a `Product` — plain, JSON-serializable
 * data only (see `AppProviders`' docstring on why: Astro hydrates each
 * island as its own isolated React root, so nothing but serializable props
 * crosses the `.astro` -> island boundary).
 */
export type AddToCartProduct = {
  slug: string;
  title: string;
  price: number;
  currency: string;
  availability: ProductAvailability;
  inventory: number;
  image?: { src: string; alt: string };
};

const MAX_QUANTITY = 99;

/** Mirrors `@three-acts/ecommerce`'s `isPurchasable`, plus a human reason for the disabled state. */
function purchaseState(availability: ProductAvailability, inventory: number): { canAdd: boolean; reason: string | null } {
  if (availability === "out_of_stock") {
    return { canAdd: false, reason: "This product is currently out of stock." };
  }
  if (availability === "discontinued") {
    return { canAdd: false, reason: "This product is no longer available." };
  }
  if ((availability === "in_stock" || availability === "low_stock") && inventory <= 0) {
    return { canAdd: false, reason: "This product is currently out of stock." };
  }
  return { canAdd: true, reason: null };
}

function AddToCartInner({ product }: { product: AddToCartProduct }) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const { canAdd, reason } = useMemo(() => purchaseState(product.availability, product.inventory), [product.availability, product.inventory]);
  // Pre-order stock isn't tracked the same way, so its ceiling is just the cart max.
  const maxQuantity = product.availability === "preorder" ? MAX_QUANTITY : Math.max(1, Math.min(MAX_QUANTITY, product.inventory));

  function decrement() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increment() {
    setQuantity((current) => Math.min(maxQuantity, current + 1));
  }

  function handleAdd() {
    add(product.slug, quantity);
    setAdded(true);
  }

  if (!canAdd) {
    return (
      <div className="flex flex-col gap-3">
        <Button.Root type="button" disabled className="w-full landscape:w-auto">
          Add to cart
        </Button.Root>
        {reason && <p className="text-small text-ink">{reason}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center border border-line-strong">
          <button
            type="button"
            onClick={decrement}
            disabled={quantity <= 1}
            aria-label={`Decrease quantity of ${product.title}`}
            className="focus-ring flex size-11 items-center justify-center text-h3 text-ink transition-colors duration-150 hover:bg-block disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <label htmlFor="add-to-cart-quantity" className="sr-only">
            Quantity
          </label>
          <input
            id="add-to-cart-quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(next)) {
                setQuantity(Math.min(maxQuantity, Math.max(1, next)));
              }
            }}
            className="focus-ring h-11 w-14 border-x border-line-strong bg-transparent text-center text-body text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={increment}
            disabled={quantity >= maxQuantity}
            aria-label={`Increase quantity of ${product.title}`}
            className="focus-ring flex size-11 items-center justify-center text-h3 text-ink transition-colors duration-150 hover:bg-block disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
        <Button.Root type="button" onClick={handleAdd} className="flex-1 landscape:flex-none">
          Add to cart
        </Button.Root>
      </div>
      {added && (
        <p className="text-small text-ink" role="status">
          Added —{" "}
          <a href="/cart" className="focus-ring font-medium underline decoration-1 underline-offset-2">
            View cart
          </a>
        </p>
      )}
    </div>
  );
}

/**
 * Quantity stepper + "Add to cart" for a product detail page. `client:load`
 * (see the product page) — a shopper should be able to add to cart the
 * instant the page is interactive. Wrapped in `AppProviders` so it shares
 * `cartStore` with the header's `CartButton` and every other island.
 */
export function AddToCart({ product }: { product: AddToCartProduct }) {
  return (
    <AppProviders>
      <AddToCartInner product={product} />
    </AppProviders>
  );
}

export default AddToCart;
