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
  type Product,
  type ShippingMethod
} from "@three-acts/ecommerce";
import { ApiRequestError } from "@three-acts/utils";
import { checkoutErrorField } from "../checkout/checkout-errors";
import { SHIPPING_COUNTRIES } from "../checkout/countries";
import { writeLastOrder } from "../checkout/last-order";
import { OrderSummary } from "../checkout/order-summary";
import { indexBySlug, loadProducts } from "../checkout/product-catalogue";
import { useValidatedDiscount } from "../checkout/use-validated-discount";
import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";
import { apiFetch } from "../../lib/api-client";
import { formatMoney } from "../../lib/format";
import { AppProviders } from "../../lib/providers";
import { site } from "../../site";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string; helper: string }[] = [
  { value: "card", label: "Card", helper: "Captured immediately." },
  { value: "eft", label: "EFT", helper: "Awaits payment — bank details are emailed to you once you place the order." },
  { value: "paypal", label: "PayPal", helper: "Captured immediately." },
  { value: "apple_pay", label: "Apple Pay", helper: "Captured immediately." },
  { value: "gift_card", label: "Gift card", helper: "Captured immediately." }
];

const SHIPPING_METHODS: readonly { value: ShippingMethod; label: string; helper: string }[] = [
  {
    value: "domestic",
    label: "Domestic delivery",
    helper: `${formatMoney(shopConfig.shipping.domestic, shopConfig.currency)} · free over ${formatMoney(shopConfig.shipping.freeOverInclVat, shopConfig.currency)}. South Africa only.`
  },
  {
    value: "international",
    label: "International delivery",
    helper: `Flat rate ${formatMoney(shopConfig.shipping.international, shopConfig.currency)}.`
  },
  {
    value: "collection",
    label: "Collect from the roastery",
    helper: `Free — pick up at ${site.address.street}, ${site.address.locality}.`
  }
];

