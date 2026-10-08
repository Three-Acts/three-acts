import type { ContentObject, ContentValue } from "./index";

export function checkContentShape(template: ContentValue, value: unknown, path: string): ContentValue {
  if (typeof template === "string") {
    if (typeof value !== "string" || value.length > 20000) throw new Error(`${path}: enter text under 20,000 characters.`);
    const key = path.split(".").at(-1) ?? "";
    if ((/(^|_)src(_|$)/i.test(key) || key === "defaultImage") && value && !isSafeMediaUrl(value)) {
      throw new Error(`${path}: use a site path or https/http image URL.`);
    }
    if ((/(^|_)(href|src|url)(_|$)/i.test(key) || key === "defaultImage") && value && !isSafeContentUrl(value)) {
      throw new Error(`${path}: use a site path, anchor, https/http, mailto or tel URL.`);
    }
    return value;
  }
  if (typeof template === "number" || typeof template === "boolean") {
    if (typeof value !== typeof template || (typeof value === "number" && !Number.isFinite(value))) throw new Error(`${path}: invalid value.`);
    return value as number | boolean;
  }
  if (Array.isArray(template)) {
    if (!Array.isArray(value) || value.length !== template.length) throw new Error(`${path}: keep the existing items.`);
    return template.map((item, index) => checkContentShape(item, value[index], `${path}.${index}`));
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: invalid content.`);
  const object = value as Record<string, unknown>;
  const keys = Object.keys(template);
  if (Object.keys(object).length !== keys.length || keys.some((key) => !Object.hasOwn(object, key))) throw new Error(`${path}: content fields have changed. Reload the editor.`);
  return Object.fromEntries(keys.map((key) => [key, checkContentShape(template[key], object[key], path ? `${path}.${key}` : key)]));
}

export function isSafeContentUrl(value: string): boolean {
  if (Array.from(value).some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === "\\")) return false;
  if (!(/^\/(?!\/)/.test(value) || /^#[a-z0-9_-]+$/i.test(value) || /^(https?:\/\/|mailto:|tel:)/i.test(value))) return false;
  try { const url = new URL(value, "https://preview.invalid"); return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol); }
  catch { return false; }
}

export function isSafeMediaUrl(value: string): boolean {
  return isSafeContentUrl(value) && (/^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value));
}

