import { useCallback, useRef, useState } from "react";
import type { FormSubmission, SubmitFormResponse } from "../models";
import { formsApiPaths } from "../api-contract";
import { validateSubmission } from "../validate";

export type FormSubmissionStatus = "idle" | "submitting" | "success" | "error";

/**
 * Structurally matches `apiFetch` from `@three-acts/utils/api-client`
 * (and any equivalent) without depending on that package: a path starting
 * with "/", an optional `RequestInit`, resolving to the parsed data or
 * throwing an error shaped like `ApiRequestError` (`kind`, `code`, `message`).
 */
export type ApiFetch = <TData>(path: `/${string}`, init?: RequestInit) => Promise<TData>;

export type UseFormSubmissionOptions = {
  apiFetch: ApiFetch;
};

export type UseFormSubmissionResult = {
  status: FormSubmissionStatus;
  errors: Record<string, string>;
  message: string | null;
  submit: (values: FormSubmission) => Promise<boolean>;
  reset: () => void;
};

const KNOWN_FIELDS = ["form", "email", "name", "message", "company", "phone"] as const;
const GENERIC_ERROR_MESSAGE = "Something went wrong. Try again.";

/**
 * The API returns one message string per `validation_error` (see
 * `apps/api/api/contact.ts`'s style, generalized to `/api/forms/submit`).
 * Surface it under the field it names when the message starts with a known
 * field name, otherwise fall back to a form-level error. Exported and pure
 * so it's covered directly rather than through the hook.
 */
export function mapApiErrorMessage(message: string): Record<string, string> {
  const field = KNOWN_FIELDS.find((candidate) => message.startsWith(candidate));
  return { [field ?? "form"]: message };
}

function describeThrown(error: unknown): { message: string; kind?: string; code?: string } {
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; kind?: unknown; code?: unknown };
    return {
      message: typeof candidate.message === "string" ? candidate.message : GENERIC_ERROR_MESSAGE,
      kind: typeof candidate.kind === "string" ? candidate.kind : undefined,
      code: typeof candidate.code === "string" ? candidate.code : undefined
    };
  }
  return { message: GENERIC_ERROR_MESSAGE };
}

/**
 * Drives a form submission end to end: validates client-side first (so
 * field errors show without a round trip), POSTs the validated payload to
 * `formsApiPaths.submit()`, and maps a `validation_error` response back onto
 * field errors. Ignores a submit while one is already in flight.
 */
export function useFormSubmission({ apiFetch }: UseFormSubmissionOptions): UseFormSubmissionResult {
  const [status, setStatus] = useState<FormSubmissionStatus>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const reset = useCallback(() => {
    submittingRef.current = false;
    setStatus("idle");
    setErrors({});
    setMessage(null);
  }, []);

  const submit = useCallback(
    async (values: FormSubmission): Promise<boolean> => {
      if (submittingRef.current) {
        return false;
      }

      const validated = validateSubmission(values);
      if (!validated.ok) {
        setErrors(validated.errors);
        setMessage(null);
        setStatus("error");
        return false;
      }

      submittingRef.current = true;
      setStatus("submitting");
      setErrors({});
      setMessage(null);

      try {
        await apiFetch<SubmitFormResponse>(formsApiPaths.submit(), {
          method: "POST",
          body: JSON.stringify(validated.value)
        });
        setStatus("success");
        return true;
      } catch (thrown) {
        const described = describeThrown(thrown);

        if (described.kind === "api" && described.code === "validation_error") {
          setErrors(mapApiErrorMessage(described.message));
        } else {
          setMessage(described.message);
        }
        setStatus("error");
        return false;
      } finally {
        submittingRef.current = false;
      }
    },
    [apiFetch]
  );

  return { status, errors, message, submit, reset };
}
