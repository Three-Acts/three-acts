import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import { useAuth } from "@three-acts/auth/react";
import { useCart } from "@three-acts/ecommerce/react";
import {
  isPurchasable,
  priceCart,
  shopApiPaths,
  shopConfig,
  type Customer,
  type CheckoutRequest,
  type CheckoutResponse,
  type PaymentMethod,
  type Product
} from "@three-acts/ecommerce";
import { ApiRequestError } from "@three-acts/utils";
import { checkoutErrorField } from "../checkout/checkout-errors";
import { SHIPPING_COUNTRIES } from "../checkout/countries";
import { writeLastOrder } from "../checkout/last-order";
import { OrderSummary } from "../checkout/order-summary";
import { indexBySlug, loadProducts } from "../checkout/product-catalogue";
import { useValidatedDiscount } from "../checkout/use-validated-discount";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";
import { apiFetch } from "../../lib/api-client";
import { AppProviders } from "../../lib/providers";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Every order here ships nothing (digital products) — the checkout API still requires a `shipping.method`, so this is always sent as-is. */
const SHIPPING_METHOD = "domestic";

const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string; helper: string }[] = [
  { value: "card", label: "Card", helper: "Captured immediately." },
  { value: "paypal", label: "PayPal", helper: "Captured immediately." },
  { value: "apple_pay", label: "Apple Pay", helper: "Captured immediately." },
  { value: "eft", label: "EFT", helper: "Awaits payment — bank details are emailed to you once you place the order." }
];

type FormErrors = Record<string, string>;

