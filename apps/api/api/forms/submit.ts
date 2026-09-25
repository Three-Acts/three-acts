import { isHoneypotTripped, leadScore, validateSubmission, type FormSubmission } from "@three-acts/forms";
import { ApiError, json, ok, readJsonBody, withApi } from "../_lib/http";
import { createSystemRecord, updateSystemRecord } from "../_lib/cms/service";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_PER_WINDOW = 5;

// In-memory per-process rate limit: lowercased email -> submission
// timestamps still inside the current window. Resets on restart and isn't
// shared across serverless instances — fine as a light deterrent, not a
// hard guarantee. Module-level so it survives across requests handled by
// the same warm process/dev server.
const submissionTimestampsByEmail = new Map<string, number[]>();

function isRateLimited(email: string): boolean {
  const key = email.toLowerCase();
  const now = Date.now();
  const recent = (submissionTimestampsByEmail.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_PER_WINDOW) {
    submissionTimestampsByEmail.set(key, recent);
    return true;
  }

  recent.push(now);
  submissionTimestampsByEmail.set(key, recent);
  return false;
}

function asPartialSubmission(body: unknown): Partial<FormSubmission> {
  return body !== null && typeof body === "object" && !Array.isArray(body) ? (body as Partial<FormSubmission>) : {};
}

/**
 * POST /api/forms/submit — the site's single public forms endpoint (contact
 * page, footer newsletter signup, wholesale/inquiry page). Replaces the
 * retired `/api/contact`.
 *
 * - Honeypot (`website` filled in): responds like a normal success —
 *   `{ received: true, submissionId: "" }`, 200 — without validating or
 *   storing anything, so a bot never learns it was caught.
 * - Validation failure: 400 `validation_error`, `error.message` is the first
 *   field error, `error.details` carries the full `Record<field, message>`
 *   map from `validateSubmission` for a client to show inline.
 * - Rate limit: more than 5 submissions from the same email within a rolling
 *   10-minute window -> 429 `rate_limited`.
 * - Success: writes `form-submissions` through the system write path
 *   (`createSystemRecord`/`updateSystemRecord`), which bypasses the
 *   collection's `readonly`-mode editor gating — this route is the site's own
 *   write path, not an editor. `submissionId` is `sub_<record id>`, stamped
 *   in a follow-up update since the id doesn't exist until the record is
 *   created.
 */
export default withApi(["POST"], async (request, response) => {
  const body = readJsonBody<unknown>(request);

  if (isHoneypotTripped(asPartialSubmission(body))) {
    ok(response, { received: true, submissionId: "" });
    return;
  }

  const result = validateSubmission(body);
  if (!result.ok) {
    const firstMessage = Object.values(result.errors)[0] ?? "Validation failed.";
    throw new ApiError(400, "validation_error", firstMessage, result.errors);
  }

  const { value } = result;

  if (isRateLimited(value.email)) {
    throw new ApiError(429, "rate_limited", "Too many submissions from this email address. Try again in a few minutes.");
  }

  const submittedAt = new Date().toISOString();
  const created = await createSystemRecord("form-submissions", {
    submittedBy: value.name || "Newsletter subscriber",
    email: value.email,
    message: value.message ?? "",
    form: value.form,
    company: value.company ?? "",
    phone: value.phone ?? "",
    score: leadScore(value),
    consent: Boolean(value.consent),
    attachment: "",
    submittedAt,
    submissionId: ""
  });

  const submissionId = `sub_${created.id}`;
  await updateSystemRecord("form-submissions", created.id, { submissionId });

  json(response, 201, { ok: true, data: { received: true, submissionId } });
});