type FormErrors = Record<string, string>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs font-medium text-red-700">
      {message}
    </p>
  );
}

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

  // The shopper's own edits. The *displayed* delivery name is derived below
  // (mirrors `contactName` until touched) rather than kept in sync via an
  // effect — see the `deliveryName` const.
  const [deliveryNameDraft, setDeliveryNameDraft] = useState("");
  const [deliveryNameTouched, setDeliveryNameTouched] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState<string>(shopConfig.shipping.domesticCountry);
  const [method, setMethod] = useState<ShippingMethod>("domestic");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [topError, setTopError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const { discount } = useValidatedDiscount(cart, setDiscountCode);

  // Derived, not synced via an effect: the delivery name mirrors the
  // contact name until the shopper edits it directly (`deliveryNameTouched`
  // flips permanently on that first edit).
  const deliveryName = deliveryNameTouched ? deliveryNameDraft : contactName;

  // Derived, not synced via an effect: once signed in, the email is always
  // the session's own address (locked/disabled in the JSX below) — checkout
  // can never place an order under a different email than the account it
  // attaches to (the API enforces this too). Guests see their own draft.
  const contactEmail = status === "authenticated" && user ? user.email : contactEmailDraft;

  function handleCountryChange(nextCountry: string) {
    setCountry(nextCountry);
    // A non-domestic country can't ship "domestic" — flip to international
    // right in this event handler (not a separate effect watching `country`)
    // so there's no extra render where a disabled "domestic" option is
    // still the one selected.
    if (nextCountry !== shopConfig.shipping.domesticCountry) {
      setMethod((current) => (current === "domestic" ? "international" : current));
    }
  }

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
        if (customer.country && customer.country !== shopConfig.shipping.domesticCountry) {
          setCountry((current) => (current === shopConfig.shipping.domesticCountry ? customer.country : current));
          setMethod((current) => (current === "domestic" ? "international" : current));
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
      { discount, shippingMethod: method, country }
    );
  }, [products, lines, discount, method, country]);

  function buildShippingPayload(): CheckoutRequest["shipping"] {
    if (method === "collection") {
      return {
        name: (deliveryName || contactName).trim(),
        address: site.address.street,
        city: site.address.locality,
        postalCode: site.address.postalCode,
        country: shopConfig.shipping.domesticCountry,
        method: "collection"
      };
    }
    return {
      name: deliveryName.trim(),
      address: address.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      country,
      method
    };
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!contactName.trim()) next.name = "Enter your full name.";
    if (!contactEmail.trim()) next.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(contactEmail.trim())) next.email = "Enter a valid email address.";

    if (method !== "collection") {
      if (!deliveryName.trim()) next.shippingName = "Enter a delivery name.";
      if (!address.trim()) next.address = "Enter a delivery address.";
      if (!city.trim()) next.city = "Enter a city.";
      if (!postalCode.trim()) next.postalCode = "Enter a postal code.";
    }
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
      <Notice.Root tone="info" title="Your cart is empty">
        Add something to your cart before checking out.{" "}
        <a href="/shop" className="focus-ring font-semibold underline underline-offset-2">
          Go to the shop
        </a>
        .
      </Notice.Root>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10 landscape:grid landscape:grid-cols-[1fr_360px] landscape:items-start">
      <div className="order-last flex flex-col gap-10 landscape:order-first">
        {topError && (
          <Notice.Root tone="error" title="Couldn't place your order">
            {topError}
          </Notice.Root>
        )}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 font-serif text-lg font-semibold tracking-tight text-ink">Contact</legend>
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
          <Field.Root label="Phone" hint="Optional — for delivery updates.">
            <Field.Input type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} autoComplete="tel" />
          </Field.Root>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 font-serif text-lg font-semibold tracking-tight text-ink">Delivery</legend>

          <div className="flex flex-col gap-3">
            {SHIPPING_METHODS.map((option) => (
              <label
                key={option.value}
                className="focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent flex cursor-pointer items-start gap-3 border border-line p-4 has-checked:border-line-strong has-checked:bg-ink/3"
              >
                <input
                  type="radio"
                  name="shipping-method"
                  value={option.value}
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                  disabled={option.value === "domestic" && country !== shopConfig.shipping.domesticCountry}
                  className="focus-ring mt-0.5 size-4 accent-accent"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">{option.label}</span>
                  <span className="text-xs text-muted">{option.helper}</span>
                </span>
              </label>
            ))}
          </div>

          {method !== "collection" && (
            <div className="flex flex-col gap-4">
              <Field.Root label="Delivery name" required error={errors.shippingName}>
                <Field.Input
                  value={deliveryName}
                  onChange={(event) => {
                    setDeliveryNameTouched(true);
                    setDeliveryNameDraft(event.target.value);
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
                  <Field.Select value={country} onChange={(event) => handleCountryChange(event.target.value)} autoComplete="country">
                    {SHIPPING_COUNTRIES.map((entry) => (
                      <option key={entry.code} value={entry.code}>
                        {entry.name}
                      </option>
                    ))}
                  </Field.Select>
                </Field.Root>
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 font-serif text-lg font-semibold tracking-tight text-ink">Payment</legend>
          <div className="grid gap-3 landscape:grid-cols-2">
            {PAYMENT_METHODS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 border border-line p-4 has-checked:border-line-strong has-checked:bg-ink/3"
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => setPaymentMethod(option.value)}
                  className="focus-ring mt-0.5 size-4 accent-accent"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">{option.label}</span>
                  <span className="text-xs text-muted">{option.helper}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldError message={errors.paymentMethod} />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">Additional details</legend>
          <Field.Checkbox
            label="Send me occasional emails about new coffee, roastery events and offers."
            checked={marketingOptIn}
            onChange={(event) => setMarketingOptIn(event.target.checked)}
          />
          <Field.Root label="Order notes" hint="Optional — delivery instructions, gift notes, anything else.">
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
 * `/checkout` — a single-page checkout form (contact, delivery, payment)
 * with a live order summary priced by the chosen shipping method/country.
 * Wrapped in `AppProviders` (see `src/lib/providers.tsx`) so it shares
 * `cartStore`/`authClient` with every other island.
 */
export function CheckoutForm() {
  return (
    <AppProviders>
      <CheckoutFormInner />
    </AppProviders>
  );
}

export default CheckoutForm;
