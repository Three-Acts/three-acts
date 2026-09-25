import { loadArticleCategories, loadArticles, loadAuthors, loadFaqs, loadPageSettings, loadProductCategories, loadProducts } from "../content/loaders";
import { site } from "../site";
import {
  aboutMeta,
  articleMeta,
  authorMeta,
  blogCategoryMeta,
  blogIndexMeta,
  contactMeta,
  faqMeta,
  homeMeta,
  infoPageMeta,
  productCategoryMeta,
  productMeta,
  shopIndexMeta,
  agenciesMeta
} from "./builders";
import type { PageMeta } from "./types";

/** The `page-settings` static routes handled by `infoPageMeta` (see the build contract's `/web app/` section). */
const INFO_PAGE_PATHS = ["/docs", "/licenses", "/refunds", "/terms", "/privacy", "/careers", "/changelog"] as const;

/** `/docs` -> "Docs" — a plain fallback title used only when a route has no live `page-settings` record of its own. */
function titleFromPath(path: string): string {
  const last = path.split("/").filter(Boolean).pop() ?? "home";
  return last
    .split("-")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Whether a static route's `page-settings` record has a live snapshot.
 * `loadPageSettings()` (see `src/content/loaders.ts`) only ever returns live
 * records, so this is just membership — a route with no live record (e.g.
 * `/careers` while it's still `queued_to_publish`) isn't "live" yet. Page
 * agents use this to render a "coming soon" notice instead of full content.
 */
export async function isPageLive(path: string): Promise<boolean> {
  const pages = await loadPageSettings();
  return pages.some((page) => page.pagePath === path);
}

/**
 * Every sitemap-worthy page: the static routes (only when their
 * `page-settings` record is live — see `staticPageMeta`) plus every live
 * product, product category, article, article category and author. Used by
 * `sitemap.xml` and `llms.txt`.
 */
export async function getSitemapPages(): Promise<PageMeta[]> {
  const [products, productCategories, articles, articleCategories, authors, faqs] = await Promise.all([
    loadProducts(),
    loadProductCategories(),
    loadArticles(),
    loadArticleCategories(),
    loadAuthors(),
    loadFaqs()
  ]);

  const staticPages = await Promise.all([
    homeMeta(),
    shopIndexMeta(),
    blogIndexMeta(),
    aboutMeta(),
    contactMeta(),
    agenciesMeta(),
    faqMeta(faqs),
    ...INFO_PAGE_PATHS.map((path) => infoPageMeta(path, { title: `${titleFromPath(path)} | ${site.name}`, description: site.description }))
  ]);

  const pages: PageMeta[] = [...staticPages];

  for (const category of productCategories) {
    pages.push(productCategoryMeta(category));
  }
  for (const product of products) {
    pages.push(productMeta(product));
  }
  for (const category of articleCategories) {
    pages.push(blogCategoryMeta(category));
  }
  for (const article of articles) {
    const author = authors.find((candidate) => candidate.slug === article.authorSlug);
    pages.push(articleMeta(article, author));
  }
  for (const author of authors) {
    pages.push(authorMeta(author));
  }

  return pages.filter((page) => page.includeInSitemap);
}
