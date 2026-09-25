import { collectionRegistry, parseImageValue, parseSchemaMarkup, type CmsRecord, type CmsRecordValue } from "@three-acts/cms-schema";
import type { Article, ArticleCategory, Author, Faq, ImageRef, PageSettings, RedirectRule, SiteSettings, Testimonial } from "./models";

/**
 * Mappers from a public-content-route `CmsRecord` (its `values` are already
 * the live snapshot — see `apps/api/api/_lib/cms/memory-store.ts`'s
 * `listLiveRecords`) to this package's typed read models, reading every value
 * by the collection's registry field key so a registry rename fails a build
 * loudly instead of silently returning empty content.
 *
 * A record whose value for a `slug`-typed field (or the redirect's
 * `sourcePath`, itself a `slug` field) is empty maps to `null`; the content
 * client skips those records with a `console.warn` rather than throwing, so
 * one bad record never fails a whole page.
 */

function fieldKeysFor(collectionId: string): Set<string> {
  const collection = collectionRegistry.find((entry) => entry.id === collectionId);
  if (!collection) {
    throw new Error(`@three-acts/content: the "${collectionId}" collection is missing from @three-acts/cms-schema's collectionRegistry.`);
  }
  return new Set(collection.fields.map((field) => field.key));
}

/** Fails fast at module init (not per-record) if the registry's shape drifts from what a mapper expects. */
function requireFieldKey(collectionId: string, keys: Set<string>, key: string): string {
  if (!keys.has(key)) {
    throw new Error(`@three-acts/content: expected field "${key}" on the "${collectionId}" collection, but it is not in the registry.`);
  }
  return key;
}

function fieldMap<TKey extends string>(collectionId: string, keys: TKey[]): Record<TKey, TKey> {
  const registryKeys = fieldKeysFor(collectionId);
  const out = {} as Record<TKey, TKey>;
  for (const key of keys) {
    out[key] = requireFieldKey(collectionId, registryKeys, key) as TKey;
  }
  return out;
}

function readString(value: CmsRecordValue): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: CmsRecordValue): string | undefined {
  const text = readString(value).trim();
  return text.length > 0 ? text : undefined;
}

function readNumber(value: CmsRecordValue): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function readBoolean(value: CmsRecordValue): boolean {
  return value === true;
}

