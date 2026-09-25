import { createContentClient, createSeedContentFetch, type ContentClient } from "@three-acts/content";

/**
 * Resolves the active `ContentClient` from `CONTENT_SOURCE`:
 *   - "api"          -> reads published content from this project's own API
 *                       (`apps/api`), at `CONTENT_API_ORIGIN` (falling back to
 *                       `API_ORIGIN`).
 *   - unset / "mock" -> the zero-config seed content fetch
 *                       (`@three-acts/content`'s `createSeedContentFetch`), so
 *                       builds work with no backend at all.
 *   - anything else  -> a configuration error.
 *
 * `import.meta.env` is how Astro/Vite expose env vars server-side; `process.env`
 * is read defensively in case a var only reaches the Node process (e.g. set by
 * the shell/CI rather than an `.env` file Vite loads).
 */
let cached: Promise<ContentClient> | null = null;

function readEnv(name: string): string | undefined {
  const fromImportMeta = (import.meta.env as Record<string, string | undefined>)[name];
  return fromImportMeta ?? process.env[name];
}

async function resolveContentClient(): Promise<ContentClient> {
  const mode = readEnv("CONTENT_SOURCE");

  let client: ContentClient;
  let sourceName: string;

  if (mode === undefined || mode === "mock") {
    client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    sourceName = "mock";
  } else if (mode === "api") {
    const apiOrigin = readEnv("CONTENT_API_ORIGIN") ?? readEnv("API_ORIGIN");
    if (!apiOrigin) {
      throw new Error(
        'CONTENT_SOURCE=api requires CONTENT_API_ORIGIN (or API_ORIGIN) to be set to the API app\'s origin, e.g. "http://127.0.0.1:5175".'
      );
    }
    client = createContentClient({ origin: apiOrigin });
    sourceName = "api";
  } else {
    throw new Error(`Unknown CONTENT_SOURCE "${mode}" — expected "api", "mock", or unset.`);
  }

  console.info(`[content] source: ${sourceName}`);

  if (sourceName === "mock" && process.env.VERCEL_ENV === "production") {
    console.warn(
      "[content] Production Vercel build is using the mock content source — set CONTENT_SOURCE=api (and CONTENT_API_ORIGIN/API_ORIGIN) to publish real content."
    );
  }

  return client;
}

/** The web app's single `ContentClient`, memoized for the life of the build/dev server. */
export function getContent(): Promise<ContentClient> {
  if (!cached) {
    cached = resolveContentClient();
  }
  return cached;
}

export type { ContentClient } from "@three-acts/content";
