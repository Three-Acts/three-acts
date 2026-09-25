import { useState, type SubmitEvent } from "react";
import { useFormSubmission } from "@three-acts/forms/react";
import { apiFetch } from "../../lib/api-client";
import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";

/**
 * Footer newsletter signup — `form: "newsletter"` needs no `name`/`message`
 * (see `@three-acts/forms`'s `validateSubmission`), just an email and a
 * consent checkbox.
 */
export function NewsletterForm() {
  const { status, errors, message, submit } = useFormSubmission({ apiFetch });
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({ form: "newsletter", email, consent, website });
    if (ok) {
      setEmail("");
      setConsent(false);
    }
  }

  if (status === "success") {
    return <Notice.Root tone="success">Thanks — you&apos;re on the list.</Notice.Root>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email) || undefined}
          className="focus-ring min-h-11 flex-1 border border-line-strong bg-surface px-3 text-body text-ink"
        />
        {/* Honeypot: real visitors never see or fill this in. A bot that fills every input tips itself off to the API. */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"
        />
        <Button.Root type="submit" variant="primary" loading={status === "submitting"} className="w-fit">
          Subscribe
        </Button.Root>
      </div>
      <Field.Checkbox
        label="I'd like occasional emails about product updates and releases."
        checked={consent}
        onChange={(event) => setConsent(event.target.checked)}
      />
      {errors.email && (
        <p role="alert" className="text-small text-ink">
          Error: {errors.email}
        </p>
      )}
      {status === "error" && message && <Notice.Root tone="error">{message}</Notice.Root>}
    </form>
  );
}

export default NewsletterForm;
