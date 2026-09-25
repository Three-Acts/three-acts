/**
 * Schema markup (JSON-LD) stored as plain text on a Collection Field flagged
 * `format: "json-ld"`. Editors paste one JSON-LD object or an array of them;
 * the public site merges the parsed objects into the page's structured data.
 *
 * Empty text is valid (no markup). Anything else must parse as a JSON object
 * or a non-nested array of objects — primitives, `null`, and arrays holding
 * non-objects are rejected so a typo never ships broken structured data.
 */

export type SchemaMarkupResult = { ok: true; value: Record<string, unknown>[] } | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSchemaMarkup(value: string | null | undefined): SchemaMarkupResult {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return { ok: true, value: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
    return { ok: false, error: `Schema markup is not valid JSON${detail}. Check for missing quotes, commas, or brackets.` };
  }

  if (isPlainObject(parsed)) {
    return { ok: true, value: [parsed] };
  }

  if (Array.isArray(parsed)) {
    const invalidIndex = parsed.findIndex((item) => !isPlainObject(item));
    if (invalidIndex !== -1) {
      return { ok: false, error: `Schema markup item ${invalidIndex + 1} must be a JSON object, e.g. { "@type": "Organization" }.` };
    }
    return { ok: true, value: parsed as Record<string, unknown>[] };
  }

  return { ok: false, error: 'Schema markup must be a JSON object or an array of objects, e.g. { "@context": "https://schema.org", "@type": "Organization" }.' };
}
