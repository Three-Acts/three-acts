// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { createContentClient, createSeedContentFetch } from "@three-acts/content";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");
const apiOrigin = env.API_ORIGIN;

/**
 * Loads redirect rules the same way `src/content/index.ts` resolves
 * `CONTENT_SOURCE` (kept in sync manually: this file can't import a `.ts`
 * sibling from `apps/web/src` without pulling in Astro/Vite-only globals, so
 * it talks to `@three-acts/content` directly with the same env resolution
 * instead). Any failure — an unreachable dev API, an unknown `CONTENT_SOURCE`
 * — falls back to no redirects rather than failing the whole config load.
 */
async function loadRedirectRules() {
  try {
    const mode = env.CONTENT_SOURCE;
    const client =
      mode === "api"
        ? createContentClient({ origin: (env.CONTENT_API_ORIGIN || apiOrigin || "").replace(/\/+$/, "") })
        : createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    return await client.listRedirects();
  } catch (error) {
    console.warn(`[astro.config] could not load redirect rules — building with none. ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * `{ sourcePath, targetUrl, statusCode }[]` -> Astro's `redirects` config
 * shape, skipping any rule that isn't a real path or is a no-op. A trailing
 * slash is stripped before dedup — Astro's default `trailingSlash: "ignore"`
 * treats `/foo` and `/foo/` as the same route, and the seed intentionally
 * carries both a bare and a trailing-slash source for some routes (real
 * legacy links differed only by that slash); the first rule for a given path
 * wins.
 */
function toAstroRedirects(rules) {
  /** @type {Record<string, { status: number; destination: string }>} */
  const redirects = {};
  for (const rule of rules) {
    if (!rule.sourcePath || rule.sourcePath.includes("?")) {
      continue;
    }
    let source = rule.sourcePath.startsWith("/") ? rule.sourcePath : `/${rule.sourcePath}`;
    if (source.length > 1) {
      source = source.replace(/\/+$/, "");
    }
    if (!rule.targetUrl || source === rule.targetUrl || source in redirects) {
      continue;
    }
    redirects[source] = { status: rule.statusCode, destination: rule.targetUrl };
  }
  return redirects;
}

const redirectRules = await loadRedirectRules();
const redirects = toAstroRedirects(redirectRules);

/**
 * A production Vercel build with no `VITE_SITE_URL` used to silently fall
 * back to `https://example.com` — a green build that ships wrong canonicals,
 * sitemap, and social tags. Prefer the env var; on Vercel production, derive
 * the origin from the platform instead of guessing; only fall back to
 * example.com for local/dev builds, where a wrong canonical is harmless.
 */
function resolveSiteUrl() {
  if (env.VITE_SITE_URL) {
    return env.VITE_SITE_URL.replace(/\/+$/, "");
  }

  if (process.env.VERCEL_ENV === "production") {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }

    throw new Error(
      "VITE_SITE_URL must be set for a production Vercel build (VERCEL_PROJECT_PRODUCTION_URL was not available to derive it from either)."
    );
  }

  return "https://example.com";
}

// https://astro.build/config
export default defineConfig({
  // Canonical origin, baked into canonicals, sitemap, robots.txt, and llms.txt
  // (exposed to code as `import.meta.env.SITE`).
  site: resolveSiteUrl(),
  output: "static",
  redirects,
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // Same-origin `/api/*` in dev, proxied to the API app (Vercel rewrite in prod).
    server: apiOrigin
      ? {
          proxy: {
            "/api": {
              target: apiOrigin,
              changeOrigin: true
            }
          }
        }
      : undefined,
    ssr: {
      // Bundle these for the build-time render so they resolve cleanly under npm workspaces.
      noExternal: ["@base-ui-components/react"]
    }
  }
});
