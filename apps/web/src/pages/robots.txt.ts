import type { APIRoute } from "astro";
import { loadSiteSettings } from "../content/loaders";
import { site } from "../site";

/** Static-file endpoint: written to `dist/robots.txt` at build time. Honours the site settings' `allowIndexing` flag. */
export const GET: APIRoute = async () => {
  const settings = await loadSiteSettings();

  const rules = settings.allowIndexing
    ? [
        "# All crawlers, including AI answer engines (GPTBot, ClaudeBot, PerplexityBot, Google-Extended), are welcome.",
        "User-agent: *",
        "Allow: /"
      ]
    : ["# Indexing is disabled in site settings.", "User-agent: *", "Disallow: /"];

  const robots = [...rules, "", `Sitemap: ${new URL("/sitemap.xml", site.url).toString()}`, ""].join("\n");

  return new Response(robots, { headers: { "Content-Type": "text/plain" } });
};
