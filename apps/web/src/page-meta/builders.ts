import type { Article, ArticleCategory, Author, Faq } from "@three-acts/content";
import type { Product, ProductCategory, ProductReview } from "@three-acts/ecommerce";
import { loadPageSettings } from "../content/loaders";
import { site } from "../site";
import type { PageMeta, SeoMetadata } from "./types";

/**
 * Every `PageMeta` builder in this file. The static-route builders
 * (`homeMeta`, `aboutMeta`, `faqMeta`, `contactMeta`, `wholesaleMeta`,
 * `infoPageMeta`, `shopIndexMeta`, `blogIndexMeta`) overlay a live
 * `page-settings` record over caller-supplied fallback copy via
 * `staticPageMeta`, so they're all `async`. The per-record builders
 * (`productMeta`, `productCategoryMeta`, `articleMeta`, `authorMeta`,
 * `blogCategoryMeta`) take an already-loaded record and need no further
 * content lookup, so they're synchronous. The client-route metas need
 * neither and are plain constants.
 */

function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}

type StaticPageMetaOptions = {
  changefreq?: PageMeta["changefreq"];
  priority?: number;
  type?: "website" | "article";
};

/**
 * Builds a `PageMeta` for a static route by overlaying its live
 * `page-settings` record (if any) over `fallback`, following the fallback
 * chain the registry describes: `metaTitle`/`metaDescription` fall back to
 * the caller's `fallback`; `canonicalUrl` falls back to `path`;
 * `ogTitle`/`ogDescription` fall back to the resolved meta title/description;
 * `ogImage`/`schemaMarkup` are passed through when present.
 *
 * `loadPageSettings()` (see `src/content/loaders.ts`) only ever returns
 * records with a live snapshot, so a route with NO live `page-settings`
 * record (e.g. a "coming soon" page — see `isPageLive` in `./sitemap`) gets
 * `includeInSitemap: false` and `seo.noindex: true` here.
 */
export async function staticPageMeta(path: string, fallback: { title: string; description: string }, options: StaticPageMetaOptions = {}): Promise<PageMeta> {
  const pages = await loadPageSettings();
  const record = pages.find((page) => page.pagePath === path);

  const title = record?.metaTitle || fallback.title;
  const description = record?.metaDescription || fallback.description;
  const canonicalPath = record?.canonicalUrl || path;
  const ogTitle = record?.ogTitle || title;
  const ogDescription = record?.ogDescription || description;
  const schemaMarkup = record?.schemaMarkup && record.schemaMarkup.length > 0 ? (record.schemaMarkup as Record<string, unknown>[]) : undefined;

  const seo: SeoMetadata = {
    title,
    description,
    canonicalPath,
    ogTitle,
    ogDescription,
    type: options.type ?? "website",
    noindex: record ? undefined : true
  };
  if (record?.ogImage?.src) {
    seo.image = record.ogImage.src;
  }
  if (schemaMarkup) {
    seo.structuredData = schemaMarkup;
  }

  return {
    path,
    includeInSitemap: Boolean(record),
    changefreq: options.changefreq,
    priority: options.priority,
    seo
  };
}

// --- Static routes -----------------------------------------------------------

export function homeMeta(): Promise<PageMeta> {
  return staticPageMeta(
    "/",
    { title: "Specialty coffee roasted in Cape Town", description: site.description },
    { changefreq: "weekly", priority: 1 }
  );
}

export function aboutMeta(): Promise<PageMeta> {
  return staticPageMeta(
    "/about",
    { title: `About`, description: `The story behind ${site.name}, our roastery in Observatory, Cape Town.` },
    { changefreq: "monthly", priority: 0.7 }
  );
}

export function contactMeta(): Promise<PageMeta> {
  return staticPageMeta("/contact", { title: `Contact`, description: `Get in touch with ${site.name}.` }, { changefreq: "yearly", priority: 0.4 });
}