function readTags(value: CmsRecordValue): string[] {
  return readString(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function readImageRef(value: CmsRecordValue): ImageRef | undefined {
  const image = parseImageValue(value);
  if (!image) {
    return undefined;
  }
  const ref: ImageRef = { src: image.src, alt: image.alt ?? "" };
  if (image.width !== undefined) ref.width = image.width;
  if (image.height !== undefined) ref.height = image.height;
  return ref;
}

function readSchemaMarkup(value: CmsRecordValue): unknown[] {
  const result = parseSchemaMarkup(typeof value === "string" ? value : "");
  return result.ok ? result.value : [];
}

const REDIRECT_STATUS_CODES = new Set([301, 302, 307, 308]);

function readRedirectStatusCode(value: CmsRecordValue): 301 | 302 | 307 | 308 {
  const num = Number(value);
  // Not a plain `Number(...)` fallback of 0 — 0 isn't a valid status code for
  // this union, so an unparsable/unknown code falls back to a permanent 301
  // (the collection's own default) rather than an impossible value.
  return REDIRECT_STATUS_CODES.has(num) ? (num as 301 | 302 | 307 | 308) : 301;
}

// --- Articles ------------------------------------------------------------

const ARTICLE_FIELD = fieldMap("articles", [
  "title",
  "slug",
  "excerpt",
  "body",
  "coverImage",
  "author",
  "category",
  "tags",
  "publishedAt",
  "readingTime",
  "featured",
  "seoTitle",
  "seoDescription"
] as const);

export function toArticle(record: CmsRecord): Article | null {
  const slug = readString(record.values[ARTICLE_FIELD.slug]).trim();
  if (!slug) {
    return null;
  }
  const publishedAt = readString(record.values[ARTICLE_FIELD.publishedAt]).trim();
  return {
    id: record.id,
    slug,
    title: readString(record.values[ARTICLE_FIELD.title]),
    excerpt: readString(record.values[ARTICLE_FIELD.excerpt]),
    body: readString(record.values[ARTICLE_FIELD.body]),
    coverImage: readImageRef(record.values[ARTICLE_FIELD.coverImage]),
    authorSlug: readString(record.values[ARTICLE_FIELD.author]).trim(),
    categorySlug: readString(record.values[ARTICLE_FIELD.category]).trim(),
    tags: readTags(record.values[ARTICLE_FIELD.tags]),
    publishedAt: publishedAt.length > 0 ? publishedAt : record.createdAt,
    updatedAt: record.modifiedAt,
    readingTime: readNumber(record.values[ARTICLE_FIELD.readingTime]),
    featured: readBoolean(record.values[ARTICLE_FIELD.featured]),
    seoTitle: readOptionalString(record.values[ARTICLE_FIELD.seoTitle]),
    seoDescription: readOptionalString(record.values[ARTICLE_FIELD.seoDescription])
  };
}

/** Newest `publishedAt` first — the order every article listing on the site uses. */
export function sortArticles(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

// --- Authors ---------------------------------------------------------------

const AUTHOR_FIELD = fieldMap("authors", [
  "name",
  "slug",
  "role",
  "bio",
  "avatar",
  "email",
  "websiteUrl",
  "xHandle",
  "instagramHandle",
  "linkedinUrl"
] as const);

export function toAuthor(record: CmsRecord): Author | null {
  const slug = readString(record.values[AUTHOR_FIELD.slug]).trim();
  if (!slug) {
    return null;
  }
  return {
    id: record.id,
    slug,
    name: readString(record.values[AUTHOR_FIELD.name]),
    role: readString(record.values[AUTHOR_FIELD.role]),
    bio: readString(record.values[AUTHOR_FIELD.bio]),
    avatar: readImageRef(record.values[AUTHOR_FIELD.avatar]),
    email: readOptionalString(record.values[AUTHOR_FIELD.email]),
    websiteUrl: readOptionalString(record.values[AUTHOR_FIELD.websiteUrl]),
    xHandle: readOptionalString(record.values[AUTHOR_FIELD.xHandle]),
    instagramHandle: readOptionalString(record.values[AUTHOR_FIELD.instagramHandle]),
    linkedinUrl: readOptionalString(record.values[AUTHOR_FIELD.linkedinUrl])
  };
}

// --- Article categories -----------------------------------------------------

const ARTICLE_CATEGORY_FIELD = fieldMap("article-categories", ["name", "slug", "description", "sortOrder"] as const);

export function toArticleCategory(record: CmsRecord): ArticleCategory | null {
  const slug = readString(record.values[ARTICLE_CATEGORY_FIELD.slug]).trim();
  if (!slug) {
    return null;
  }
  return {
    id: record.id,
    slug,
    name: readString(record.values[ARTICLE_CATEGORY_FIELD.name]),
    description: readString(record.values[ARTICLE_CATEGORY_FIELD.description]),
    sortOrder: readNumber(record.values[ARTICLE_CATEGORY_FIELD.sortOrder])
  };
}

/** `sortOrder` ascending, then `name` — the order every category listing uses. */
export function sortArticleCategories(categories: ArticleCategory[]): ArticleCategory[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

// --- FAQs --------------------------------------------------------------------

const FAQ_FIELD = fieldMap("faqs", ["question", "answer", "topic", "sortOrder"] as const);

export function toFaq(record: CmsRecord): Faq | null {
  return {
    id: record.id,
    question: readString(record.values[FAQ_FIELD.question]),
    answer: readString(record.values[FAQ_FIELD.answer]),
    topic: readString(record.values[FAQ_FIELD.topic]),
    sortOrder: readNumber(record.values[FAQ_FIELD.sortOrder])
  };
}

/** `sortOrder` ascending, then `question` — the order every FAQ listing uses. */
export function sortFaqs(faqs: Faq[]): Faq[] {
  return [...faqs].sort((a, b) => a.sortOrder - b.sortOrder || a.question.localeCompare(b.question));
}

// --- Testimonials ------------------------------------------------------------

const TESTIMONIAL_FIELD = fieldMap("testimonials", [
  "customerName",
  "quote",
  "customerTitle",
  "company",
  "avatar",
  "rating",
  "product",
  "featured",
  "sortOrder"
] as const);

export function toTestimonial(record: CmsRecord): Testimonial | null {
  return {
    id: record.id,
    customerName: readString(record.values[TESTIMONIAL_FIELD.customerName]),
    quote: readString(record.values[TESTIMONIAL_FIELD.quote]),
    customerTitle: readOptionalString(record.values[TESTIMONIAL_FIELD.customerTitle]),
    company: readOptionalString(record.values[TESTIMONIAL_FIELD.company]),
    avatar: readImageRef(record.values[TESTIMONIAL_FIELD.avatar]),
    rating: readNumber(record.values[TESTIMONIAL_FIELD.rating]),
    productSlug: readOptionalString(record.values[TESTIMONIAL_FIELD.product]),
    featured: readBoolean(record.values[TESTIMONIAL_FIELD.featured]),
    sortOrder: readNumber(record.values[TESTIMONIAL_FIELD.sortOrder])
  };
}

/** `sortOrder` ascending, then `customerName` — the order every testimonial listing uses. */
export function sortTestimonials(testimonials: Testimonial[]): Testimonial[] {
  return [...testimonials].sort((a, b) => a.sortOrder - b.sortOrder || a.customerName.localeCompare(b.customerName));
}

// --- Site settings -----------------------------------------------------------

const SITE_SETTINGS_FIELD = fieldMap("site-settings", [
  "siteName",
  "titleTemplate",
  "defaultMetaDescription",
  "defaultOgImage",
  "favicon",
  "twitterHandle",
  "locale",
  "allowIndexing",
  "schemaMarkup"
] as const);

/** Site settings is a singleton with no publish-status-worthy identity of its own, so there's no `null` case. */
export function toSiteSettings(record: CmsRecord): SiteSettings {
  return {
    siteName: readString(record.values[SITE_SETTINGS_FIELD.siteName]),
    titleTemplate: readString(record.values[SITE_SETTINGS_FIELD.titleTemplate]),
    defaultMetaDescription: readString(record.values[SITE_SETTINGS_FIELD.defaultMetaDescription]),
    defaultOgImage: readImageRef(record.values[SITE_SETTINGS_FIELD.defaultOgImage]),
    favicon: readImageRef(record.values[SITE_SETTINGS_FIELD.favicon]),
    twitterHandle: readString(record.values[SITE_SETTINGS_FIELD.twitterHandle]),
    locale: readString(record.values[SITE_SETTINGS_FIELD.locale]),
    allowIndexing: readBoolean(record.values[SITE_SETTINGS_FIELD.allowIndexing]),
    schemaMarkup: readSchemaMarkup(record.values[SITE_SETTINGS_FIELD.schemaMarkup])
  };
}

// --- Page settings -------------------------------------------------------------

const PAGE_SETTINGS_FIELD = fieldMap("page-settings", [
  "pageName",
  "pagePath",
  "metaTitle",
  "metaDescription",
  "canonicalUrl",
  "ogTitle",
  "ogDescription",
  "ogImage",
  "searchTitle",
  "searchDescription",
  "searchImage",
  "schemaMarkup"
] as const);

export function toPageSettings(record: CmsRecord): PageSettings | null {
  return {
    id: record.id,
    pageName: readString(record.values[PAGE_SETTINGS_FIELD.pageName]),
    pagePath: readString(record.values[PAGE_SETTINGS_FIELD.pagePath]),
    metaTitle: readString(record.values[PAGE_SETTINGS_FIELD.metaTitle]),
    metaDescription: readString(record.values[PAGE_SETTINGS_FIELD.metaDescription]),
    canonicalUrl: readString(record.values[PAGE_SETTINGS_FIELD.canonicalUrl]),
    ogTitle: readString(record.values[PAGE_SETTINGS_FIELD.ogTitle]),
    ogDescription: readString(record.values[PAGE_SETTINGS_FIELD.ogDescription]),
    ogImage: readImageRef(record.values[PAGE_SETTINGS_FIELD.ogImage]),
    searchTitle: readString(record.values[PAGE_SETTINGS_FIELD.searchTitle]),
    searchDescription: readString(record.values[PAGE_SETTINGS_FIELD.searchDescription]),
    searchImage: readImageRef(record.values[PAGE_SETTINGS_FIELD.searchImage]),
    schemaMarkup: readSchemaMarkup(record.values[PAGE_SETTINGS_FIELD.schemaMarkup])
  };
}

// --- Redirect rules ------------------------------------------------------------

const REDIRECT_RULE_FIELD = fieldMap("redirect-rules", ["sourcePath", "targetUrl", "statusCode", "permanent"] as const);

export function toRedirectRule(record: CmsRecord): RedirectRule | null {
  const sourcePath = readString(record.values[REDIRECT_RULE_FIELD.sourcePath]).trim();
  if (!sourcePath) {
    return null;
  }
  return {
    sourcePath,
    targetUrl: readString(record.values[REDIRECT_RULE_FIELD.targetUrl]),
    statusCode: readRedirectStatusCode(record.values[REDIRECT_RULE_FIELD.statusCode]),
    permanent: readBoolean(record.values[REDIRECT_RULE_FIELD.permanent])
  };
}
