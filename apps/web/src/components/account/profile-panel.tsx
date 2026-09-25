import { useState, type SubmitEvent } from "react";
import { authApiPaths, type UpdateAccountRequest } from "@three-acts/auth";
import type { Customer } from "@three-acts/ecommerce";
import { ApiRequestError } from "@three-acts/utils";
import { apiFetch } from "../../lib/api-client";
import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";

type ProfileFormState = {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  marketingOptIn: boolean;
};

const EMPTY_FORM: ProfileFormState = {
  name: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
  marketingOptIn: false
};

function toFormState(customer: Customer): ProfileFormState {
  return {
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    postalCode: customer.postalCode,
    country: customer.country,
    marketingOptIn: customer.marketingOptIn
  };
}

function describeError(error: unknown): string {
  if (error instanceof ApiRequestError || error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

type ProfilePanelProps = {
  /** The account's email — shown read-only; changing it isn't part of `UpdateAccountRequest`. */
  email: string;
  /** `null` while the record is still loading. */
  customer: Customer | null;
  onSaved: (customer: Customer) => void;
};

/** Account page "Profile" tab: editable contact details plus a billing address group, saved via `PUT /api/auth/account`. Bordered module — one hairline black box around the whole form. */
/**
 * Relies on the caller keying this component by `customer?.id` (see
 * `AccountPageInner` in `../islands/account-page`) so a fresh `customer`
 * remounts it instead of needing an effect to resync local form state from a
 * prop — the lazy `useState` initializer below only ever runs once, against
 * whichever `customer` this particular mounted instance was given.
 */
export function ProfilePanel({ email, customer, onSaved }: ProfilePanelProps) {
  const [form, setForm] = useState<ProfileFormState>(() => (customer ? toFormState(customer) : EMPTY_FORM));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setSaveState("idle");
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState("saving");
    setError(null);

    const body: UpdateAccountRequest = { ...form };

    try {
      const response = await apiFetch<{ customer: Customer }>(authApiPaths.account(), {
        method: "PUT",
        body: JSON.stringify(body)
      });
      onSaved(response.customer);
      setSaveState("saved");
    } catch (caught) {
      setError(describeError(caught));
      setSaveState("error");
    }
  }

  return (
    <div className="border border-line-strong bg-surface p-6 desktop:p-8">
      {!customer ? (
        <p className="text-body text-ink">Loading your profile…</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-5">
            <Field.Root label="Email" hint="Contact us to change the email on your account.">
              <Field.Input type="email" value={email} readOnly aria-readonly="true" className="cursor-not-allowed" />
            </Field.Root>
            <Field.Root label="Full name" required>
              <Field.Input
                name="name"
                autoComplete="name"
                required
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </Field.Root>
            <Field.Root label="Phone">
              <Field.Input
                type="tel"
                name="phone"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </Field.Root>
          </div>

          <div className="flex flex-col gap-5 border-t border-line pt-6">
            <h2 className="text-h3 font-medium text-ink">Billing address</h2>
            <Field.Root label="Address">
              <Field.Textarea
                name="address"
                autoComplete="street-address"
                rows={2}
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
              />
            </Field.Root>
            <div className="grid gap-5 portrait:grid-cols-1 landscape:grid-cols-2">
              <Field.Root label="City">
                <Field.Input
                  name="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                />
              </Field.Root>
              <Field.Root label="Postal code">
                <Field.Input
                  name="postal-code"
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={(event) => update("postalCode", event.target.value)}
                />
              </Field.Root>
            </div>
            <Field.Root label="Country">
              <Field.Input
                name="country"
                autoComplete="country-name"
                value={form.country}
                onChange={(event) => update("country", event.target.value)}
              />
            </Field.Root>
          </div>

          <Field.Checkbox
            label="Send me occasional emails about new releases and product updates."
            checked={form.marketingOptIn}
            onChange={(event) => update("marketingOptIn", event.target.checked)}
          />

          {saveState === "error" && error && <Notice.Root tone="error">{error}</Notice.Root>}
          {saveState === "saved" && <Notice.Root tone="success">Your profile has been updated.</Notice.Root>}

          <Button.Root type="submit" loading={saveState === "saving"} className="w-fit">
            Save changes
          </Button.Root>
        </form>
      )}
    </div>
  );
}

export default ProfilePanel;