export function wholesaleMeta(): Promise<PageMeta> {
  return staticPageMeta(
    "/wholesale",
    { title: `Wholesale`, description: `Wholesale coffee for cafés, offices and restaurants from ${site.name}.` },
    { changefreq: "monthly", priority: 0.5 }
  );
}

/** For `/visit-the-roastery`, `/shipping`, `/returns`, `/terms`, `/privacy`, `/careers`, `/subscriptions` — the caller supplies its own real-feeling fallback copy. */
export function infoPageMeta(path: string, fallback: { title: string; description: string }): Promise<PageMeta> {
  return staticPageMeta(path, fallback, { changefreq: "yearly", priority: 0.3 });
}

export function shopIndexMeta(): Promise<PageMeta> {
  return staticPageMeta(
    "/shop",
    { title: `Shop`, description: `Shop single-origin coffee, blends and brewing gear from ${site.name}.` },
    { changefreq: "daily", priority: 0.9 }
  );
}

export function blogIndexMeta(): Promise<PageMeta> {
  return staticPageMeta(
    "/blog",
    { title: `Journal`, description: `Brewing guides, origin notes and roastery news from ${site.name}.` },
    { changefreq: "daily", priority: 0.8 }
  );
}

/** FAQPage JSON-LD from the live `faqs`. */
export async function faqMeta(faqs: readonly Faq[]): Promise<PageMeta> {
  const base = await staticPageMeta(
    "/faq",
    { title: `FAQ`, description: `Answers to common questions about ordering, brewing and shipping from ${site.name}.` },
    { changefreq: "monthly", priority: 0.5 }
  );
  if (faqs.length === 0) {
    return base;
  }
  const faqLd = {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer }
    }))
  };
  const existing = base.seo.structuredData;
  const structuredData = existing ? [...(Array.isArray(existing) ? existing : [existing]), faqLd] : faqLd;
  return { ...base, seo: { ...base.seo, structuredData } };
}

// --- Shop ----------------------------------------------------------------------

export function productCategoryMeta(category: ProductCategory): PageMeta {
  const path = `/shop/category/${category.slug}`;
  return {
    path,
    includeInSitemap: true,
    changefreq: "weekly",
    priority: 0.6,
    seo: {
      title: `${category.name}`,
      description: category.description || `Shop ${category.name.toLowerCase()} at ${site.name}.`,
      canonicalPath: path,
      image: category.image?.src,
      type: "website"
    }
  };
}

const AVAILABILITY_SCHEMA: Record<Product["availability"], string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
  discontinued: "https://schema.org/Discontinued"
};

/** Product JSON-LD (offers, availability) with an `aggregateRating` when `reviews` is given and non-empty. */
export function productMeta(product: Product, reviews?: readonly ProductReview[]): PageMeta {
  const path = `/shop/${product.slug}`;
  const description = product.shortDescription || product.description;

  const structuredData: Record<string, unknown> = {
    "@type": "Product",
    name: product.title,
    description,
    sku: product.sku,
    image: product.images.map((image) => image.src),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(path),
      priceCurrency: product.currency,
      price: product.price.toFixed(2),
      availability: AVAILABILITY_SCHEMA[product.availability],
      itemCondition: "https://schema.org/NewCondition"
    }
  };

  if (reviews && reviews.length > 0) {
    const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    structuredData.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(average.toFixed(1)),
      reviewCount: reviews.length
    };
  }

  return {
    path,
    includeInSitemap: true,
    changefreq: "weekly",
    priority: 0.7,
    seo: {
      title: `${product.title}`,
      description,
      canonicalPath: path,
      image: product.images[0]?.src,
      type: "website",
      structuredData
    }
  };
}

// --- Journal ---------------------------------------------------------------------

