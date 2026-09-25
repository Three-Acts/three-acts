/**
 * Typed single-file values for the additive `video` / `file` field types.
 *
 * Both field types persist as `text` columns holding compact JSON strings of
 * a single object (mirroring `image` in `./images`), so `src`, `fileName`,
 * `size`, and `contentType` survive the round trip. Uploads are the only
 * write path — there is no external-URL input — but reads stay lenient: a
 * legacy plain-URL or bare-`src` string still parses to `{ src }`.
 */

export type VideoValue = {
  /** Public URL of the uploaded video (blob-store URL or a legacy path). */
  src: string;
  fileName?: string;
  size?: number;
  contentType?: string;
};

export type FileValue = {
  /** Public URL of the uploaded file (blob-store URL or a legacy path). */
  src: string;
  fileName?: string;
  size?: number;
  contentType?: string;
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

function cleanContentType(value: unknown): string | undefined {
  const text = cleanString(value);
  if (!text) {
    return undefined;
  }
  // Stored metadata only: must look like a MIME type, not an arbitrary label.
  return text.includes("/") ? text : undefined;
}

function toVideoValue(candidate: unknown): VideoValue | null {
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

  const value: VideoValue = { src };
  const fileName = cleanString(candidate.fileName);
  const size = cleanNumber(candidate.size);
  const contentType = cleanContentType(candidate.contentType);

  if (fileName !== undefined) value.fileName = fileName;
  if (size !== undefined) value.size = size;
  if (contentType !== undefined) value.contentType = contentType;

  return value;
}

function toFileValue(candidate: unknown): FileValue | null {
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

  const value: FileValue = { src };
  const fileName = cleanString(candidate.fileName);
  const size = cleanNumber(candidate.size);
  const contentType = cleanContentType(candidate.contentType);

  if (fileName !== undefined) value.fileName = fileName;
  if (size !== undefined) value.size = size;
  if (contentType !== undefined) value.contentType = contentType;

  return value;
}

function tryParseJson(raw: string): { parsed: true; value: unknown } | { parsed: false } {
  try {
    return { parsed: true, value: JSON.parse(raw) };
  } catch {
    return { parsed: false };
  }
}

function parseSingle(raw: unknown, convert: (candidate: unknown) => VideoValue | FileValue | null): VideoValue | FileValue | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (isRecord(raw)) {
    return convert(raw);
  }

  if (Array.isArray(raw)) {
    return raw.length > 0 ? convert(raw[0]) : null;
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
    return convert(trimmed);
  }

  if (typeof attempt.value === "string") {
    return attempt.value.trim() ? convert(attempt.value.trim()) : null;
  }

  if (Array.isArray(attempt.value)) {
    return attempt.value.length > 0 ? convert(attempt.value[0]) : null;
  }

  return convert(attempt.value);
}

/**
 * Reads a `video` field value. Accepts the canonical JSON object string, a
 * live `VideoValue` object (import/draft paths), or a legacy plain-URL
 * string. Returns `null` for empty values and for anything without a usable
 * `src`.
 */
export function parseVideoValue(raw: unknown): VideoValue | null {
  return parseSingle(raw, toVideoValue) as VideoValue | null;
}

/** Serializes a `video` value back to its stored form: `""` when empty, otherwise a compact JSON object. */
export function serializeVideoValue(value: VideoValue | null | undefined): string {
  if (!value || !value.src.trim()) {
    return "";
  }
  return JSON.stringify(toVideoValue(value) ?? { src: value.src.trim() });
}

/**
 * Reads a `file` field value. Accepts the canonical JSON object string, a
 * live `FileValue` object (import/draft paths), or a legacy plain-URL
 * string. Returns `null` for empty values and for anything without a usable
 * `src`.
 */
export function parseFileValue(raw: unknown): FileValue | null {
  return parseSingle(raw, toFileValue) as FileValue | null;
}

/** Serializes a `file` value back to its stored form: `""` when empty, otherwise a compact JSON object. */
export function serializeFileValue(value: FileValue | null | undefined): string {
  if (!value || !value.src.trim()) {
    return "";
  }
  return JSON.stringify(toFileValue(value) ?? { src: value.src.trim() });
}

/** Extracts the display/download URL from a `video` field value in either its typed (JSON) or legacy (plain URL) form. */
export function videoSrc(raw: unknown): string {
  return parseVideoValue(raw)?.src ?? "";
}

/** Extracts the display/download URL from a `file` field value in either its typed (JSON) or legacy (plain URL) form. */
export function fileSrc(raw: unknown): string {
  return parseFileValue(raw)?.src ?? "";
}
