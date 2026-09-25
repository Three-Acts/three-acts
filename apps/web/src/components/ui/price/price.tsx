/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes } from "react";
import { cn } from "@three-acts/utils";

type PriceProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  /** Current price, in major currency units (e.g. `245` for R245.00). */
  amount: number;
  /** Original price before a discount; renders struck through with a "Save X%" badge. */
  compareAtPrice?: number;
  /** ISO 4217 code. Defaults to the storefront currency. */
  currency?: string;
  /** BCP 47 locale for `Intl.NumberFormat`. Defaults to South African English. */
  locale?: string;
};

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
}

/**
 * A product's price, with an optional compare-at (original) price shown
 * struck through alongside a "Save X%" badge. Use on Card.Product and product
 * detail pages; never format currency inline elsewhere.
 */
function Root({ amount, compareAtPrice, currency = "ZAR", locale = "en-ZA", className, ...props }: PriceProps) {
  const onSale = typeof compareAtPrice === "number" && compareAtPrice > amount;
  const savePercent = onSale ? Math.round(((compareAtPrice - amount) / compareAtPrice) * 100) : 0;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)} {...props}>
      <span className="text-lg font-semibold tracking-tight text-ink">{formatMoney(amount, currency, locale)}</span>
      {onSale && (
        <>
          <span className="text-sm text-muted line-through">{formatMoney(compareAtPrice, currency, locale)}</span>
          <span className="inline-flex items-center rounded-card bg-moss px-1.5 py-0.5 text-xs font-semibold uppercase tracking-eyebrow text-panel">
            Save {savePercent}%
          </span>
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