export function blogCategoryMeta(category: ArticleCategory): PageMeta {
  const path = `/blog/category/${category.slug}`;
  return {
    path,
    includeInSitemap: true,
    changefreq: "weekly",
    priority: 0.5,
    seo: {
      title: `${category.name} · Journal`,
      description: category.description || `Articles about ${category.name.toLowerCase()} from the ${site.name} journal.`,
      canonicalPath: path,
      type: "website"
    }
  };
}

/** Person JSON-LD. */
export function authorMeta(author: Author): PageMeta {
  const path = `/authors/${author.slug}`;
  const sameAs = [
    author.websiteUrl,
    author.xHandle ? `https://x.com/${author.xHandle.replace(/^@/, "")}` : undefined,
    author.instagramHandle ? `https://www.instagram.com/${author.instagramHandle.replace(/^@/, "")}` : undefined,
    author.linkedinUrl
  ].filter((value): value is string => Boolean(value));

  const structuredData: Record<string, unknown> = {
    "@type": "Person",
    name: author.name,
    url: absoluteUrl(path)
  };
  if (author.role) structuredData.jobTitle = author.role;
  if (author.bio) structuredData.description = author.bio;
  if (author.avatar?.src) structuredData.image = author.avatar.src;
  if (sameAs.length > 0) structuredData.sameAs = sameAs;

  return {
    path,
    includeInSitemap: true,
    changefreq: "monthly",
    priority: 0.3,
    seo: {
      title: `${author.name}`,
      description: author.bio || `${author.name}, ${author.role || "writer"} at ${site.name}.`,
      canonicalPath: path,
      image: author.avatar?.src,
      type: "website",
      structuredData
    }
  };
}

/** BlogPosting JSON-LD with a Person (or, absent an `author`, Organization) author. */
export function articleMeta(article: Article, author?: Author): PageMeta {
  const path = `/blog/${article.slug}`;
  const description = article.seoDescription || article.excerpt;
  const lastmod = article.updatedAt || article.publishedAt;

  const authorNode = author
    ? { "@type": "Person", name: author.name, url: absoluteUrl(`/authors/${author.slug}`) }
    : { "@type": "Organization", name: site.name };

  const structuredData: Record<string, unknown> = {
    "@type": "BlogPosting",
    headline: article.title,
    description,
    datePublished: article.publishedAt,
    dateModified: lastmod,
    author: authorNode,
    mainEntityOfPage: absoluteUrl(path)
  };
  if (article.coverImage?.src) {
    structuredData.image = article.coverImage.src;
  }

  return {
    path,
    includeInSitemap: true,
    changefreq: "monthly",
    priority: 0.6,
    seo: {
      title: article.seoTitle || article.title,
      description,
      canonicalPath: path,
      image: article.coverImage?.src,
      type: "article",
      keywords: article.tags,
      lastmod,
      structuredData
    }
  };
}

// --- Client routes (never prerendered with data — SPA shells) --------------------

function clientRouteMeta(path: string, title: string, description: string): PageMeta {
  return {
    path,
    includeInSitemap: false,
    seo: { title: `${title}`, description, canonicalPath: path, noindex: true }
  };
}

export const cartMeta: PageMeta = clientRouteMeta("/cart", "Your cart", "Review the items in your cart.");
export const checkoutMeta: PageMeta = clientRouteMeta("/checkout", "Checkout", "Complete your order.");
export const checkoutCompleteMeta: PageMeta = clientRouteMeta("/checkout/complete", "Order confirmed", "Your order confirmation.");
export const signInMeta: PageMeta = clientRouteMeta("/sign-in", "Sign in", "Sign in to your account.");
export const signUpMeta: PageMeta = clientRouteMeta("/sign-up", "Create an account", "Create your account.");
export const accountMeta: PageMeta = clientRouteMeta("/account", "Your account", "Manage your account and order history.");

export const notFoundMeta: PageMeta = {
  path: "/404",
  includeInSitemap: false,
  seo: {
    title: `Page not found`,
    description: "The page you were looking for could not be found.",
    canonicalPath: "/404",
    noindex: true
  }
};
