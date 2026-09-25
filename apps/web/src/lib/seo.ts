import { applyTitleTemplate } from "@three-acts/cms-schema";
import type { SiteSettings } from "@three-acts/content";
import { site } from "../site";
import type { SeoMetadata } from "../page-meta/types";

/** Escape a JSON-LD payload so it cannot break out of the <script> element. */
export function escapeJsonLd(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}

function absolute(pathOrUrl: string, base: string) {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : new URL(pathOrUrl, base).toString();
}

function asObjectArray(value: readonly unknown[]): Record<string, unknown>[] {
  return value.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null);
}

export type ResolvedSeo = {
  title: string;
  description: string;
  canonical: string;
  image: string;
  ogTitle: string;
  ogDescription: string;
  type: "website" | "article";
  robots: string;
  keywords?: string;
  favicon: string;
  twitter: string;
  locale: string;
  siteName: string;
  /** Serialized (escaped) JSON-LD `@graph` payload for a <script type="application/ld+json">. */
  jsonLd: string;
};

/**
 * Resolves a route's `SeoMetadata` (page-specific) together with the
 * sitewide `SiteSettings` (from `@three-acts/content`, via
 * `src/content/loaders.ts`'s `loadSiteSettings`) into the concrete values the
 * layout renders: title (through the site's title template), description,
 * canonical, robots, favicon, Twitter handle, locale, Open Graph/Twitter
 * image, and JSON-LD structured data (Organization + WebSite, the site's own
 * sitewide `schemaMarkup`, plus a per-page WebPage/Article — or whatever
 * `seo.structuredData` supplies).
 *
 * `siteSettings.allowIndexing === false` forces `noindex,nofollow`
 * everywhere, regardless of the page's own `seo.noindex`.
 *
 * Structured data doubles as AEO (answer-engine optimization): AI search
 * crawlers read JSON-LD to understand and cite pages.
 */
export function resolveSeo(seo: SeoMetadata, siteSettings: SiteSettings): ResolvedSeo {
  const siteName = siteSettings.siteName || site.name;
  const description = seo.description || siteSettings.defaultMetaDescription || site.description;
  const defaultImage = siteSettings.defaultOgImage?.src || site.defaultImage;
  const favicon = siteSettings.favicon?.src || "/favicon.svg";
  const twitter = siteSettings.twitterHandle || site.twitter;
  const locale = siteSettings.locale || site.locale;
  const type = seo.type ?? "website";

  const canonical = absolute(seo.canonicalPath, site.url);
  const image = absolute(seo.image ?? defaultImage, site.url);
  const title = applyTitleTemplate(siteSettings.titleTemplate, seo.title);
  const ogTitle = seo.ogTitle || title;
  const ogDescription = seo.ogDescription || description;

  const noindex = Boolean(seo.noindex) || siteSettings.allowIndexing === false;
  const robots = noindex ? "noindex,nofollow" : "index,follow";

  // Generic per-page node (WebPage, or Article when no more specific entity is
  // supplied). When `seo.structuredData` provides a primary entity of its own
  // (e.g. a blog post's BlogPosting), merge these shared fields into it
  // instead of also emitting this node — otherwise a blog post ends up with
  // both an `Article` and a `BlogPosting` describing the same URL.
  const primaryEntity: Record<string, unknown> = {
    "@type": type === "article" ? "Article" : "WebPage",
    name: seo.title,
    headline: seo.title,
    description,
    url: canonical,
    inLanguage: locale.replace("_", "-"),
    isPartOf: { "@type": "WebSite", name: siteName, url: site.url }
  };

  const structuredData: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      name: siteName,
      url: site.url,
      logo: absolute(defaultImage, site.url)
    },
    {
      "@type": "WebSite",
      name: siteName,
      url: site.url,
      description: siteSettings.defaultMetaDescription || site.description
    },
    // Sitewide schema markup (site-settings' own `schemaMarkup` field) merges
    // into every page's graph — e.g. an Organization/LocalBusiness node with
    // richer fields than the two generic ones above.
    ...asObjectArray(siteSettings.schemaMarkup)
  ];

  if (seo.structuredData) {
    const extra = Array.isArray(seo.structuredData) ? seo.structuredData : [seo.structuredData];
    structuredData.push(...extra.map((entry, index) => (index === 0 ? { ...primaryEntity, ...entry } : entry)));
  } else {
    structuredData.push(primaryEntity);
  }

  return {
    title,
    description,
    canonical,
    image,
    ogTitle,
    ogDescription,
    type,
    robots,
    keywords: seo.keywords?.length ? seo.keywords.join(", ") : undefined,
    favicon,
    twitter,
    locale,
    siteName,
    jsonLd: escapeJsonLd({ "@context": "https://schema.org", "@graph": structuredData })
  };
}
