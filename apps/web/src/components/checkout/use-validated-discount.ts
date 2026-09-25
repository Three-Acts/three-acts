import { useCallback, useEffect, useState } from "react";
import { shopApiPaths, type Cart, type Discount, type ValidateDiscountResponse } from "@three-acts/ecommerce";
import { apiFetch } from "../../lib/api-client";

export type UseValidatedDiscountResult = {
  /** The resolved `Discount` for `cart.discountCode`, once validated. `undefined` while checking, absent, or invalid. */
  discount: Discount | undefined;
  /** True while the initial/auto validation (on a changed `cart.discountCode`) or a manual `apply()` is in flight. */
  checking: boolean;
  /**
   * Set when a *persisted* `cart.discountCode` (e.g. from a previous visit)
   * turned out to no longer be redeemable — the hook clears it from the cart
   * automatically, but keeps the reason around for the UI to surface once.
   */
  staleReason: string | undefined;
  /** The reason a manual `apply()` call most recently failed. */
  applyError: string | undefined;
  /** Validates `code`; on success stores it on the cart (`setDiscountCode`) and resolves `true`. */
  apply: (code: string) => Promise<boolean>;
  /** Clears the applied discount from the cart and this hook's state. */
  remove: () => void;
};

/**
 * Resolves `cart.discountCode` (just the code string, persisted on the cart)
 * into the full `Discount` object (`kind`/`amount`/`minimumSubtotal`) that
 * `priceCart` needs, via `POST /shop/discounts/validate` — and keeps it
 * fresh across the two ways a discount reaches the cart: the shopper typing
 * one in (`apply`) or a code already sitting in `localStorage` from a prior
 * session (the mount effect below).
 *
 * Deliberately does NOT re-validate on every cart-line change: `priceCart`
 * already recomputes `discountTotal` from the current subtotal against the
 * cached `Discount.minimumSubtotal` with no round trip needed. Only the code
 * itself (existence/active/window/usage-limit) requires the network.
 */
export function useValidatedDiscount(cart: Cart, setDiscountCode: (code: string | undefined) => void): UseValidatedDiscountResult {
  // Only the *last resolved* code + its `Discount` are stored — whether
  // there's currently a discount to show is derived below, not synced via a
  // second effect. That keeps this to one setState per real event (a
  // request landing) instead of also resetting on every render where
  // `cart.discountCode` merely doesn't match yet.
  const [resolved, setResolved] = useState<{ code: string; discount: Discount } | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const [staleReason, setStaleReason] = useState<string | undefined>(undefined);
  const [applyError, setApplyError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const code = cart.discountCode;
    if (!code) {
      return;
    }

    let cancelled = false;

    // `setChecking(true)` deliberately isn't the effect's first synchronous
    // statement — it runs after a microtask yield, in the same async
    // continuation as the request it describes, matching the shape of every
    // other setState call here (all inside `.then`/`.catch`/`.finally`).
    // `code` is passed as a parameter rather than closed over: TypeScript
    // doesn't carry the `if (!code)` narrowing above into a nested function.
    async function run(discountCode: string) {
      await Promise.resolve();
      if (cancelled) return;
      setChecking(true);

      try {
        const response = await apiFetch<ValidateDiscountResponse>(shopApiPaths.validateDiscount(), {
          method: "POST",
          body: JSON.stringify({ code: discountCode, lines: cart.lines })
        });
        if (cancelled) return;
        if (response.valid && response.discount) {
          setResolved({ code: discountCode, discount: response.discount });
          setStaleReason(undefined);
        } else {
          setStaleReason(response.reason ?? "That discount code is no longer valid.");
          setDiscountCode(undefined);
        }
      } catch {
        // Leave `resolved` as-is — the derived `discount` below already
        // reads as absent once it no longer matches `cart.discountCode`.
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void run(code);

    return () => {
      cancelled = true;
    };
    // `cart.lines` is intentionally excluded — see the docstring above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.discountCode, setDiscountCode]);

  // Derived, not synced: `resolved` only reflects `cart.discountCode` once
  // the request for THAT code has landed. If the cart's code has since
  // changed (or been cleared) faster than the request, this reads as "no
  // discount" for a render or two rather than briefly showing a stale one.
  const discount = cart.discountCode && resolved?.code === cart.discountCode ? resolved.discount : undefined;

  const apply = useCallback(
    async (rawCode: string): Promise<boolean> => {
      const code = rawCode.trim();
      if (!code) {
        setApplyError("Enter a discount code.");
        return false;
      }
      setChecking(true);
      setApplyError(undefined);
      try {
        const response = await apiFetch<ValidateDiscountResponse>(shopApiPaths.validateDiscount(), {
          method: "POST",
          body: JSON.stringify({ code, lines: cart.lines })
        });
        if (response.valid && response.discount) {
          setResolved({ code: response.discount.code, discount: response.discount });
          setStaleReason(undefined);
          setDiscountCode(response.discount.code);
          return true;
        }
        setApplyError(response.reason ?? "That discount code isn't valid.");
        return false;
      } catch (error) {
        setApplyError(error instanceof Error ? error.message : "Something went wrong. Try again.");
        return false;
      } finally {
        setChecking(false);
      }
    },
    [cart.lines, setDiscountCode]
  );

  const remove = useCallback(() => {
    setStaleReason(undefined);
    setApplyError(undefined);
    setDiscountCode(undefined);
  }, [setDiscountCode]);

  return { discount, checking, staleReason, applyError, apply, remove };
}
