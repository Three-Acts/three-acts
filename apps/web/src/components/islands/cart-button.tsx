import { useCart } from "@three-acts/ecommerce/react";
import { cn } from "@three-acts/utils";
import { AppProviders } from "../../lib/providers";

const LINK_CLASS = "focus-ring inline-flex items-center gap-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:text-accent";

function CartButtonInner() {
  const { itemCount } = useCart();
  return (
    <a href="/cart" className={LINK_CLASS}>
      Cart
      {itemCount > 0 && (
        <span
          className={cn(
            "inline-flex min-w-5 items-center justify-center rounded-card border border-accent bg-accent px-1 text-xs font-semibold leading-none text-panel"
          )}
        >
          {itemCount}
        </span>
      )}
    </a>
  );
}

/**
 * Header cart link with a live item-count badge. Wrapped in `AppProviders`
 * (see `src/lib/providers.tsx`) so it shares `cartStore` with every other
 * island on the page/site. During SSR (and before hydration) `useCart()`
 * reads the store's zero-item server snapshot, so this renders a plain
 * "Cart" link with no badge — the correct zero-JS fallback.
 */
export function CartButton() {
  return (
    <AppProviders>
      <CartButtonInner />
    </AppProviders>
  );
}

export default CartButton;
