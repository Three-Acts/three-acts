import { shopConfig } from "@three-acts/ecommerce";
import { formatMoney } from "../../lib/format";

type FreeShippingProgressProps = {
  /** VAT-inclusive merchandise total (`PriceBreakdown.merchandiseInclVat`) counted toward the threshold. */
  merchandiseInclVat: number;
  freeShipping: boolean;
  currency: string;
};

/** A progress line toward `shopConfig.shipping.freeOverInclVat` — shown in the cart's order summary. */
export function FreeShippingProgress({ merchandiseInclVat, freeShipping, currency }: FreeShippingProgressProps) {
  const threshold = shopConfig.shipping.freeOverInclVat;
  const percent = Math.min(100, Math.round((merchandiseInclVat / threshold) * 100));
  const remaining = Math.max(0, threshold - merchandiseInclVat);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-ink">
        {freeShipping ? (
          <span className="font-medium text-moss">You&apos;ve unlocked free shipping.</span>
        ) : (
          <>
            Add <span className="font-medium">{formatMoney(remaining, currency)}</span> more for free shipping.
          </>
        )}
      </p>
      <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progress toward free shipping" className="h-1.5 w-full overflow-hidden bg-line">
        <div className="h-full bg-moss transition-[width] duration-300" style={{ width: `${freeShipping ? 100 : percent}%` }} />
      </div>
    </div>
  );
}

export default FreeShippingProgress;
