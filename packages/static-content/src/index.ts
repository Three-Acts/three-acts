import { checkContentShape } from "./value-validation";
import layout from "./documents/layout.json";
import publication from "./documents/publication.json";
import { validateLayout } from "./layout";
export * from "./layout";
export * from "./publication";
export { isSafeContentUrl, isSafeMediaUrl } from "./value-validation";
import design from "./documents/design.json";
import { validateDesign } from "@three-acts/design";
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
export type ContentDefinition = { id: string; label: string; route: string; content: ContentObject; collectionId?: string; kind?: "design" | "layout" | "publication" };
export const contentDefinitions: ContentDefinition[] = [
  { id: "design", label: "Site design", route: "/", kind: "design", content: design },
  { id: "layout", label: "Page composition", route: "/", kind: "layout", content: layout },
  { id: "publication", label: "Publication receipt", route: "/", kind: "publication", content: publication },
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

/** Source files define the editing contract. Editors change validated values,
 * styles and approved layout instances; developers own schemas and routes. */
export function validateContent(id: string, input: unknown): ContentObject {
  if (id === "design") return validateDesign(input) as unknown as ContentObject;
  if (id === "layout") return validateLayout(input) as unknown as ContentObject;
  if (id === "publication") {
    const value = input as Record<string, unknown> | null;
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 2 || value.version !== 1 || typeof value.publicationId !== "string" || value.publicationId !== "" && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.publicationId)) throw new Error("Invalid publication receipt.");
    return { version: 1, publicationId: value.publicationId };
  }
  const definition = contentDefinitions.find((item) => item.id === id);
  if (!definition) throw new Error("Unknown content document.");

  return checkContentShape(definition.content, input, "") as ContentObject;
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

export type EditorDocument = Omit<ContentDefinition, "content"> & { content: ContentObject; sha: string; sourcePath?: string };
export type EditorWorkspace = {
  repository: string | null;
  branch: string | null;
  connected: boolean;
  documents: EditorDocument[];
  /** Where the API loaded this workspace from. Older fixtures may omit provenance. */
  source?: "github" | "local";
  /** Git commit at which all GitHub documents were read; null for bundled local content. */
  headSha?: string | null;
  /** A configured server credential is shared by CMS users; there is no per-user connection yet. */
  connectionMode?: "server" | "none";
};
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
