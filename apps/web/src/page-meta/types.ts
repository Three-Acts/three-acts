export type SeoMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
  /** OG/Twitter image, local (`/og.png`) or absolute URL. Falls back to the site's default OG image. */
  image?: string;
  /** Falls back to `title` (after the site's title template is applied). */
  ogTitle?: string;
  /** Falls back to `description`. */
  ogDescription?: string;
  type?: "website" | "article";
  /** Emit `noindex,nofollow` for this route, regardless of the site's `allowIndexing`. */
  noindex?: boolean;
  keywords?: string[];
  /** ISO timestamp for sitemap `<lastmod>`. */
  lastmod?: string;
  /** Extra JSON-LD graph node(s) merged into the page structured data. */
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

export type PageMeta = {
  path: string;
  includeInSitemap: boolean;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  seo: SeoMetadata;
};
