import type { LinkField, LinkType, LinkValue } from "./types";

const LINK_TYPES = new Set<LinkType>(["url", "page", "collection", "section", "email", "phone", "file"]);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

type ParsedLink = { value: LinkValue | null; error?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCandidate(candidate: unknown): ParsedLink {
  if (candidate === null || candidate === undefined || candidate === "") return { value: null };
  if (typeof candidate === "string") {
    const raw = candidate.trim();
    if (!raw) return { value: null };
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try {
        return parseCandidate(JSON.parse(raw));
      } catch {
        return { value: null, error: "Link value is not valid JSON." };
      }
    }
    if (CONTROL_CHARACTERS.test(candidate)) return { value: null, error: "Link values cannot contain control characters." };
    if (/^mailto:/i.test(raw)) return { value: { type: "email", href: raw } };
    if (/^tel:/i.test(raw)) return { value: { type: "phone", href: raw } };
    // Older link values were stored as plain URLs.
    return { value: { type: "url", href: raw } };
  }
  if (!isRecord(candidate)) return { value: null, error: "Link value must be a link object." };
  if (typeof candidate.type !== "string" || !LINK_TYPES.has(candidate.type as LinkType)) {
    return { value: null, error: "Choose a supported link type." };
  }
  if (typeof candidate.href !== "string") return { value: null, error: "Link destination must be text." };
  if (CONTROL_CHARACTERS.test(candidate.href)) return { value: null, error: "Link values cannot contain control characters." };

  const value: LinkValue = { type: candidate.type as LinkType, href: candidate.href.trim() };
  if (candidate.target !== undefined) {
    if (candidate.target !== "_self" && candidate.target !== "_blank") {
      return { value: null, error: "Link target must be same tab or new tab." };
    }
    value.target = candidate.target;
  }
  for (const key of ["destinationId", "collectionId", "recordId", "fileName", "contentType"] as const) {
    const item = candidate[key];
    if (item !== undefined) {
      if (typeof item !== "string") return { value: null, error: "Link metadata must be text." };
      if (CONTROL_CHARACTERS.test(item)) return { value: null, error: "Link values cannot contain control characters." };
      if (item.trim()) value[key] = item.trim();
    }
  }
  if (candidate.size !== undefined) {
    if (typeof candidate.size !== "number" || !Number.isFinite(candidate.size) || candidate.size < 0) {
      return { value: null, error: "File size must be a non-negative number." };
    }
    value.size = candidate.size;
  }
  return { value };
}

/** Parse a canonical link object or a legacy plain URL. Empty values return null. */
export function parseLinkValue(raw: unknown): LinkValue | null {
  return parseCandidate(raw).value;
}

/** Serialize a link value as the compact JSON string stored in CMS text columns. */
export function serializeLinkValue(value: LinkValue | null | undefined): string {
  if (!value) return "";
  return JSON.stringify(value);
}

/** Apply the expected scheme for a link kind and add https:// to bare domains. */
export function normalizeLinkHref(type: LinkType, input: string): string {
  const href = input.trim();
  if (!href) return "";
  if (type === "email") return `mailto:${href.replace(/^mailto:/i, "")}`;
  if (type === "phone") {
    const source = href.replace(/^tel:/i, "").trim();
    if (/[a-z]/i.test(source)) return "tel:";
    const digits = source.replace(/[^\d]/g, "");
    const international = source.startsWith("+");
    return digits ? `tel:${international ? "+" : ""}${digits}` : "tel:";
  }
  if (type === "url" || type === "file") {
    if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("/") || href.startsWith("#")) return href;
    return `https://${href}`;
  }
  return href;
}

/** Resolve page/collection/section IDs to their configured, canonical href. */
export function resolveLinkValue(raw: unknown, field?: LinkField): LinkValue | null {
  const value = parseCandidate(raw).value;
  if (!value) return null;
  const resolved: LinkValue = { ...value, href: normalizeLinkHref(value.type, value.href) };
  if (value.type === "email" || value.type === "phone") resolved.target = "_self";

  if (value.type === "page") {
    const option = field?.pages?.find((item) => item.id === value.destinationId);
    if (option) resolved.href = option.href;
  } else if (value.type === "section") {
    const option = field?.sections?.find((item) => item.id === value.destinationId);
    if (option) resolved.href = option.href;
  } else if (value.type === "collection") {
    const collection = field?.collections?.find((item) => item.id === value.collectionId);
    const option = collection?.items.find((item) => item.id === value.recordId);
    if (option) resolved.href = option.href;
  }
  return resolved;
}

