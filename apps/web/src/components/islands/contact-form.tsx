import { useState, type SubmitEvent } from "react";
import { useFormSubmission } from "@three-acts/forms/react";
import { apiFetch } from "../../lib/api-client";
import { site } from "../../site";
import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";

/**
 * `/contact` page's one island (`form: "contact"` — see `@three-acts/forms`'s
 * `validateSubmission`, which requires `name`/`email`/`message` for this
 * form type and leaves `phone`/`consent` optional). The `<form>` itself is
 * the bordered module — a 1px black border on white, matching every other
 * card/tile in the system.
 */
export function ContactForm() {
  const { status, errors, message, submit } = useFormSubmission({ apiFetch });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({ form: "contact", name, email, phone, message: body, consent, website });
    if (ok) {
      setName("");
      setEmail("");
      setPhone("");
      setBody("");
      setConsent(false);
    }
  }

  if (status === "success") {
    return (
      <Notice.Root tone="success" title="Message sent">
        Thanks — we reply within one working day.
      </Notice.Root>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5 border border-line-strong bg-surface p-6 desktop:p-8"
    >
      <Field.Root label="Name" error={errors.name} required>
        <Field.Input
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field.Root>

      <Field.Root label="Email" error={errors.email} required>
        <Field.Input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field.Root>

      <Field.Root label="Phone" hint="Optional" error={errors.phone}>
        <Field.Input
          type="tel"
          name="phone"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </Field.Root>

      <Field.Root label="Message" error={errors.message} required>
        <Field.Textarea
          name="message"
          rows={5}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </Field.Root>

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

      <Field.Checkbox
        label={`I consent to ${site.name} storing these details to respond to my enquiry.`}
        checked={consent}
        onChange={(event) => setConsent(event.target.checked)}
      />

      <Button.Root type="submit" loading={status === "submitting"} className="w-fit">
        Send message
      </Button.Root>

      {status === "error" && message && <Notice.Root tone="error">{message}</Notice.Root>}
    </form>
  );
}

export default ContactForm;
