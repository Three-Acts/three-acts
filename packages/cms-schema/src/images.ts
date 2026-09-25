/**
 * Typed image values for the additive `image` / `image-gallery` field types.
 *
 * Both field types persist as `text` columns holding compact JSON strings:
 * a single `ImageValue` object for `image`, an array of them for
 * `image-gallery`. Helpers here parse leniently (a legacy plain-URL string
 * still reads as `{ src }`) and serialize canonically, so the API service,
 * the CMS editor, and the public site build all agree on one shape.
 */
export type ImageValue = {
  /** Public URL of the image (blob-store URL or a legacy path). */
  src: string;
  fileName?: string;
  size?: number;
  width?: number;
  height?: number;
  alt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value;
}

/** Normalizes one candidate object/URL into an `ImageValue`, or `null` when it carries no usable `src`. */
function toImageValue(candidate: unknown): ImageValue | null {
  if (typeof candidate === "string") {
    const src = candidate.trim();
    return src ? { src } : null;
  }

  if (!isRecord(candidate)) {
    return null;
  }

  const src = cleanString(candidate.src);
  if (!src) {
    return null;
  }

  const value: ImageValue = { src };
  const fileName = cleanString(candidate.fileName);
  const size = cleanNumber(candidate.size);
  const width = cleanNumber(candidate.width);
  const height = cleanNumber(candidate.height);
  const alt = typeof candidate.alt === "string" ? candidate.alt : undefined;

  if (fileName !== undefined) value.fileName = fileName;
  if (size !== undefined) value.size = size;
  if (width !== undefined) value.width = width;
  if (height !== undefined) value.height = height;
  if (alt !== undefined) value.alt = alt;

  return value;
}

/** Parses a candidate JSON string, returning `undefined` when it is not JSON at all. */
function tryParseJson(raw: string): { parsed: true; value: unknown } | { parsed: false } {
  try {
    return { parsed: true, value: JSON.parse(raw) };
  } catch {
    return { parsed: false };
  }
}

/**
 * Reads an `image` field value. Accepts the canonical JSON object string, a
 * live `ImageValue` object (import/draft paths), or a legacy plain-URL
 * string. Returns `null` for empty values (`""`, `null`, `undefined`) and for
 * anything without a usable `src`.
 */
export function parseImageValue(raw: unknown): ImageValue | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (isRecord(raw)) {
    return toImageValue(raw);
  }

  if (Array.isArray(raw)) {
    return raw.length > 0 ? toImageValue(raw[0]) : null;
  }

  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const attempt = tryParseJson(trimmed);
  if (!attempt.parsed) {
    // Legacy storage: the column held a bare URL, not JSON.
    return { src: trimmed };
  }

  if (typeof attempt.value === "string") {
    return attempt.value.trim() ? { src: attempt.value.trim() } : null;
  }

  if (Array.isArray(attempt.value)) {
    return attempt.value.length > 0 ? toImageValue(attempt.value[0]) : null;
  }

  return toImageValue(attempt.value);
}

/** Serializes an `image` value back to its stored form: `""` when empty, otherwise a compact JSON object. */
export function serializeImageValue(value: ImageValue | null | undefined): string {
  if (!value || !value.src.trim()) {
    return "";
  }
  return JSON.stringify(toImageValue(value) ?? { src: value.src.trim() });
}

/**
 * Reads an `image-gallery` field value. Accepts the canonical JSON array
 * string, a live array (import/draft paths), or a single JSON object string.
 * Entries without a usable `src` are dropped; plain strings and anything
 * else unparseable yield `[]` so malformed galleries stay safely empty.
 */
export function parseImageGallery(raw: unknown): ImageValue[] {
  if (raw === null || raw === undefined) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      const parsed = toImageValue(item);
      return parsed ? [parsed] : [];
    });
  }

  if (isRecord(raw)) {
    const parsed = toImageValue(raw);
    return parsed ? [parsed] : [];
  }

  if (typeof raw !== "string") {
    return [];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  const attempt = tryParseJson(trimmed);
  if (!attempt.parsed) {
    return [];
  }

  if (Array.isArray(attempt.value)) {
    return attempt.value.flatMap((item) => {
      const parsed = toImageValue(item);
      return parsed ? [parsed] : [];
    });
  }

  const single = toImageValue(attempt.value);
  return single ? [single] : [];
}

/** Serializes a gallery back to its stored form: `"[]"` when empty, otherwise a compact JSON array. */
export function serializeImageGallery(items: readonly ImageValue[]): string {
  const cleaned = items.flatMap((item) => {
    const parsed = toImageValue(item);
    return parsed ? [parsed] : [];
  });
  return JSON.stringify(cleaned);
}

/**
 * Moves the item at `fromIndex` to `toIndex` (clamped into range) and returns
 * a new array. Out-of-range `fromIndex` returns a copy unchanged — the CMS
 * gallery keyboard/drag handlers rely on this being total.
 */
export function moveImageItem(items: readonly ImageValue[], fromIndex: number, toIndex: number): ImageValue[] {
  const next = [...items];
  if (fromIndex < 0 || fromIndex >= next.length) {
    return next;
  }
  const clampedTo = Math.min(Math.max(toIndex, 0), next.length - 1);
  const [moved] = next.splice(fromIndex, 1);
  next.splice(clampedTo, 0, moved);
  return next;
}

/**
 * Extracts the display URL from an `image` field value in either its typed
 * (JSON) or legacy (plain URL) form. The public site build reads cover
 * images through this so old rows keep rendering after the field conversion.
 */
export function imageSrc(raw: unknown): string {
  return parseImageValue(raw)?.src ?? "";
}
