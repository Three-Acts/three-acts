import { formTypes, type FormSubmission, type FormType } from "./models";

// Reasonable, not exhaustive: rejects obviously-malformed addresses without
// trying to fully validate the email spec. Kept identical to
// apps/api/api/contact.ts's pattern.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_EMAIL_LENGTH = 254;
export const MAX_NAME_LENGTH = 200;
export const MIN_MESSAGE_LENGTH = 1;
export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_COMPANY_LENGTH = 200;
export const MAX_PHONE_LENGTH = 40;

const FORM_TYPE_SET: ReadonlySet<string> = new Set(formTypes);

function isFormType(value: string): value is FormType {
  return FORM_TYPE_SET.has(value);
}

function asRecord(input: unknown): Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Accepts the common truthy shapes a checkbox/JSON body sends for consent
 * (`true`, `"true"`, `"on"`, `1`, `"1"`); everything else coerces to `false`.
 */
function coerceConsent(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

/**
 * `website` is a honeypot field: real visitors never see or fill it in, so a
 * bot that fills every input tips itself off. Passed through untouched
 * (no trimming) so the caller can inspect exactly what a bot sent.
 */
export function isHoneypotTripped(submission: Pick<FormSubmission, "website">): boolean {
  return typeof submission.website === "string" && submission.website.trim().length > 0;
}

/**
 * Validates and normalizes an unknown payload (a parsed JSON body, form
 * data, whatever) into a `FormSubmission`. Every string field is trimmed
 * except `website`, which is passed through exactly as received. Collects
 * every field error in one pass rather than failing fast, so a caller can
 * show them all at once.
 */
export function validateSubmission(input: unknown): { ok: true; value: FormSubmission } | { ok: false; errors: Record<string, string> } {
  const raw = asRecord(input);
  const errors: Record<string, string> = {};

  const formRaw = trimmed(raw.form);
  if (!isFormType(formRaw)) {
    errors.form = `form must be one of ${formTypes.join(", ")}.`;
  }
  // Even when `form` itself is invalid, keep validating the rest of the
  // payload under the stricter ("not newsletter") assumption so every
  // problem surfaces in one response instead of one field at a time.
  const form: FormType | "" = isFormType(formRaw) ? formRaw : "";

  const email = trimmed(raw.email);
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors.email = "email must be a valid email address.";
  }

  const name = trimmed(raw.name);
  const nameRequired = form !== "newsletter";
  if (nameRequired && !name) {
    errors.name = "name is required.";
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  const message = trimmed(raw.message);
  const messageRequired = form === "contact" || form === "inquiry";
  if (messageRequired && !message) {
    errors.message = "message is required.";
  } else if (message && (message.length < MIN_MESSAGE_LENGTH || message.length > MAX_MESSAGE_LENGTH)) {
    errors.message = `message must be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters.`;
  }

  const company = trimmed(raw.company);
  if (company.length > MAX_COMPANY_LENGTH) {
    errors.company = `company must be ${MAX_COMPANY_LENGTH} characters or fewer.`;
  }

  const phone = trimmed(raw.phone);
  if (phone.length > MAX_PHONE_LENGTH) {
    errors.phone = `phone must be ${MAX_PHONE_LENGTH} characters or fewer.`;
  }

  const consent = coerceConsent(raw.consent);
  const website = typeof raw.website === "string" ? raw.website : undefined;

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const value: FormSubmission = {
    form: form as FormType,
    email,
    consent,
    ...(name ? { name } : {}),
    ...(message ? { message } : {}),
    ...(company ? { company } : {}),
    ...(phone ? { phone } : {}),
    ...(website !== undefined ? { website } : {})
  };

  return { ok: true, value };
}
