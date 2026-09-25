import type { CmsRecord, CmsRecordValue } from "../../../cms/types";
import { parseImageValue } from "../../../cms/types";

/** Where search engines start truncating, roughly. Hints only — never enforced. */
export const TITLE_LIMIT = 60;
export const DESCRIPTION_LIMIT = 160;

/** The sitewide values a page's settings fall back to. Every field may be empty. */
export type SiteDefaults = {
  siteName: string;
  titleTemplate: string;
  defaultMetaDescription: string;
  /** Resolved image URL (not the stored `ImageValue` JSON). */
  defaultOgImage: string;
  favicon: string;
};

export const EMPTY_SITE_DEFAULTS: SiteDefaults = {
  siteName: "",
  titleTemplate: "",
  defaultMetaDescription: "",
  defaultOgImage: "",
  favicon: ""
};

/**
 * Origin the canonical URL defaults to. The CMS never builds the public site,
 * so this is only for previews; an unset `VITE_SITE_URL` shows a neutral host.
 */
const configuredSiteUrl = typeof import.meta.env.VITE_SITE_URL === "string" ? import.meta.env.VITE_SITE_URL : "";
export const SITE_URL = (configuredSiteUrl || "https://example.com").replace(/\/+$/, "");

export function text(values: Record<string, CmsRecordValue>, key: string): string {
  const value = values[key];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

/** Resolves an image field's stored value (ImageValue JSON or legacy URL) to a URL. */
export function imageSrc(value: CmsRecordValue): string {
  return parseImageValue(typeof value === "string" ? value : "")?.src ?? "";
}

export function readSiteDefaults(record: CmsRecord | null): SiteDefaults {
  if (!record) {
    return EMPTY_SITE_DEFAULTS;
  }

  return {
    siteName: text(record.values, "siteName"),
    titleTemplate: text(record.values, "titleTemplate"),
    defaultMetaDescription: text(record.values, "defaultMetaDescription"),
    defaultOgImage: imageSrc(record.values.defaultOgImage),
    favicon: imageSrc(record.values.favicon)
  };
}

/** A canonical value may be a path; previews always show it as a full URL. */
export function absoluteUrl(urlOrPath: string): string {
  return urlOrPath.startsWith("/") ? canonicalFor(urlOrPath) : urlOrPath;
}

export function canonicalFor(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** `https://example.com/blog/post` → `example.com › blog › post`, like a search result. */
export function breadcrumbUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return [parsed.host, ...segments].join(" › ");
  } catch {
    return url;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Mirrors how search results clip long titles and snippets. */
export function clip(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
}

/** Inline validation for the page path; `null` when it's fine. */
export function validatePagePath(path: string, otherPaths: string[]): string | null {
  if (!path) {
    return "A page path is required.";
  }

  if (!path.startsWith("/")) {
    return "Start the path with “/”, e.g. /about.";
  }

  if (/\s/.test(path)) {
    return "Paths can’t contain spaces. Use hyphens instead.";
  }

  if (/[?#]/.test(path)) {
    return "Leave out query strings and anchors.";
  }

  if (path.length > 1 && path.endsWith("/")) {
    return "Remove the trailing slash.";
  }

  if (otherPaths.includes(path)) {
    return "Another page already uses this path.";
  }

  return null;
}

export function validateCanonicalUrl(url: string): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith("/")) {
    return /\s/.test(url) ? "Paths can’t contain spaces." : null;
  }

  return /^https?:\/\/[^\s]+$/i.test(url) ? null : "Use a full URL (https://…) or a path starting with “/”.";
}

/** First free `/new-page`, `/new-page-2`, … so a created page never collides on the unique path. */
export function suggestPagePath(existingPaths: string[]): string {
  const taken = new Set(existingPaths);
  let candidate = "/new-page";

  for (let index = 2; taken.has(candidate); index += 1) {
    candidate = `/new-page-${index}`;
  }

  return candidate;
}
