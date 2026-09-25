import { collectionRegistry, contentApiPaths, imageSrc, type CmsRecord, type ListRecordsResult } from "@three-acts/cms-schema";
import type { ContentEntry, ContentSource } from "./content-source";

/**
 * Content source backed by the project's own public API (`apps/api`), driven
 * by the shared `@three-acts/cms-schema` registry instead of a bespoke,
 * disconnected table shape. Reads the unauthenticated
 * `/api/content/collections/articles/records` endpoint, which only ever returns
 * `published` records — see `apps/api/api/content/collections/[collectionId]/records.ts`.
 */

const COLLECTION_ID = "articles";
const PAGE_SIZE = 200;

type ArticleFieldKey = "title" | "slug" | "excerpt" | "body" | "coverImage" | "author" | "tags" | "publishedAt";

const articlesCollection = collectionRegistry.find((collection) => collection.id === COLLECTION_ID);

if (!articlesCollection) {
  throw new Error(
    `api-source: the "${COLLECTION_ID}" collection is missing from @three-acts/cms-schema's collectionRegistry.`
  );
}

const collectionFieldKeys = new Set(articlesCollection.fields.map((field) => field.key));

/** Fails fast at module init (not per-request) if the registry's shape drifts from what this mapper expects. */
function requireFieldKey(key: ArticleFieldKey): ArticleFieldKey {
  if (!collectionFieldKeys.has(key)) {
    throw new Error(
      `api-source: expected field "${key}" on the "${COLLECTION_ID}" collection, but it is not in the registry.`
    );
  }
  return key;
}

const FIELD: Record<ArticleFieldKey, ArticleFieldKey> = {
  title: requireFieldKey("title"),
  slug: requireFieldKey("slug"),
  excerpt: requireFieldKey("excerpt"),
  body: requireFieldKey("body"),
  coverImage: requireFieldKey("coverImage"),
  author: requireFieldKey("author"),
  tags: requireFieldKey("tags"),
  publishedAt: requireFieldKey("publishedAt")
};

type ApiEnvelope = { ok: true; data: ListRecordsResult } | { ok: false; error: { code: string; message: string } };

function readString(value: CmsRecord["values"][string]): string {
  return typeof value === "string" ? value : "";
}

/** Maps one `CmsRecord` to the blog's `ContentEntry` shape, or `null` to skip an unroutable record. */
function mapRecord(record: CmsRecord): ContentEntry | null {
  const slug = readString(record.values[FIELD.slug]).trim();
  if (!slug) {
    console.warn(`[content:api] skipping record "${record.id}" — its slug is empty.`);
    return null;
  }

  const tags = readString(record.values[FIELD.tags])
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  // Cover images are typed `image` fields (ImageValue JSON) with legacy
  // plain-URL rows still in the wild — `imageSrc` reads both forms.
  // `author` is an authors.slug reference (no relation field type yet), so the
  // byline shows the slug until the site resolves it against `authors`.
  const coverImage = imageSrc(record.values[FIELD.coverImage]).trim();
  const author = readString(record.values[FIELD.author]).trim();
  const publishedAt = readString(record.values[FIELD.publishedAt]).trim();

  return {
    slug,
    title: readString(record.values[FIELD.title]),
    excerpt: readString(record.values[FIELD.excerpt]),
    body: readString(record.values[FIELD.body]),
    coverImage: coverImage.length > 0 ? coverImage : undefined,
    author: author.length > 0 ? author : undefined,
    tags: tags.length > 0 ? tags : undefined,
    publishedAt: publishedAt.length > 0 ? publishedAt : record.createdAt,
    updatedAt: record.modifiedAt
  };
}

/** Fetches every published `articles` record, paginating until `total` is reached. */
async function fetchAllRecords(apiOrigin: string): Promise<CmsRecord[]> {
  const records: CmsRecord[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (records.length < total) {
    const url = new URL(`${apiOrigin}/api${contentApiPaths.records(COLLECTION_ID)}`);
    url.searchParams.set("sortKey", "publishedAt");
    url.searchParams.set("sortDirection", "desc");
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url);

    let body: ApiEnvelope;
    try {
      body = (await response.json()) as ApiEnvelope;
    } catch (cause) {
      throw new Error(
        `api-source: could not parse a JSON response from ${url.toString()} (HTTP ${response.status}).`,
        { cause }
      );
    }

    if (!response.ok || !body.ok) {
      const detail = !body.ok ? `${body.error.code}: ${body.error.message}` : `HTTP ${response.status}`;
      throw new Error(`api-source: request to ${url.toString()} failed — ${detail}`);
    }

    const page = body.data.records;
    total = body.data.total;
    records.push(...page);

    // Guard against an infinite loop if `total` is ever inconsistent with the
    // records actually returned.
    if (page.length === 0) {
      break;
    }
    offset += page.length;
  }

  return records;
}

// Module-level cache: the full post list is fetched once and reused for the
// lifetime of the build, so `listPosts`, every route's `getStaticPaths`, and
// the sitemap all share one fetch instead of re-requesting the API.
let cachedPosts: Promise<ContentEntry[]> | null = null;

function loadPosts(apiOrigin: string): Promise<ContentEntry[]> {
  if (!cachedPosts) {
    cachedPosts = fetchAllRecords(apiOrigin).then((records) =>
      records.map(mapRecord).filter((entry): entry is ContentEntry => entry !== null)
    );
  }
  return cachedPosts;
}

export function createApiContentSource(apiOrigin: string): ContentSource {
  const origin = apiOrigin.replace(/\/+$/, "");

  return {
    name: "api",
    async listPosts() {
      return loadPosts(origin);
    },
    async getPost(slug) {
      const posts = await loadPosts(origin);
      return posts.find((post) => post.slug === slug) ?? null;
    }
  };
}
