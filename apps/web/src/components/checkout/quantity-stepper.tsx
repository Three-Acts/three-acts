import { useState, type ChangeEvent, type FocusEvent } from "react";
import { cn } from "@three-acts/utils";

const MIN = 1;
const DEFAULT_MAX = 99;

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return MIN;
  return Math.min(max, Math.max(MIN, Math.round(value)));
}

type QuantityStepperProps = {
  quantity: number;
  onChange: (next: number) => void;
  /** Accessible name for the control, e.g. `Quantity for Ethiopia Yirgacheffe`. */
  label: string;
  /** Upper bound (e.g. live inventory). Defaults to the cart's own 99-unit cap. */
  max?: number;
  disabled?: boolean;
  className?: string;
};

/**
 * A quantity stepper: minus/plus `<button>`s plus a directly-editable number
 * input, all natively keyboard-operable (real buttons, native number input
 * with working arrow keys). Commits on blur/Enter so a shopper can type a
 * quantity outright instead of clicking +/- repeatedly.
 */
export function QuantityStepper({ quantity, onChange, label, max = DEFAULT_MAX, disabled, className }: QuantityStepperProps) {
  const [draft, setDraft] = useState(String(quantity));
  // Tracks the `quantity` the draft was last synced from. Adjusting state
  // during render (React's documented pattern for "a prop changed, reset
  // some derived state") instead of a `useEffect` — this keeps the visible
  // text in sync when `quantity` changes from outside this control (another
  // tab via the cart store's `storage` sync, a sibling control changing the
  // same line) without an extra post-commit render.
  const [syncedQuantity, setSyncedQuantity] = useState(quantity);
  if (quantity !== syncedQuantity) {
    setSyncedQuantity(quantity);
    setDraft(String(quantity));
  }

  function commit(next: number) {
    const clamped = clamp(next, max);
    setDraft(String(clamped));
    if (clamped !== quantity) onChange(clamped);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value.replace(/[^0-9]/g, ""));
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    commit(Number(event.target.value));
  }

  return (
    <div className={cn("inline-flex items-center border border-line-strong/30", className)}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || quantity <= MIN}
        onClick={() => commit(quantity - 1)}
        className="focus-ring flex size-9 items-center justify-center text-ink transition-colors duration-150 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden="true">−</span>
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={draft}
        disabled={disabled}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(Number(event.currentTarget.value));
          }
        }}
        className="focus-ring h-9 w-11 border-x border-line-strong/30 bg-transparent text-center text-sm text-ink"
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled || quantity >= max}
        onClick={() => commit(quantity + 1)}
        className="focus-ring flex size-9 items-center justify-center text-ink transition-colors duration-150 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}

export default QuantityStepper;
