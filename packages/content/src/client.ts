import { contentApiPaths, type CmsRecord } from "@three-acts/cms-schema";
import type { Article, ArticleCategory, Author, Faq, PageSettings, RecordMapper, RedirectRule, SiteSettings, Testimonial } from "./models";
import {
  sortArticleCategories,
  sortArticles,
  sortFaqs,
  sortTestimonials,
  toArticle,
  toArticleCategory,
  toAuthor,
  toFaq,
  toPageSettings,
  toSiteSettings,
  toTestimonial
} from "./mappers";

const PAGE_SIZE = 200;
const PRODUCTS_COLLECTION_ID = "products";
const PRODUCT_CATEGORIES_COLLECTION_ID = "product-categories";
const SITE_SETTINGS_COLLECTION_ID = "site-settings";
const PAGE_SETTINGS_COLLECTION_ID = "page-settings";

/**
 * A minimal `fetch`-shaped function: takes a fully-qualified URL, returns
 * something `Response`-like. The global `fetch` satisfies this on its own;
 * tests and `createSeedContentFetch()` pass a lighter stand-in.
 */
export type ContentFetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

type ListRecordsResultBody = { records: CmsRecord[]; total: number };
type RedirectsResultBody = { redirects: RedirectRule[] };

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error?: { code?: string; message?: string } };

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return typeof value === "object" && value !== null && "ok" in value;
}

/** Parses the `{ ok, data } | { ok: false, error }` envelope, throwing a clear error on any failure. */
async function requestJson(fetchImpl: ContentFetch, url: string): Promise<unknown> {
  const response = await fetchImpl(url);
  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw new Error(`@three-acts/content: could not parse a JSON response from ${url} (HTTP ${response.status}).`, { cause });
  }

  if (!response.ok || !isEnvelope(body) || body.ok !== true) {
    const detail =
      isEnvelope(body) && body.ok === false && body.error
        ? `${body.error.code ?? "error"}: ${body.error.message ?? "unknown error"}`
        : `HTTP ${response.status}`;
    throw new Error(`@three-acts/content: request to ${url} failed — ${detail}`);
  }

  return body.data;
}

/** Fetches every page of a public content collection, following `total` until exhausted. */
async function fetchAllRecords(
  fetchImpl: ContentFetch,
  origin: string,
  collectionId: string,
  sort?: { key: string; direction: "asc" | "desc" }
): Promise<CmsRecord[]> {
  const records: CmsRecord[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (records.length < total) {
    const url = new URL(`${origin}/api${contentApiPaths.records(collectionId)}`);
    if (sort) {
      url.searchParams.set("sortKey", sort.key);
      url.searchParams.set("sortDirection", sort.direction);
    }
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));

    const data = (await requestJson(fetchImpl, url.toString())) as ListRecordsResultBody;
    const page = data.records;
    total = data.total;
    records.push(...page);

    // Guard against an infinite loop if `total` is ever inconsistent with the
    // records actually returned.
    if (page.length === 0) {
      break;
    }
    offset += page.length;
  }

  return records;
}

export type ContentClient = {
  listArticles(): Promise<Article[]>;
  getArticle(slug: string): Promise<Article | null>;
  listAuthors(): Promise<Author[]>;
  listArticleCategories(): Promise<ArticleCategory[]>;
  listFaqs(): Promise<Faq[]>;
  listTestimonials(): Promise<Testimonial[]>;
  /** Raw records of any collection served by the public content route, paginated and cached. */
  listRecords(collectionId: string): Promise<CmsRecord[]>;
  /** `listRecords` run through a typed mapper; records the mapper maps to `null` are skipped with a `console.warn`. */
  list<T>(collectionId: string, mapper: RecordMapper<T>): Promise<T[]>;
  /** Product types live in `@three-acts/ecommerce`; pass its `toProduct` mapper, or omit it for raw `CmsRecord[]`. */
  listProducts<T = CmsRecord>(mapper?: RecordMapper<T>): Promise<T[]>;
  getProduct<T = CmsRecord>(slug: string, mapper?: RecordMapper<T>): Promise<T | null>;
  listProductCategories<T = CmsRecord>(mapper?: RecordMapper<T>): Promise<T[]>;
  getSiteSettings(): Promise<SiteSettings | null>;
  listPageSettings(): Promise<PageSettings[]>;
  listRedirects(): Promise<RedirectRule[]>;
};

function warnSkipped(collectionId: string, recordId: string): void {
  console.warn(`[@three-acts/content] skipping record "${recordId}" in "${collectionId}" — the mapper returned null.`);
}

