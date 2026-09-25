import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import { useCart } from "@three-acts/ecommerce/react";
import { availabilityLabel, isPurchasable, priceCart, shopConfig, type CartLine, type Product } from "@three-acts/ecommerce";
import { FreeShippingProgress } from "../checkout/free-shipping-progress";
import { OrderSummary } from "../checkout/order-summary";
import { indexBySlug, loadProducts } from "../checkout/product-catalogue";
import { QuantityStepper } from "../checkout/quantity-stepper";
import { useValidatedDiscount } from "../checkout/use-validated-discount";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { Field } from "../ui/field";
import { Image } from "../ui/image";
import { Notice } from "../ui/notice";
import { AppProviders } from "../../lib/providers";
import { formatMoney } from "../../lib/format";

type ResolvedLine = { line: CartLine; product: Product | undefined; purchasable: boolean };

type CartLineRowProps = ResolvedLine & {
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
};

/**
 * One cart line. A stand-alone component (rather than inlined in the list
 * `.map`) so an early return can narrow `product` from `Product | undefined`
 * to `Product` for the rest of the render — a flagged line (product deleted,
 * unpublished, or no longer purchasable) only ever shows what's still known
 * (the slug, or the product's own availability label) plus Remove.
 */
function CartLineRow({ line, product, purchasable, onQuantityChange, onRemove }: CartLineRowProps) {
  if (!product || !purchasable) {
    return (
      <li className="flex flex-col gap-4 p-5 landscape:flex-row landscape:items-center">
        <div className="flex flex-1 items-center gap-4">
          <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden border border-line bg-surface" aria-hidden="true">
            <span className="text-xs text-muted">No image</span>
          </span>
          <div className="flex flex-col gap-1.5">
            <span className="font-serif text-base font-semibold text-ink">{product?.title ?? line.slug}</span>
            <Badge.Root tone="danger">{product ? availabilityLabel(product) : "No longer available"}</Badge.Root>
          </div>
        </div>
        <div className="flex items-center justify-between gap-6 landscape:justify-end">
          <span className="text-sm text-muted">Qty {line.quantity}</span>
          <Button.Root type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button.Root>
        </div>
      </li>
    );
  }

  const image = product.images[0];

  return (
    <li className="flex flex-col gap-4 p-5 landscape:flex-row landscape:items-center">
      <div className="flex flex-1 items-center gap-4">
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden border border-line bg-surface">
          {image ? (
            <Image src={image.src} alt={image.alt} width={160} height={160} className="size-full object-cover" />
          ) : (
            <span aria-hidden="true" className="text-xs text-muted">
              No image
            </span>
          )}
        </span>
        <div className="flex flex-col gap-1.5">
          <a href={`/shop/${product.slug}`} className="focus-ring font-serif text-base font-semibold text-ink hover:text-accent">
            {product.title}
          </a>
          <span className="text-sm text-muted">{formatMoney(product.price, product.currency)} each</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-6 landscape:justify-end">
        <QuantityStepper
          quantity={line.quantity}
          onChange={onQuantityChange}
          max={product.availability === "preorder" ? 99 : Math.max(1, product.inventory)}
          label={`Quantity for ${product.title}`}
        />
        <span className="w-20 shrink-0 text-right text-sm font-semibold text-ink">{formatMoney(product.price * line.quantity, product.currency)}</span>
        <Button.Root type="button" variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button.Root>
      </div>
    </li>
  );
}

