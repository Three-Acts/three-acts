import type { FormSubmission, FormType } from "./models";

const BASE_SCORE_BY_FORM: Record<FormType, number> = {
  inquiry: 60,
  contact: 30,
  newsletter: 10
};

const COMPANY_BONUS = 15;
const PHONE_BONUS = 10;
const CONSENT_BONUS = 5;
const MESSAGE_LENGTH_BONUS_CAP = 15;
const MESSAGE_LENGTH_BONUS_DIVISOR = 100;

const MIN_SCORE = 0;
const MAX_SCORE = 100;

/**
 * Deterministic 0..100 lead score used by the API to prioritize inbound form
 * submissions. Pure function of the submission — no randomness, no clock —
 * so the same payload always scores the same.
 */
export function leadScore(submission: FormSubmission): number {
  let score = BASE_SCORE_BY_FORM[submission.form];

  if (submission.company && submission.company.trim().length > 0) {
    score += COMPANY_BONUS;
  }

  if (submission.phone && submission.phone.trim().length > 0) {
    score += PHONE_BONUS;
  }

  if (submission.message) {
    score += Math.min(MESSAGE_LENGTH_BONUS_CAP, Math.floor(submission.message.length / MESSAGE_LENGTH_BONUS_DIVISOR));
  }

  if (submission.consent) {
    score += CONSENT_BONUS;
  }

  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
}
