import type { OrderPaymentStatus, OrderStatus, PaymentMethod } from "@three-acts/ecommerce";
import { Badge, type BadgeTone } from "../ui/badge";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  fulfilled: "Fulfilled",
  shipped: "Shipped",
  refunded: "Refunded",
  cancelled: "Cancelled"
};

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending: "warning",
  paid: "success",
  fulfilled: "success",
  shipped: "accent",
  refunded: "neutral",
  cancelled: "danger"
};

const PAYMENT_LABEL: Record<OrderPaymentStatus, string> = {
  awaiting: "Awaiting payment",
  authorized: "Authorized",
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  failed: "Failed"
};

const PAYMENT_TONE: Record<OrderPaymentStatus, BadgeTone> = {
  awaiting: "warning",
  authorized: "accent",
  paid: "success",
  partially_refunded: "neutral",
  refunded: "neutral",
  failed: "danger"
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge.Root tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge.Root>;
}

/**
 * The payment-status badge — an EFT order that's still `awaiting` gets its
 * own, more informative label (bank details are emailed, not shown here)
 * instead of the generic "Awaiting payment".
 */
export function PaymentStatusBadge({ paymentStatus, paymentMethod }: { paymentStatus: OrderPaymentStatus; paymentMethod: PaymentMethod }) {
  const label = paymentStatus === "awaiting" && paymentMethod === "eft" ? "Awaiting EFT — bank details sent by email" : PAYMENT_LABEL[paymentStatus];
  return <Badge.Root tone={PAYMENT_TONE[paymentStatus]}>{label}</Badge.Root>;
}
