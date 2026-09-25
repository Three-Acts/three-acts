/**
 * The three public forms the site collects (contact page, footer newsletter
 * signup, wholesale/inquiry page). Must match the `form-submissions`
 * collection's `form` select options in `@three-acts/cms-schema/registry` —
 * enforced at test time by `./registry-check`.
 */
export type FormType = "contact" | "newsletter" | "inquiry";

/** Canonical order — also the order shown in the registry's `form` select. */
export const formTypes: readonly FormType[] = ["contact", "newsletter", "inquiry"];

export const formLabels: Record<FormType, string> = {
  contact: "Contact",
  newsletter: "Newsletter",
  inquiry: "Inquiry"
};

/**
 * A validated form payload, shared by the client hook and the
 * `POST /api/forms/submit` request body. `website` is a honeypot: real
 * visitors never fill it in (see `isHoneypotTripped`).
 */
export type FormSubmission = {
  form: FormType;
  name?: string;
  email: string;
  message?: string;
  company?: string;
  phone?: string;
  consent?: boolean;
  website?: string;
};

export type SubmitFormResponse = {
  received: true;
  submissionId: string;
};