function CartPageInner() {
  const { cart, lines, setQuantity, remove, setDiscountCode } = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [discountInput, setDiscountInput] = useState("");
  // The exact reason string the shopper dismissed, not a plain boolean — so
  // a *new* stale reason (a different discount code going stale later)
  // reads as "not dismissed" purely by comparison, with no effect needed to
  // reset a flag when `staleReason` changes.
  const [dismissedStaleReason, setDismissedStaleReason] = useState<string | undefined>(undefined);

  const { discount, checking: discountChecking, staleReason, applyError, apply, remove: removeDiscount } = useValidatedDiscount(cart, setDiscountCode);

  useEffect(() => {
    let cancelled = false;
    loadProducts()
      .then((list) => {
        if (cancelled) return;
        setProducts(list);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load the shop's products.");
      });
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  const catalogue = useMemo(() => (products ? indexBySlug(products) : null), [products]);

  const resolvedLines: ResolvedLine[] = useMemo(() => {
    if (!catalogue) return [];
    return lines.map((line) => {
      const product = catalogue.get(line.slug);
      return { line, product, purchasable: product ? isPurchasable(product) : false };
    });
  }, [lines, catalogue]);

  const validLines = useMemo(
    () =>
      resolvedLines.filter(
        (entry): entry is ResolvedLine & { product: Product } => Boolean(entry.product) && entry.purchasable
      ),
    [resolvedLines]
  );

  const breakdown = useMemo(
    () =>
      priceCart(
        validLines.map((entry) => ({ product: entry.product, quantity: entry.line.quantity })),
        { discount, shippingMethod: "domestic", country: shopConfig.shipping.domesticCountry }
      ),
    [validLines, discount]
  );

  async function handleApplyDiscount(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await apply(discountInput);
    if (ok) setDiscountInput("");
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState.Root
        title="Your cart is empty"
        description="Browse the shop and add something worth waking up for."
        action={
          <Button.Link href="/shop" size="lg">
            Continue shopping
          </Button.Link>
        }
      />
    );
  }

  const stillLoading = products === null && !loadError;

  return (
    <div className="flex flex-col gap-10 landscape:grid landscape:grid-cols-[1fr_360px] landscape:items-start">
      <div className="order-last flex flex-col gap-6 landscape:order-first">
        {loadError && (
          <Notice.Root tone="error" title="Couldn't load the shop">
            {loadError}{" "}
            <button type="button" onClick={() => setRetryToken((token) => token + 1)} className="focus-ring font-semibold underline underline-offset-2">
              Try again
            </button>
          </Notice.Root>
        )}
        {stillLoading && <Notice.Root tone="info">Loading your cart…</Notice.Root>}

        {!stillLoading && (
          <ul className="flex flex-col divide-y divide-line border border-line bg-surface-raised">
            {resolvedLines.map((entry) => (
              <CartLineRow
                key={entry.line.slug}
                {...entry}
                onQuantityChange={(next) => setQuantity(entry.line.slug, next)}
                onRemove={() => remove(entry.line.slug)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="order-first flex flex-col gap-4 landscape:order-last">
        <OrderSummary
          breakdown={breakdown}
          discountCode={discount?.code}
          note="Estimated · confirmed at checkout"
          footer={
            <>
              <FreeShippingProgress merchandiseInclVat={breakdown.merchandiseInclVat} freeShipping={breakdown.freeShipping} currency={breakdown.currency} />

              {staleReason && staleReason !== dismissedStaleReason && (
                <Notice.Root tone="error" className="text-xs">
                  Your discount code is no longer valid: {staleReason}{" "}
                  <button type="button" onClick={() => setDismissedStaleReason(staleReason)} className="focus-ring font-semibold underline underline-offset-2">
                    Dismiss
                  </button>
                </Notice.Root>
              )}

              {discount ? (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-moss">
                    Code <span className="font-semibold">{discount.code}</span> applied
                  </span>
                  <button type="button" onClick={removeDiscount} className="focus-ring text-xs font-semibold text-muted underline underline-offset-2 hover:text-ink">
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyDiscount} className="flex flex-col gap-2">
                  <Field.Root label="Discount code" id="discount-code" error={applyError} className="gap-1.5">
                    <div className="flex gap-2">
                      <Field.Input
                        value={discountInput}
                        onChange={(event) => setDiscountInput(event.target.value)}
                        placeholder="WELCOME10"
                        autoComplete="off"
                      />
                      <Button.Root type="submit" variant="secondary" size="md" loading={discountChecking}>
                        Apply
                      </Button.Root>
                    </div>
                  </Field.Root>
                </form>
              )}

              <Button.Link href="/checkout" size="lg" className="w-full justify-center">
                Proceed to checkout
              </Button.Link>
            </>
          }
        />
      </div>
    </div>
  );
}

/**
 * `/cart` — reads the shared cart store, resolves lines against the live
 * catalogue (`GET /shop/products`), and prices an estimate for the domestic
 * shipping method (checkout re-prices with the shopper's actual method).
 * Wrapped in `AppProviders` (see `src/lib/providers.tsx`) so it shares
 * `cartStore` with the header's `CartButton` and every other island.
 */
export function CartPage() {
  return (
    <AppProviders>
      <CartPageInner />
    </AppProviders>
  );
}

export default CartPage;
