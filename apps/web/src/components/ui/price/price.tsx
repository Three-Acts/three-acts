/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes } from "react";
import { cn } from "@three-acts/utils";
import { Badge } from "../badge";

type PriceProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  /** Current price, in major currency units (e.g. `245` for R245.00). */
  amount: number;
  /** Original price before a discount; renders struck through with a "Save X%" badge. */
  compareAtPrice?: number;
  /** ISO 4217 code. Defaults to the storefront currency. */
  currency?: string;
  /** BCP 47 locale for `Intl.NumberFormat`. Defaults to US English. */
  locale?: string;
};

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
}

/**
 * A product's price, with an optional compare-at (original) price shown
 * struck through alongside a "Save X%" outline badge. Use on Card.Product and
 * product detail pages; never format currency inline elsewhere.
 */
function Root({ amount, compareAtPrice, currency = "USD", locale = "en-US", className, ...props }: PriceProps) {
  const onSale = typeof compareAtPrice === "number" && compareAtPrice > amount;
  const savePercent = onSale ? Math.round(((compareAtPrice - amount) / compareAtPrice) * 100) : 0;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2 text-body text-ink", className)} {...props}>
      <span>{formatMoney(amount, currency, locale)}</span>
      {onSale && (
        <>
          <span className="text-small line-through">{formatMoney(compareAtPrice, currency, locale)}</span>
          <Badge.Root variant="outline">Save {savePercent}%</Badge.Root>
        </>
      )}
    </div>
  );
}

export const Price = {
  Root
};

export { formatMoney };
export type { PriceProps };
