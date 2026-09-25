import type { APIRoute } from "astro";
import { loadSiteSettings } from "../content/loaders";
import { getSitemapPages } from "../page-meta";
import { site } from "../site";

/** `]` would prematurely close a `[title]` markdown link label. */
function escapeLinkText(value: string) {
  return value.replaceAll("]", "\\]");
}

/** `(`/`)` would prematurely close a `(url)` markdown link destination. */
function escapeLinkUrl(value: string) {
  return value.replaceAll("(", "%28").replaceAll(")", "%29");
}

/**
 * llms.txt — curated index for AI answer engines (AEO). See https://llmstxt.org
 * Static-file endpoint: written to `dist/llms.txt` at build time. Only lists
 * pages `getSitemapPages()` considers indexable (live page-settings records,
 * every live product/category/article/author).
 */
export const GET: APIRoute = async () => {
  const [pages, settings] = await Promise.all([getSitemapPages(), loadSiteSettings()]);
  const name = settings.siteName || site.name;
  const description = settings.defaultMetaDescription || site.description;

  const llms = [
    `# ${name}`,
    "",
    `> ${description}`,
    "",
    "## Pages",
    ...pages.map((page) => {
      const loc = new URL(page.seo.canonicalPath, site.url).toString();
      return `- [${escapeLinkText(page.seo.title)}](${escapeLinkUrl(loc)}): ${page.seo.description}`;
    }),
    ""
  ].join("\n");

  return new Response(llms, { headers: { "Content-Type": "text/plain" } });
};
