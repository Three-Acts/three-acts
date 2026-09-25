/**
 * Barrel for `src/page-meta/*` — split out of one file because the storefront
 * has a builder per route family (static pages, shop, journal, client
 * routes) plus the sitemap/llms.txt enumeration. Page agents should keep
 * importing from `"../page-meta"` (or `"./page-meta"`), not the submodules
 * directly.
 */
export * from "./page-meta/types";
export * from "./page-meta/builders";
export * from "./page-meta/sitemap";
