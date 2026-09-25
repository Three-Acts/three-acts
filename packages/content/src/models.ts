import type { CmsRecord } from "@three-acts/cms-schema";

/**
 * Typed read models for the editorial collections (articles, authors,
 * article categories, FAQs, testimonials, site/page settings, redirects).
 *
 * Products and product categories are deliberately NOT modelled here — that
 * domain belongs to `@three-acts/ecommerce` (built in parallel). Instead this
 * package exposes a generic, collection-agnostic path through the content
 * client:
 *
 *   - `client.listRecords(collectionId)` returns raw `CmsRecord[]` for any
 *     collection served by the public content route.
 *   - `client.list(collectionId, mapper)` runs `listRecords` through a typed
 *     mapper, skipping (and `console.warn`-ing about) any record the mapper
 *     maps to `null`.
 *   - `listProducts`, `getProduct` and `listProductCategories` are thin
 *     wrappers over those two: called with no arguments they return raw
 *     `CmsRecord[]` (or `CmsRecord | null` for `getProduct`); called with a
 *     mapper (e.g. `@three-acts/ecommerce`'s `toProduct`) they return the
 *     mapped, typed shape instead. This lets `@three-acts/ecommerce` own the
 *     `Product`/`ProductCategory` types and mapping logic without this
 *     package depending on it (or vice versa).
 */

/** A single image reference, already resolved from a Collection Schema `ImageValue`. */
export type ImageRef = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImage?: ImageRef;
  authorSlug: string;
  categorySlug: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  readingTime: number;
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

export type Author = {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  avatar?: ImageRef;
  email?: string;
  websiteUrl?: string;
  xHandle?: string;
  instagramHandle?: string;
  linkedinUrl?: string;
};

export type ArticleCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  topic: string;
  sortOrder: number;
};

export type Testimonial = {
  id: string;
  customerName: string;
  quote: string;
  customerTitle?: string;
  company?: string;
  avatar?: ImageRef;
  rating: number;
  productSlug?: string;
  featured: boolean;
  sortOrder: number;
};

export type SiteSettings = {
  siteName: string;
  titleTemplate: string;
  defaultMetaDescription: string;
  defaultOgImage?: ImageRef;
  favicon?: ImageRef;
  twitterHandle: string;
  locale: string;
  allowIndexing: boolean;
  schemaMarkup: unknown[];
};

export type PageSettings = {
  id: string;
  pageName: string;
  pagePath: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: ImageRef;
  searchTitle: string;
  searchDescription: string;
  searchImage?: ImageRef;
  schemaMarkup: unknown[];
};

export type RedirectRule = {
  sourcePath: string;
  targetUrl: string;
  statusCode: 301 | 302 | 307 | 308;
  permanent: boolean;
};

/** A mapper from a raw `CmsRecord` to a typed shape, or `null` to skip the record. */
export type RecordMapper<T> = (record: CmsRecord) => T | null;
