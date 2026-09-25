import type { Article, ArticleCategory, Author, Faq, PageSettings, RedirectRule, SiteSettings, Testimonial } from "@three-acts/content";
import { toProduct, toProductCategory, type Product, type ProductCategory } from "@three-acts/ecommerce";
import { getContent } from "./index";
import { site } from "../site";

/**
 * Typed, per-build-memoized convenience loaders over `getContent()`, for page
 * agents to import instead of talking to the `ContentClient` directly. Every
 * loader below is a singleton in the sense that repeated calls (across pages,
 * within the same build/dev process) resolve the same promise rather than
 * re-fetching — on top of `ContentClient`'s own per-collection request cache,
 * this also memoizes the mapping/filtering work each loader does.
 */

/** Memoizes a zero-argument async loader: the first call's promise is reused by every later call. */
function once<T>(loader: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    if (!promise) {
      promise = loader();
    }
    return promise;
  };
}

/** Memoizes a single-argument async loader, keyed by that argument. */
function onceBy<A extends string, T>(loader: (arg: A) => Promise<T>): (arg: A) => Promise<T> {
  const cache = new Map<A, Promise<T>>();
  return (arg: A) => {
    let promise = cache.get(arg);
    if (!promise) {
      promise = loader(arg);
      cache.set(arg, promise);
    }
    return promise;
  };
}

export const loadArticles = once(async (): Promise<Article[]> => {
  const client = await getContent();
  return client.listArticles();
});

export const loadArticle = onceBy(async (slug: string): Promise<Article | null> => {
  const client = await getContent();
  return client.getArticle(slug);
});

export const loadAuthors = once(async (): Promise<Author[]> => {
  const client = await getContent();
  return client.listAuthors();
});

export const loadAuthor = onceBy(async (slug: string): Promise<Author | null> => {
  const authors = await loadAuthors();
  return authors.find((author) => author.slug === slug) ?? null;
});

export const loadArticleCategories = once(async (): Promise<ArticleCategory[]> => {
  const client = await getContent();
  return client.listArticleCategories();
});

export const loadFaqs = once(async (): Promise<Faq[]> => {
  const client = await getContent();
  return client.listFaqs();
});

export const loadTestimonials = once(async (): Promise<Testimonial[]> => {
  const client = await getContent();
  return client.listTestimonials();
});

/** Live products only — `toProduct` records with `availability: "discontinued"` are dropped. */
export const loadProducts = once(async (): Promise<Product[]> => {
  const client = await getContent();
  const products = await client.listProducts(toProduct);
  return products.filter((product) => product.availability !== "discontinued");
});

export const loadProduct = onceBy(async (slug: string): Promise<Product | null> => {
  const client = await getContent();
  return client.getProduct(slug, toProduct);
});

export const loadProductCategories = once(async (): Promise<ProductCategory[]> => {
  const client = await getContent();
  return client.listProductCategories(toProductCategory);
});

/** Falls back to `site.ts`'s static brand defaults when the API has no live `site-settings` record. */
export const loadSiteSettings = once(async (): Promise<SiteSettings> => {
  const client = await getContent();
  const settings = await client.getSiteSettings();
  if (settings) {
    return settings;
  }
  return {
    siteName: site.name,
    titleTemplate: `%s · ${site.name}`,
    defaultMetaDescription: site.description,
    defaultOgImage: { src: site.defaultImage, alt: site.name },
    twitterHandle: site.twitter,
    locale: site.locale,
    allowIndexing: true,
    schemaMarkup: []
  };
});

export const loadPageSettings = once(async (): Promise<PageSettings[]> => {
  const client = await getContent();
  return client.listPageSettings();
});

export const loadRedirects = once(async (): Promise<RedirectRule[]> => {
  const client = await getContent();
  return client.listRedirects();
});

function tagOverlap(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  return b.reduce((count, tag) => count + (setA.has(tag) ? 1 : 0), 0);
}

/** Same category first, then the highest tag overlap, then the source list's own order. Never includes `article` itself. */
export function relatedArticles(article: Article, all: readonly Article[], count: number): Article[] {
  const others = all.filter((candidate) => candidate.slug !== article.slug);
  const sameCategory = others.filter((candidate) => candidate.categorySlug === article.categorySlug);
  const rest = others.filter((candidate) => candidate.categorySlug !== article.categorySlug);
  const byOverlap = rest
    .map((candidate) => ({ candidate, overlap: tagOverlap(article.tags, candidate.tags) }))
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .map((entry) => entry.candidate);
  return [...sameCategory, ...byOverlap].slice(0, count);
}

/** Same category first, then the highest tag overlap, then the source list's own order. Never includes `product` itself. */
export function relatedProducts(product: Product, all: readonly Product[], count: number): Product[] {
  const others = all.filter((candidate) => candidate.slug !== product.slug);
  const sameCategory = others.filter((candidate) => candidate.categorySlug === product.categorySlug);
  const rest = others.filter((candidate) => candidate.categorySlug !== product.categorySlug);
  const byOverlap = rest
    .map((candidate) => ({ candidate, overlap: tagOverlap(product.tags, candidate.tags) }))
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .map((entry) => entry.candidate);
  return [...sameCategory, ...byOverlap].slice(0, count);
}
