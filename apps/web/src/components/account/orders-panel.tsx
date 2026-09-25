import type { Order, OrderPaymentStatus, OrderStatus } from "@three-acts/ecommerce";
import { formatDate, formatMoney } from "../../lib/format";
import { Badge, type BadgeTone } from "../ui/badge";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending: "warning",
  paid: "success",
  fulfilled: "accent",
  shipped: "accent",
  refunded: "neutral",
  cancelled: "danger"
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  fulfilled: "Fulfilled",
  shipped: "Shipped",
  refunded: "Refunded",
  cancelled: "Cancelled"
};

const PAYMENT_TONE: Record<OrderPaymentStatus, BadgeTone> = {
  awaiting: "warning",
  authorized: "neutral",
  paid: "success",
  partially_refunded: "warning",
  refunded: "neutral",
  failed: "danger"
};

const PAYMENT_LABEL: Record<OrderPaymentStatus, string> = {
  awaiting: "Payment awaiting",
  authorized: "Payment authorized",
  paid: "Payment received",
  partially_refunded: "Partially refunded",
  refunded: "Payment refunded",
  failed: "Payment failed"
};

type OrdersPanelProps = {
  /** `null` while the list is still loading. */
  orders: Order[] | null;
};

/** Account page "Orders" tab: every order for the signed-in customer, newest first (the API already sorts), each a bordered row expandable for its line items. */
export function OrdersPanel({ orders }: OrdersPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-h3 font-medium text-ink">Your purchases</h2>

      {orders === null && <p className="text-body text-ink">Loading your orders…</p>}

      {orders !== null && orders.length === 0 && (
        <EmptyState.Root
          title="No orders yet"
          description="When you place an order, it will show up here with its status and download details."
          action={
            <Button.Link href="/shop" size="sm">
              Shop the template
            </Button.Link>
          }
        />
      )}

      {orders !== null && orders.length > 0 && (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li key={order.id} className="border border-line-strong bg-surface">
              <details className="group">
                <summary className="focus-ring flex cursor-pointer list-none flex-col gap-3 px-5 py-4 landscape:flex-row landscape:items-center landscape:justify-between [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-ink">{order.orderNumber}</span>
                    <span className="text-small text-ink">
                      {formatDate(order.placedAt)} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge.Root tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge.Root>
                    <Badge.Root tone={PAYMENT_TONE[order.paymentStatus]}>{PAYMENT_LABEL[order.paymentStatus]}</Badge.Root>
                    <span className="text-body font-medium text-ink">{formatMoney(order.total, order.currency)}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="size-4 shrink-0 text-ink transition-transform duration-150 group-open:rotate-180"
                    >
                      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                </summary>
                <div className="border-t border-line px-5 py-4">
                  {order.trackingNumber && (
                    <p className="mb-3 text-small text-ink">
                      Tracking number: <span className="font-medium">{order.trackingNumber}</span>
                    </p>
                  )}
                  <ul className="flex flex-col gap-2">
                    {order.items.map((item) => (
                      <li key={item.slug} className="flex items-center justify-between gap-4 text-body text-ink">
                        <span>
                          {item.title} × {item.quantity}
                        </span>
                        <span>{formatMoney(item.lineTotal, item.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrdersPanel;
