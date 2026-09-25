import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@three-acts/auth/react";
import { shopApiPaths, type Order } from "@three-acts/ecommerce";
import { readLastOrder } from "../checkout/last-order";
import { OrderSummary } from "../checkout/order-summary";
import { OrderStatusBadge, PaymentStatusBadge } from "../checkout/status-badge";
import { Button } from "../ui/button";
import { Image } from "../ui/image";
import { Notice } from "../ui/notice";
import { apiFetch } from "../../lib/api-client";
import { formatMoney } from "../../lib/format";
import { AppProviders } from "../../lib/providers";

type LoadState = "loading" | "found" | "not-found";

function useOrderNumber(): string | null {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("order");
  }, []);
}

function CheckoutCompleteInner() {
  const { status } = useAuth();
  const orderNumber = useOrderNumber();
  const [order, setOrder] = useState<Order | undefined>(undefined);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    // No `?order=` at all: nothing to resolve — the render below shows the
    // not-found notice directly from `orderNumber` with no state needed.
    // Also wait out "initializing" so a signed-in shopper gets the live GET,
    // not just the sessionStorage copy, once the session restore resolves.
    if (!orderNumber || status === "initializing") return;

    let cancelled = false;

    // `number` is passed as a parameter rather than closed over: TypeScript
    // doesn't carry the `if (!orderNumber)` narrowing above into a nested
    // function.
    async function resolveOrder(number: string) {
      // A guest never calls the API (it 401s with no session) — but every
      // setState below still runs after a microtask yield, so the guest and
      // signed-in paths have the same async-continuation shape.
      await Promise.resolve();
      if (cancelled) return;

      if (status === "authenticated") {
        try {
          const response = await apiFetch<{ order: Order }>(shopApiPaths.order(number));
          if (cancelled) return;
          setOrder(response.order);
          setLoadState("found");
          return;
        } catch {
          // Fall through to the sessionStorage fallback below — e.g. this
          // order belongs to a different customer, or the API is unreachable.
        }
      }

      if (cancelled) return;
      const fallback = readLastOrder(number);
      setOrder(fallback);
      setLoadState(fallback ? "found" : "not-found");
    }

    void resolveOrder(orderNumber);

    return () => {
      cancelled = true;
    };
  }, [orderNumber, status]);

  if (!orderNumber || loadState === "not-found" || !order) {
    return (
      <Notice.Root tone="error" title="We couldn't find that order">
        Check the link you followed, or{" "}
        <a href="/shop" className="focus-ring font-semibold underline underline-offset-2">
          keep shopping
        </a>
        . If you just placed this order while signed in, it should also appear in{" "}
        <a href="/account" className="focus-ring font-semibold underline underline-offset-2">
          your account
        </a>
        .
      </Notice.Root>
    );
  }

  if (loadState === "loading") {
    return <Notice.Root tone="info">Loading your order…</Notice.Root>;
  }

  return (
    <div className="flex flex-col gap-10 landscape:grid landscape:grid-cols-[1fr_360px] landscape:items-start">
      <div className="order-last flex flex-col gap-8 landscape:order-first">
        <div className="flex flex-col gap-3 border-b border-line pb-6">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-moss">Order {order.orderNumber}</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Thank you, {order.customerName.split(/\s+/)[0]}.</h1>
          <p className="text-sm leading-6 text-muted">
            A confirmation has been sent to <span className="font-medium text-ink">{order.customerEmail}</span>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge paymentStatus={order.paymentStatus} paymentMethod={order.paymentMethod} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-serif text-lg font-semibold tracking-tight text-ink">Items</h2>
          <ul className="flex flex-col divide-y divide-line border border-line bg-surface-raised">
            {order.items.map((item) => (
              <li key={item.slug} className="flex items-center gap-4 p-4">
                <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden border border-line bg-surface">
                  {item.image ? (
                    <Image src={item.image} alt={item.title} width={128} height={128} className="size-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="text-xs text-muted">
                      No image
                    </span>
                  )}
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-ink">{item.title}</span>
                  <span className="text-xs text-muted">
                    Qty {item.quantity} × {formatMoney(item.unitPrice, item.currency)}
                  </span>
                </div>
                <span className="text-sm font-semibold text-ink">{formatMoney(item.lineTotal, item.currency)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-lg font-semibold tracking-tight text-ink">Delivery address</h2>
          <address className="not-italic text-sm leading-6 text-muted">
            {order.shippingName}
            <br />
            {order.shippingAddress}
            <br />
            {order.shippingCity}, {order.shippingPostalCode}
            <br />
            {order.shippingCountry}
          </address>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button.Link href="/shop" size="lg">
            Continue shopping
          </Button.Link>
          {status === "authenticated" && (
            <Button.Link href="/account" variant="secondary" size="lg">
              View your orders
            </Button.Link>
          )}
        </div>

        {status !== "authenticated" && (
          <Notice.Root tone="info" title="Keep track of this order">
            Create an account to see your order history and track this order over time.{" "}
            <a href="/sign-up" className="focus-ring font-semibold underline underline-offset-2">
              Sign up
            </a>
            .
          </Notice.Root>
        )}
      </div>

      <div className="order-first landscape:order-last">
        <OrderSummary breakdown={order} discountCode={order.discountCode || undefined} />
      </div>
    </div>
  );
}

/**
 * `/checkout/complete?order=FF-10822` — the order confirmation. Signed-in
 * shoppers get the live order via `GET /shop/orders/:orderNumber`; everyone
 * else (and a failed/unauthorized fetch) falls back to the copy the checkout
 * island stashed in `sessionStorage` right after placing the order. Wrapped
 * in `AppProviders` (see `src/lib/providers.tsx`) so `useAuth()` shares the
 * same session as the rest of the site.
 */
export function CheckoutComplete() {
  return (
    <AppProviders>
      <CheckoutCompleteInner />
    </AppProviders>
  );
}

export default CheckoutComplete;
