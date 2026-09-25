import { randomUUID } from "node:crypto";
import type { OrderPaymentStatus, PaymentMethod } from "@three-acts/ecommerce";
import { ApiError } from "../http";

export type ChargeInput = {
  amount: number;
  currency: string;
  method: PaymentMethod;
  orderNumber: string;
  customerEmail: string;
};

export type ChargeResult = {
  paymentStatus: OrderPaymentStatus;
  /** Provider-side reference for the charge, when one exists. */
  reference?: string;
};

/**
 * Provider-neutral seam for taking payment during checkout. `checkout.ts`
 * never talks to a processor directly — it charges through whichever
 * `PaymentProvider` `getPaymentProvider()` resolves, so swapping providers
 * never touches the checkout flow.
 *
 * To plug in a real provider (Stripe, PayFast, ...):
 * 1. Implement this interface in its own file (e.g. `payments-stripe.ts`),
 *    calling the processor's server SDK/API from `charge()` and mapping its
 *    result onto `OrderPaymentStatus` (a synchronous card charge -> "paid" or
 *    "failed"; a redirect/EFT-style flow that settles later -> "awaiting",
 *    the same way `MockPaymentProvider` treats `eft`). Throw `ApiError` for
 *    hard failures (e.g. the processor rejects the request) rather than
 *    returning a fabricated status.
 * 2. Add its own gating env var (e.g. `STRIPE_SECRET_KEY`) and register the
 *    provider in `getPaymentProvider()` below, keyed off `PAYMENT_PROVIDER`.
 * 3. If the provider needs a webhook (e.g. Stripe payment_intent.succeeded)
 *    to confirm an async charge, add a route that calls `updateSystemRecord`
 *    on the order once the webhook fires — `checkout()` doesn't need to
 *    change for that; it already records "awaiting" and moves on.
 */
export interface PaymentProvider {
  readonly name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
}

/**
 * Local dev / demo provider: never talks to a real processor. `card`,
 * `apple_pay`, `paypal` and `gift_card` settle immediately ("paid", with a
 * fake `mock_<random>` reference); `eft` comes back "awaiting" — instant EFT
 * confirmations arrive asynchronously in real life, mirrored by the seed data
 * (a chunk of pending EFT orders sit "awaiting").
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (input.method === "eft") {
      return { paymentStatus: "awaiting" };
    }
    return { paymentStatus: "paid", reference: `mock_${randomUUID().replace(/-/g, "").slice(0, 16)}` };
  }
}

/**
 * Resolves the active `PaymentProvider` from `PAYMENT_PROVIDER` (unset
 * defaults to "mock", matching every other backend-selection env var in this
 * app). Any other value throws a 503 rather than silently falling back, so a
 * misconfigured deployment never charges through the wrong (or no) provider.
 */
export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER || "mock";
  if (configured !== "mock") {
    throw new ApiError(503, "payment_unconfigured", `Unknown payment provider "${configured}". Only "mock" is implemented today — set PAYMENT_PROVIDER=mock.`);
  }
  return new MockPaymentProvider();
}
