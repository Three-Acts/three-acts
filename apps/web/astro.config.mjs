// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");
const apiOrigin = env.API_ORIGIN;

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