function validWebHref(href: string): boolean {
  // WHATWG URL parsing treats backslashes as slashes for special schemes;
  // reject them before parsing so a root-relative value cannot escape its origin.
  if (href.includes("\\")) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  if (href.startsWith("#")) return true;
  try {
    const parsed = new URL(href);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

/** Return a user-facing validation message, or null when the value is safe to save. */
export function validateLinkValue(
  raw: unknown,
  options: { field?: LinkField; required?: boolean; allowLocalBlob?: boolean } = {}
): string | null {
  const parsed = parseCandidate(raw);
  if (parsed.error) return parsed.error;
  const value = parsed.value;
  if (!value) return options.required ? `${options.field?.label ?? "Link"} is required.` : null;

  const checkStrings = [value.href, value.destinationId, value.collectionId, value.recordId, value.fileName, value.contentType];
  if (checkStrings.some((item) => item !== undefined && CONTROL_CHARACTERS.test(item))) return "Link values cannot contain control characters.";

  const field = options.field;
  const incompleteCollectionDraft = value.type === "collection" && !value.href && value.collectionId && !value.recordId;
  const nonempty = !incompleteCollectionDraft && Boolean(value.href || value.destinationId || value.collectionId || value.recordId);
  if (!nonempty) return options.required ? `${field?.label ?? "Link"} is required.` : null;

  if (value.type === "page") {
    if (!value.destinationId) return "Choose a page for this link.";
    if (!field?.pages) return "Page destinations are not configured for this field.";
    const option = field.pages.find((item) => item.id === value.destinationId);
    if (!option) return "The selected page is no longer available. Choose another page.";
    if (!validWebHref(option.href)) return "The selected page has an invalid destination.";
  } else if (value.type === "section") {
    if (!value.destinationId) return "Choose a page section for this link.";
    if (!field?.sections) return "Page sections are not configured for this field.";
    const option = field.sections.find((item) => item.id === value.destinationId);
    if (!option) return "The selected page section is no longer available. Choose another section.";
    const fragmentIndex = option.href.indexOf("#");
    if (fragmentIndex < 0 || !option.href.slice(fragmentIndex + 1).trim() || !validWebHref(option.href)) {
      return "The selected section needs a valid page fragment.";
    }
  } else if (value.type === "collection") {
    if (!value.collectionId || !value.recordId) return "Choose a collection item for this link.";
    if (!field?.collections) return "Collection destinations are not configured for this field.";
    const collection = field.collections.find((item) => item.id === value.collectionId);
    const item = collection?.items.find((entry) => entry.id === value.recordId);
    if (!item) return "The selected collection item is no longer available. Choose another item.";
    if (!validWebHref(item.href)) return "The selected item has an invalid destination.";
  } else if (value.type === "email") {
    const href = normalizeLinkHref("email", value.href);
    const address = href.slice("mailto:".length);
    if (CONTROL_CHARACTERS.test(href) || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) return "Enter a valid email address.";
  } else if (value.type === "phone") {
    const href = normalizeLinkHref("phone", value.href);
    if (!/^tel:\+?\d{3,}$/.test(href)) return "Enter a valid phone number.";
  } else if (value.type === "file") {
    const href = normalizeLinkHref("file", value.href);
    const blob = href.startsWith("blob:");
    if (blob && !options.allowLocalBlob) return "Local blob links cannot be saved.";
    if (!blob && !validWebHref(href)) return "Enter a valid file URL or upload a file.";
    if (field?.accept && value.contentType && !matchesAccept(value.fileName ?? "", value.contentType, field.accept)) {
      return "This file type is not accepted by the field.";
    }
  } else {
    const href = normalizeLinkHref("url", value.href);
    if (!validWebHref(href)) return "Enter an http(s) URL, a site path, or a page fragment.";
  }
  if (value.target !== undefined && value.target !== "_self" && value.target !== "_blank") return "Link target must be same tab or new tab.";
  return null;
}

/** Return a canonical href only for a valid configured destination. */
export function linkHref(raw: unknown, field?: LinkField): string {
  if (validateLinkValue(raw, { field })) return "";
  return resolveLinkValue(raw, field)?.href ?? "";
}

function matchesAccept(fileName: string, contentType: string, accept: string): boolean {
  return accept.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean).some((pattern) => {
    if (pattern.startsWith(".")) return fileName.toLowerCase().endsWith(pattern);
    if (pattern.endsWith("/*")) return contentType.toLowerCase().startsWith(pattern.slice(0, -1));
    return contentType.toLowerCase() === pattern;
  });
}
