import type { ContentSource } from "./content-source";
import { mockContentSource } from "./mock-source";

export type { ContentEntry, ContentSource } from "./content-source";

/**
 * Resolves the active content source from `CONTENT_SOURCE`:
 *   - "api"          -> reads published content from this project's own API
 *                       (`apps/api`), at `CONTENT_API_ORIGIN` (falling back to
 *                       `API_ORIGIN`) — see `./api-source.ts`.
 *   - unset / "mock" -> the zero-config mock source, so builds work with no
 *                       backend at all.
 *   - anything else  -> a configuration error.
 *
 * `import.meta.env` is how Astro/Vite expose env vars server-side; `process.env`
 * is read defensively in case a var only reaches the Node process (e.g. set by
 * the shell/CI rather than an `.env` file Vite loads).
 */
let cached: Promise<ContentSource> | null = null;

function readEnv(name: string): string | undefined {
  const fromImportMeta = (import.meta.env as Record<string, string | undefined>)[name];
  return fromImportMeta ?? process.env[name];
}

async function resolveContentSource(): Promise<ContentSource> {
  const mode = readEnv("CONTENT_SOURCE");

  let source: ContentSource;

  if (mode === undefined || mode === "mock") {
    source = mockContentSource;
  } else if (mode === "api") {
    const apiOrigin = readEnv("CONTENT_API_ORIGIN") ?? readEnv("API_ORIGIN");
    if (!apiOrigin) {
      throw new Error(
        'CONTENT_SOURCE=api requires CONTENT_API_ORIGIN (or API_ORIGIN) to be set to the API app\'s origin, e.g. "http://127.0.0.1:5175".'
      );
    }
    const { createApiContentSource } = await import("./api-source");
    source = createApiContentSource(apiOrigin);
  } else {
    throw new Error(`Unknown CONTENT_SOURCE "${mode}" — expected "api", "mock", or unset.`);
  }

  console.info(`[content] source: ${source.name}`);

  if (source.name === "mock" && process.env.VERCEL_ENV === "production") {
    console.warn(
      "[content] Production Vercel build is using the mock content source — set CONTENT_SOURCE=api (and CONTENT_API_ORIGIN/API_ORIGIN) to publish real content."
    );
  }

  return source;
}

export function getContentSource(): Promise<ContentSource> {
  if (!cached) {
    cached = resolveContentSource();
  }
  return cached;
}
