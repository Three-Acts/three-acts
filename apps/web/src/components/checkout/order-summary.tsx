import type { HTMLAttributes, ReactNode } from "react";
import type { PriceBreakdown } from "@three-acts/ecommerce";
import { cn } from "@three-acts/utils";
import { formatMoney } from "../../lib/format";

type RowProps = { label: ReactNode; value: ReactNode; muted?: boolean; strong?: boolean };

function Row({ label, value, muted, strong }: RowProps) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 text-sm", muted && "text-muted", strong && "text-base font-semibold text-ink")}>
      <span>{label}</span>
      <span className={cn(strong && "font-serif")}>{value}</span>
    </div>
  );
}

type OrderSummaryProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  /** A `PriceBreakdown` — or anything that extends one, e.g. an `Order`. */
  breakdown: PriceBreakdown;
  /** The code to label the discount row with, when `breakdown.discountTotal > 0`. */
  discountCode?: string;
  /** e.g. "Estimated · confirmed at checkout" on the cart page. Omit on checkout/confirmation, where the breakdown is final. */
  note?: ReactNode;
  /** Rendered below the totals — free-shipping progress, the discount-code form, a submit button. */
  footer?: ReactNode;
};

/**
 * The shop's one price-breakdown display: subtotal, discount, shipping, tax,
 * total. Shared by the cart page (a live estimate), checkout (a live
 * quote for the chosen method/country) and the order confirmation (the
 * order's own final numbers) — same shape (`PriceBreakdown`), same layout,
 * different `note`/`footer` slots.
 */
export function OrderSummary({ breakdown, discountCode, note, footer, className, ...props }: OrderSummaryProps) {
  const { currency } = breakdown;
  return (
    <div className={cn("flex flex-col gap-4 border border-line bg-surface-raised p-6", className)} {...props}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-lg font-semibold tracking-tight text-ink">Order summary</h2>
        <span className="text-xs text-muted">
          {breakdown.itemCount} {breakdown.itemCount === 1 ? "item" : "items"}
        </span>
      </div>

      {note && <p className="text-xs text-muted">{note}</p>}

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <Row label="Subtotal" value={formatMoney(breakdown.subtotal, currency)} />
        {breakdown.discountTotal > 0 && (
          <Row label={discountCode ? `Discount (${discountCode})` : "Discount"} value={`−${formatMoney(breakdown.discountTotal, currency)}`} muted />
        )}
        <Row label="Shipping" value={breakdown.freeShipping ? "Free" : formatMoney(breakdown.shippingTotal, currency)} />
        <Row label="VAT" value={formatMoney(breakdown.taxTotal, currency)} muted />
      </div>

      <div className="border-t border-line pt-4">
        <Row label="Total" value={formatMoney(breakdown.total, currency)} strong />
      </div>

      {footer && <div className="flex flex-col gap-4 border-t border-line pt-4">{footer}</div>}
    </div>
  );
}

export default OrderSummary;
