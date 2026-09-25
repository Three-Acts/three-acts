import { formatMoney as formatMoneyBase } from "@three-acts/ecommerce";

/** Re-exported so call sites only need one import for every formatting helper. */
export const formatMoney = formatMoneyBase;

/** `2026-09-25T00:00:00.000Z` -> "25 September 2026". */
export function formatDate(iso: string, locale = "en-ZA"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

/** `2026-09-25T14:30:00.000Z` -> "25 September 2026, 14:30". */
export function formatDateTime(iso: string, locale = "en-ZA"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
