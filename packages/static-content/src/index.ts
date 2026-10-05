import home from "./documents/home.json";
import about from "./documents/about.json";
import faq from "./documents/faq.json";
import docs from "./documents/docs.json";
import licenses from "./documents/licenses.json";
import refunds from "./documents/refunds.json";
import terms from "./documents/terms.json";
import privacy from "./documents/privacy.json";
import careers from "./documents/careers.json";
import changelog from "./documents/changelog.json";
import contact from "./documents/contact.json";
import agencies from "./documents/agencies.json";
import shared from "./documents/shared.json";
import productTemplate from "./documents/product-template.json";
import articleTemplate from "./documents/article-template.json";
import authorTemplate from "./documents/author-template.json";
import productCategoryTemplate from "./documents/product-category-template.json";
import articleCategoryTemplate from "./documents/article-category-template.json";

export type ContentValue = string | number | boolean | ContentValue[] | { [key: string]: ContentValue };
export type ContentObject = { [key: string]: ContentValue };
export type ContentDefinition = { id: string; label: string; route: string; content: ContentObject; collectionId?: string };
export const contentDefinitions: ContentDefinition[] = [
  { id: "home", label: "Home", route: "/", content: home },
  { id: "about", label: "About", route: "/about", content: about },
  { id: "faq", label: "FAQ", route: "/faq", content: faq },
  { id: "docs", label: "Docs", route: "/docs", content: docs },
  { id: "licenses", label: "Licences", route: "/licenses", content: licenses },
  { id: "refunds", label: "Refunds", route: "/refunds", content: refunds },
  { id: "terms", label: "Terms", route: "/terms", content: terms },
  { id: "privacy", label: "Privacy", route: "/privacy", content: privacy },
  { id: "careers", label: "Careers", route: "/careers", content: careers },
  { id: "changelog", label: "Changelog", route: "/changelog", content: changelog },
  { id: "contact", label: "Contact", route: "/contact", content: contact },
  { id: "agencies", label: "Agencies", route: "/agencies", content: agencies },
  { id: "product-template", label: "Product template", route: "/shop/[slug]", collectionId: "products", content: productTemplate },
  { id: "article-template", label: "Article template", route: "/blog/[slug]", collectionId: "articles", content: articleTemplate },
  { id: "author-template", label: "Author template", route: "/authors/[slug]", collectionId: "authors", content: authorTemplate },
  { id: "product-category-template", label: "Product category template", route: "/shop/category/[slug]", collectionId: "product-categories", content: productCategoryTemplate },
  { id: "article-category-template", label: "Article category template", route: "/blog/category/[slug]", collectionId: "article-categories", content: articleCategoryTemplate },
  { id: "shared", label: "Site & navigation", route: "/", content: shared },
];

export const contentPath = (id: string) => `packages/static-content/src/documents/${id}.json`;
export const serializeContent = (content: ContentObject) => `${JSON.stringify(content, null, 2)}\n`;

/** The deployed content files define the editing contract. Editors change values,
 * while developers own fields, layout, routes and section order in Git. */
export function validateContent(id: string, input: unknown): ContentObject {
  const definition = contentDefinitions.find((item) => item.id === id);
  if (!definition) throw new Error("Unknown content document.");
  function check(template: ContentValue, value: unknown, path: string): ContentValue {
    if (typeof template === "string") {
      if (typeof value !== "string" || value.length > 20000) throw new Error(`${path}: enter text under 20,000 characters.`);
      const key = path.split(".").at(-1) ?? "";
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
      return template.map((item, index) => check(item, value[index], `${path}.${index}`));
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: invalid content.`);
    const object = value as Record<string, unknown>;
    const keys = Object.keys(template);
    if (Object.keys(object).length !== keys.length || keys.some((key) => !Object.hasOwn(object, key))) throw new Error(`${path}: content fields have changed. Reload the editor.`);
    return Object.fromEntries(keys.map((key) => [key, check(template[key], object[key], path ? `${path}.${key}` : key)]));
  }
  return check(definition.content, input, "") as ContentObject;
}

export function isSafeContentUrl(value: string): boolean {
  if (Array.from(value).some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === "\\")) return false;
  if (!(/^\/(?!\/)/.test(value) || /^#[a-z0-9_-]+$/i.test(value) || /^(https?:\/\/|mailto:|tel:)/i.test(value))) return false;
  try { const url = new URL(value, "https://preview.invalid"); return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol); }
  catch { return false; }
}

export type ContentField = { path: string[]; value: string | number | boolean };
export function contentFields(content: ContentObject): ContentField[] {
  const fields: ContentField[] = [];
  function visit(value: ContentValue, path: string[]) {
    if (typeof value === "object") {
      for (const [key, item] of Object.entries(value)) visit(item, [...path, key]);
    } else fields.push({ path, value });
  }
  visit(content, []);
  return fields;
}

export type EditorDocument = Omit<ContentDefinition, "content"> & { content: ContentObject; sha: string };
export type EditorWorkspace = { repository: string | null; branch: string | null; connected: boolean; documents: EditorDocument[] };
export type EditorChange = { id: string; sha: string; content: ContentObject };
export type EditorPushResult = { sha: string; url: string; documents: EditorDocument[] };

/** Small interpolation contract for legal/support copy that refers to the shared brand. */
export function resolveStaticContent<T extends ContentValue>(content: T, variables: Record<string, string>): T {
  function resolve(value: ContentValue): ContentValue {
    if (typeof value === "string") return value.replace(/\{\{([a-z.]+)\}\}/g, (match, key: string) => variables[key] ?? match);
    if (Array.isArray(value)) return value.map(resolve);
    if (typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolve(item)]));
    return value;
  }
  return resolve(content) as T;
}