function CheckoutFormInner() {
  const { user, status } = useAuth();
  const { cart, lines, clear, setDiscountCode } = useCart();

  const [products, setProducts] = useState<Product[] | null>(null);
  const prefilledRef = useRef(false);

  const [contactName, setContactName] = useState("");
  // The guest-typed draft. When signed in, the *displayed* email is derived
  // below as `user.email` instead — locking it needs no effect to sync a
  // second piece of state, just a render-time choice between the two.
  const [contactEmailDraft, setContactEmailDraft] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // The shopper's own edits. The *displayed* billing name is derived below
  // (mirrors `contactName` until touched) rather than kept in sync via an
  // effect — see the `billingName` const.
  const [billingNameDraft, setBillingNameDraft] = useState("");
  const [billingNameTouched, setBillingNameTouched] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState<string>(shopConfig.shipping.domesticCountry);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [topError, setTopError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const { discount } = useValidatedDiscount(cart, setDiscountCode);

  // Derived, not synced via an effect: the billing name mirrors the contact
  // name until the shopper edits it directly (`billingNameTouched` flips
  // permanently on that first edit).
  const billingName = billingNameTouched ? billingNameDraft : contactName;

  // Derived, not synced via an effect: once signed in, the email is always
  // the session's own address (locked/disabled in the JSX below) — checkout
  // can never place an order under a different email than the account it
  // attaches to (the API enforces this too). Guests see their own draft.
  const contactEmail = status === "authenticated" && user ? user.email : contactEmailDraft;

  // Prefill from the account once, on sign-in — never overwrites something the shopper already typed.
  useEffect(() => {
    if (status !== "authenticated" || prefilledRef.current) return;
    prefilledRef.current = true;
    apiFetch<{ customer: Customer }>("/auth/account")
      .then(({ customer }) => {
        setContactName((current) => current || customer.name);
        setContactPhone((current) => current || customer.phone);
        setAddress((current) => current || customer.address);
        setCity((current) => current || customer.city);
        setPostalCode((current) => current || customer.postalCode);
        if (customer.country) {
          setCountry((current) => (current === shopConfig.shipping.domesticCountry ? customer.country : current));
        }
        setMarketingOptIn((current) => current || customer.marketingOptIn);
      })
      .catch(() => {
        // Fail silently — the shopper just fills the form in themselves.
      });
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    loadProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch(() => {
        // The summary just stays in its loading state; checkout itself doesn't need the client-side catalogue — the API re-resolves every line.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const breakdown = useMemo(() => {
    if (!products) return undefined;
    const catalogue = indexBySlug(products);
    const validLines = lines
      .map((line) => ({ line, product: catalogue.get(line.slug) }))
      .filter((entry): entry is { line: (typeof lines)[number]; product: Product } => entry.product !== undefined && isPurchasable(entry.product));
    return priceCart(
      validLines.map((entry) => ({ product: entry.product, quantity: entry.line.quantity })),
      { discount, shippingMethod: SHIPPING_METHOD, country }
    );
  }, [products, lines, discount, country]);

  function buildShippingPayload(): CheckoutRequest["shipping"] {
    return {
      name: billingName.trim(),
      address: address.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      country,
      method: SHIPPING_METHOD
    };
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!contactName.trim()) next.name = "Enter your full name.";
    if (!contactEmail.trim()) next.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(contactEmail.trim())) next.email = "Enter a valid email address.";

    if (!billingName.trim()) next.shippingName = "Enter a billing name.";
    if (!address.trim()) next.address = "Enter your address.";
    if (!city.trim()) next.city = "Enter a city.";
    if (!postalCode.trim()) next.postalCode = "Enter a postal code.";
    return next;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setTopError("Please fix the highlighted fields below.");
      return;
    }

    setTopError(undefined);
    setSubmitting(true);

    const request: CheckoutRequest = {
      lines: cart.lines,
      customer: {
        name: contactName.trim(),
        email: contactEmail.trim(),
        ...(contactPhone.trim() ? { phone: contactPhone.trim() } : {})
      },
      shipping: buildShippingPayload(),
      paymentMethod,
      marketingOptIn,
      ...(cart.discountCode ? { discountCode: cart.discountCode } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {})
    };

    try {
      const { order } = await apiFetch<CheckoutResponse>(shopApiPaths.checkout(), {
        method: "POST",
        body: JSON.stringify(request)
      });
      clear();
      writeLastOrder(order);
      window.location.assign(`/checkout/complete?order=${encodeURIComponent(order.orderNumber)}`);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const field = error.code === "validation_error" ? checkoutErrorField(error.message) : undefined;
        if (field) setErrors({ [field]: error.message });
        setTopError(error.message);
      } else {
        setTopError("Something went wrong placing your order. Try again.");
      }
      setSubmitting(false);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState.Root
        title="Your cart is empty"
        description="Add something to your cart before checking out."
        action={
          <Button.Link href="/shop" size="lg">
            Go to the shop
          </Button.Link>
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10 landscape:grid landscape:grid-cols-[1fr_360px] landscape:items-start">
      <div className="order-last flex flex-col gap-8 landscape:order-first">
        {topError && (
          <Notice.Root tone="error" title="Couldn't place your order">
            {topError}
          </Notice.Root>
        )}

        <fieldset className="flex flex-col gap-4 border border-line-strong bg-surface p-6">
          <legend className="mb-1 text-h3 font-medium tracking-ui text-ink">Contact</legend>
          <div className="grid gap-4 landscape:grid-cols-2">
            <Field.Root label="Full name" required error={errors.name}>
              <Field.Input value={contactName} onChange={(event) => setContactName(event.target.value)} autoComplete="name" required />
            </Field.Root>
            <Field.Root
              label="Email"
              required
              error={errors.email}
              hint={status === "authenticated" ? "Locked to your account's email." : undefined}
            >
              <Field.Input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmailDraft(event.target.value)}
                autoComplete="email"
                disabled={status === "authenticated"}
                required
              />
            </Field.Root>
          </div>
          <Field.Root label="Phone" hint="Optional — for order updates.">
            <Field.Input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} autoComplete="tel" />
          </Field.Root>
        </fieldset>

        <fieldset className="flex flex-col gap-4 border border-line-strong bg-surface p-6">
          <legend className="mb-1 text-h3 font-medium tracking-ui text-ink">Billing address</legend>

          <Field.Root label="Billing name" required error={errors.shippingName}>
            <Field.Input
              value={billingName}
              onChange={(event) => {
                setBillingNameTouched(true);
                setBillingNameDraft(event.target.value);
              }}
              autoComplete="name"
              required
            />
          </Field.Root>
          <Field.Root label="Address" required error={errors.address}>
            <Field.Input value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" required />
          </Field.Root>
          <div className="grid gap-4 landscape:grid-cols-3">
            <Field.Root label="City" required error={errors.city}>
              <Field.Input value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" required />
            </Field.Root>
            <Field.Root label="Postal code" required error={errors.postalCode}>
              <Field.Input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} autoComplete="postal-code" required />
            </Field.Root>
            <Field.Root label="Country" required error={errors.country}>
              <Field.Select value={country} onChange={(event) => setCountry(event.target.value)} autoComplete="country">
                {SHIPPING_COUNTRIES.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.name}
                  </option>
                ))}
              </Field.Select>
            </Field.Root>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3 border border-line-strong bg-surface p-6">
          <legend className="mb-1 text-h3 font-medium tracking-ui text-ink">Payment method</legend>
          <div className="grid gap-3 landscape:grid-cols-2">
            {PAYMENT_METHODS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 border border-line-strong p-4 has-checked:border-2"
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => setPaymentMethod(option.value)}
                  className="focus-ring mt-0.5 size-4 accent-ink"
                />
                <span className="flex flex-col">
                  <span className="text-body font-medium text-ink">{option.label}</span>
                  <span className="text-small text-ink">{option.helper}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.paymentMethod && (
            <p role="alert" className="text-small font-medium text-ink">
              Error: {errors.paymentMethod}
            </p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-4 border border-line-strong bg-surface p-6">
          <legend className="sr-only">Additional details</legend>
          <Field.Checkbox
            label="Send me occasional emails about new templates, releases and offers."
            checked={marketingOptIn}
            onChange={(event) => setMarketingOptIn(event.target.checked)}
          />
          <Field.Root label="Order notes" hint="Optional — anything else we should know.">
            <Field.Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field.Root>
        </fieldset>
      </div>

      <div className="order-first flex flex-col gap-4 landscape:order-last">
        {breakdown ? (
          <OrderSummary
            breakdown={breakdown}
            discountCode={discount?.code}
            footer={
              <Button.Root type="submit" size="lg" loading={submitting} className="w-full justify-center">
                Place order
              </Button.Root>
            }
          />
        ) : (
          <Notice.Root tone="info">Calculating your order total…</Notice.Root>
        )}
      </div>
    </form>
  );
}

/**
 * `/checkout` — a single-page checkout form (contact, billing address,
 * payment method) with a live order summary. Every product is a digital
 * download, so there's no shipping-method choice: the API's `shipping`
 * block is always sent with `method: "domestic"` — see `SHIPPING_METHOD`
 * above. Wrapped in `AppProviders` (see `src/lib/providers.tsx`) so it
 * shares `cartStore`/`authClient` with every other island.
 */
export function CheckoutForm() {
  return (
    <AppProviders>
      <CheckoutFormInner />
    </AppProviders>
  );
}

export default CheckoutForm;
