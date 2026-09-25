import type { Order } from "@three-acts/ecommerce";

/**
 * `sessionStorage` key the checkout island stashes the just-placed `Order`
 * under, and the confirmation island falls back to reading — for a guest
 * checkout (no shop session), it's the only source `/checkout/complete` has;
 * for a signed-in shopper it's the immediate fallback while
 * `GET /shop/orders/:orderNumber` is in flight (or if that call fails).
 */
export const LAST_ORDER_STORAGE_KEY = "three-acts:last-order";

/** Best-effort write — `sessionStorage` can throw (private browsing, disabled storage, quota); a failure here shouldn't break checkout. */
export function writeLastOrder(order: Order): void {
  try {
    window.sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Ignored — the order still succeeded; the confirmation page just won't have a session fallback.
  }
}

function isOrder(value: unknown): value is Order {
  return typeof value === "object" && value !== null && typeof (value as { orderNumber?: unknown }).orderNumber === "string";
}

/** Reads back the stashed order, only when it matches `orderNumber` — guards against showing a stale previous order for an arbitrary `?order=` value. */
export function readLastOrder(orderNumber: string): Order | undefined {
  try {
    const raw = window.sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isOrder(parsed) && parsed.orderNumber === orderNumber ? parsed : undefined;
  } catch {
    return undefined;
  }
}