function resolveFetch(explicit: ContentFetch | undefined): ContentFetch {
  if (explicit) {
    return explicit;
  }
  if (typeof fetch === "function") {
    return fetch as ContentFetch;
  }
  throw new Error("@three-acts/content: no `fetch` was provided and no global `fetch` is available.");
}

export function createContentClient(options: { origin: string; fetch?: ContentFetch }): ContentClient {
  const origin = options.origin.replace(/\/+$/, "");
  const fetchImpl = resolveFetch(options.fetch);

  // Raw-record fetches are cached per collection id; every typed listX below
  // shares that cache instead of re-fetching the same collection.
  const recordsCache = new Map<string, Promise<CmsRecord[]>>();
  let redirectsCache: Promise<RedirectRule[]> | undefined;

  function loadRecords(collectionId: string, sort?: { key: string; direction: "asc" | "desc" }): Promise<CmsRecord[]> {
    const cached = recordsCache.get(collectionId);
    if (cached) {
      return cached;
    }
    const promise = fetchAllRecords(fetchImpl, origin, collectionId, sort);
    recordsCache.set(collectionId, promise);
    return promise;
  }

  async function listMapped<T>(collectionId: string, mapper: RecordMapper<T>, sort?: { key: string; direction: "asc" | "desc" }): Promise<T[]> {
    const records = await loadRecords(collectionId, sort);
    const mapped: T[] = [];
    for (const record of records) {
      const value = mapper(record);
      if (value === null) {
        warnSkipped(collectionId, record.id);
        continue;
      }
      mapped.push(value);
    }
    return mapped;
  }

  async function listArticles(): Promise<Article[]> {
    const articles = await listMapped("articles", toArticle, { key: "publishedAt", direction: "desc" });
    return sortArticles(articles);
  }

  async function listPageSettings(): Promise<PageSettings[]> {
    const records = await loadRecords(PAGE_SETTINGS_COLLECTION_ID);
    const mapped: PageSettings[] = [];
    for (const record of records) {
      const value = toPageSettings(record);
      if (value) {
        mapped.push(value);
      }
    }
    return mapped;
  }

  async function listRedirects(): Promise<RedirectRule[]> {
    if (redirectsCache) {
      return redirectsCache;
    }
    redirectsCache = (async () => {
      const url = `${origin}/api/content/redirects`;
      const data = (await requestJson(fetchImpl, url)) as RedirectsResultBody;
      return data.redirects;
    })();
    return redirectsCache;
  }

  return {
    listArticles,
    async getArticle(slug) {
      const articles = await listArticles();
      return articles.find((article) => article.slug === slug) ?? null;
    },
    async listAuthors() {
      return listMapped("authors", toAuthor);
    },
    async listArticleCategories() {
      const categories = await listMapped("article-categories", toArticleCategory);
      return sortArticleCategories(categories);
    },
    async listFaqs() {
      const faqs = await listMapped("faqs", toFaq);
      return sortFaqs(faqs);
    },
    async listTestimonials() {
      const testimonials = await listMapped("testimonials", toTestimonial);
      return sortTestimonials(testimonials);
    },
    async listRecords(collectionId) {
      return loadRecords(collectionId);
    },
    list: listMapped,
    async listProducts<T = CmsRecord>(mapper?: RecordMapper<T>): Promise<T[]> {
      if (!mapper) {
        return (await loadRecords(PRODUCTS_COLLECTION_ID)) as unknown as T[];
      }
      return listMapped(PRODUCTS_COLLECTION_ID, mapper);
    },
    async getProduct<T = CmsRecord>(slug: string, mapper?: RecordMapper<T>): Promise<T | null> {
      const records = await loadRecords(PRODUCTS_COLLECTION_ID);
      const record = records.find((item) => {
        const value = item.values.slug;
        return typeof value === "string" && value.trim() === slug;
      });
      if (!record) {
        return null;
      }
      if (!mapper) {
        return record as unknown as T;
      }
      return mapper(record);
    },
    async listProductCategories<T = CmsRecord>(mapper?: RecordMapper<T>): Promise<T[]> {
      if (!mapper) {
        return (await loadRecords(PRODUCT_CATEGORIES_COLLECTION_ID)) as unknown as T[];
      }
      return listMapped(PRODUCT_CATEGORIES_COLLECTION_ID, mapper);
    },
    async getSiteSettings() {
      const records = await loadRecords(SITE_SETTINGS_COLLECTION_ID);
      const record = records[0];
      return record ? toSiteSettings(record) : null;
    },
    listPageSettings,
    listRedirects
  };
}
