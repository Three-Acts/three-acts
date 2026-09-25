import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CmsRecord } from "@three-acts/cms-schema";
import { cloneSeedCollections, seedBrand } from "@three-acts/cms-schema/seed";
import { createContentClient, type ContentFetch } from "./client.ts";
import { createSeedContentFetch } from "./seed-fetch.ts";

function countingFetch(base: ContentFetch): { fetch: ContentFetch; countFor(pathname: string): number } {
  const counts = new Map<string, number>();
  const fetch: ContentFetch = async (url) => {
    const pathname = new URL(url).pathname;
    counts.set(pathname, (counts.get(pathname) ?? 0) + 1);
    return base(url);
  };
  return { fetch, countFor: (pathname) => counts.get(pathname) ?? 0 };
}

function makeFakeRecord(index: number): CmsRecord {
  const values = { slug: `product-${index}`, title: `Product ${index}` };
  return {
    id: `product-${index}`,
    publishStatus: "published",
    createdAt: "2026-01-01T00:00:00.000Z",
    modifiedAt: "2026-01-01T00:00:00.000Z",
    values,
    liveValues: { ...values }
  };
}

/** A synthetic, spec-shaped paginated endpoint with more records than the client's 200-per-page limit. */
function createFakePaginatedFetch(totalRecords: number): { fetch: ContentFetch; calls: string[] } {
  const all = Array.from({ length: totalRecords }, (_, index) => makeFakeRecord(index));
  const calls: string[] = [];
  const fetch: ContentFetch = async (url) => {
    calls.push(url);
    const parsed = new URL(url);
    const limit = parsed.searchParams.has("limit") ? Number(parsed.searchParams.get("limit")) : all.length;
    const offset = Number(parsed.searchParams.get("offset") ?? "0");
    const page = all.slice(offset, offset + limit);
    return { ok: true, status: 200, json: async () => ({ ok: true, data: { records: page, total: all.length } }) };
  };
  return { fetch, calls };
}

describe("createContentClient against createSeedContentFetch", () => {
  it("lists only records with a live snapshot, newest publishedAt first", async () => {
    const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    const articles = await client.listArticles();
    const expectedCount = cloneSeedCollections().articles.filter((record) => record.liveValues).length;
    assert.equal(articles.length, expectedCount);
    for (let i = 1; i < articles.length; i += 1) {
      assert.ok(articles[i - 1]!.publishedAt >= articles[i]!.publishedAt, "articles are newest-first");
    }
  });

  it("getArticle finds a listed article by slug and returns null otherwise", async () => {
    const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    const [target] = await client.listArticles();
    assert.ok(target);
    assert.deepEqual(await client.getArticle(target!.slug), target);
    assert.equal(await client.getArticle("does-not-exist"), null);
  });

  it("listArticleCategories is sorted by sortOrder then name", async () => {
    const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    const categories = await client.listArticleCategories();
    assert.ok(categories.length > 0);
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    assert.deepEqual(categories, sorted);
  });

  it("listFaqs is sorted by sortOrder then question", async () => {
    const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    const faqs = await client.listFaqs();
    assert.ok(faqs.length > 0);
    const sorted = [...faqs].sort((a, b) => a.sortOrder - b.sortOrder || a.question.localeCompare(b.question));
    assert.deepEqual(faqs, sorted);
  });

  it("listTestimonials is sorted by sortOrder then customerName", async () => {
    const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    const testimonials = await client.listTestimonials();
    assert.ok(testimonials.length > 0);
    const sorted = [...testimonials].sort((a, b) => a.sortOrder - b.sortOrder || a.customerName.localeCompare(b.customerName));
    assert.deepEqual(testimonials, sorted);
  });

  it("listAuthors returns every live author", async () => {
    const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    const authors = await client.listAuthors();
    const expectedCount = cloneSeedCollections().authors.filter((record) => record.liveValues).length;
    assert.equal(authors.length, expectedCount);
  });

  it("getSiteSettings returns the singleton's live snapshot", async () => {
    const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    const settings = await client.getSiteSettings();
    assert.ok(settings);
    assert.equal(settings!.siteName, seedBrand.name);
    assert.equal(settings!.allowIndexing, true);
    assert.ok(settings!.schemaMarkup.length > 0);
  });

  it("getSiteSettings returns null when nothing is live", async () => {
    const empty: ContentFetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, data: { records: [], total: 0 } }) });
    const client = createContentClient({ origin: "http://test.local", fetch: empty });
    assert.equal(await client.getSiteSettings(), null);
  });

  it("listPageSettings returns every live page", async () => {
    const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    const pages = await client.listPageSettings();
    const expectedCount = cloneSeedCollections()["page-settings"].filter((record) => record.liveValues).length;
    assert.equal(pages.length, expectedCount);
  });

  it("listRedirects returns every redirect rule with a valid status code", async () => {
    const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    const redirects = await client.listRedirects();
    const expectedCount = cloneSeedCollections()["redirect-rules"].length;
    assert.equal(redirects.length, expectedCount);
    for (const redirect of redirects) {
      assert.ok(redirect.sourcePath.length > 0);
      assert.ok([301, 302, 307, 308].includes(redirect.statusCode));
    }
  });

  it("caches each collection's records per client instance, shared across accessors", async () => {
    const { fetch, countFor } = countingFetch(createSeedContentFetch());
    const client = createContentClient({ origin: "http://seed.local", fetch });

    const first = await client.listArticles();
    const callsAfterFirst = countFor("/api/content/collections/articles/records");
    assert.ok(callsAfterFirst > 0);

    const second = await client.listArticles();
    assert.equal(countFor("/api/content/collections/articles/records"), callsAfterFirst, "a second listArticles() reuses the cached fetch");
    assert.deepEqual(second, first);

    await client.listRecords("articles");
    assert.equal(countFor("/api/content/collections/articles/records"), callsAfterFirst, "listRecords() for the same id reuses the cached fetch too");
  });

  it("skips records a mapper maps to null and warns instead of throwing", async () => {
    const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
    const warnings: unknown[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };
    try {
      const mapped = await client.list("articles", () => null);
      assert.equal(mapped.length, 0);
      assert.ok(warnings.length > 0);
    } finally {
      console.warn = originalWarn;
    }
  });

  describe("generic product wrappers (product types belong to @three-acts/ecommerce)", () => {
    it("listProducts without a mapper returns raw CmsRecord[]", async () => {
      const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
      const records = await client.listProducts();
      assert.ok(records.length > 0);
      assert.equal(typeof records[0]!.values.slug, "string");
    });

    it("listProducts with a mapper returns the mapped shape", async () => {
      const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
      const raw = await client.listProducts();
      const titles = await client.listProducts((record) => (typeof record.values.title === "string" ? record.values.title : null));
      assert.equal(titles.length, raw.length);
      assert.equal(typeof titles[0], "string");
    });

    it("getProduct finds a record by slug, mapped or raw", async () => {
      const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
      const [first] = await client.listProducts();
      assert.ok(first);
      const slug = String(first!.values.slug);
      assert.equal((await client.getProduct(slug))!.id, first!.id);
      assert.equal(
        await client.getProduct(slug, (record) => record.id),
        first!.id
      );
      assert.equal(await client.getProduct("does-not-exist"), null);
    });

    it("listProductCategories without a mapper returns raw records", async () => {
      const client = createContentClient({ origin: "http://seed.local", fetch: createSeedContentFetch() });
      const records = await client.listProductCategories();
      assert.ok(records.length > 0);
    });
  });
});

describe("createContentClient pagination", () => {
  it("fetches every page when a collection has more records than the page size", async () => {
    const { fetch, calls } = createFakePaginatedFetch(245);
    const client = createContentClient({ origin: "http://test.local", fetch });
    const records = await client.listRecords("products");
    assert.equal(records.length, 245);
    assert.equal(new Set(records.map((r) => r.id)).size, 245);
    assert.equal(calls.filter((url) => url.includes("/content/collections/products/records")).length, 2);
  });
});

describe("createContentClient failure handling", () => {
  it("throws a clear error when the API responds ok:false", async () => {
    const failing: ContentFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, error: { code: "unavailable", message: "Data store offline" } })
    });
    const client = createContentClient({ origin: "http://test.local", fetch: failing });
    await assert.rejects(() => client.listArticles(), /unavailable: Data store offline/);
  });

  it("throws when the HTTP response itself is not ok", async () => {
    const failing: ContentFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const client = createContentClient({ origin: "http://test.local", fetch: failing });
    await assert.rejects(() => client.listArticles());
  });

  it("throws when the response body isn't JSON", async () => {
    const failing: ContentFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      }
    });
    const client = createContentClient({ origin: "http://test.local", fetch: failing });
    await assert.rejects(() => client.listArticles());
  });

  it("throws for listRedirects too", async () => {
    const failing: ContentFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const client = createContentClient({ origin: "http://test.local", fetch: failing });
    await assert.rejects(() => client.listRedirects());
  });
});

describe("createSeedContentFetch", () => {
  it("returns a 404 envelope for an unknown path", async () => {
    const fetch = createSeedContentFetch();
    const response = await fetch("http://seed.local/api/not-a-real-route");
    assert.equal(response.ok, false);
    assert.equal(response.status, 404);
    const body = (await response.json()) as { ok: boolean };
    assert.equal(body.ok, false);
  });

  it("returns a 404 envelope for a collection with no publish workflow", async () => {
    const fetch = createSeedContentFetch();
    const response = await fetch("http://seed.local/api/content/collections/orders/records");
    assert.equal(response.status, 404);
  });

  it("honours sortKey, sortDirection, limit and offset", async () => {
    const fetch = createSeedContentFetch();
    const response = await fetch(
      "http://seed.local/api/content/collections/article-categories/records?sortKey=sortOrder&sortDirection=asc&limit=2&offset=0"
    );
    const body = (await response.json()) as { ok: true; data: { records: CmsRecord[]; total: number } };
    assert.equal(body.data.records.length, 2);
    assert.ok(body.data.total >= 2);
    const first = Number(body.data.records[0]!.values.sortOrder);
    const second = Number(body.data.records[1]!.values.sortOrder);
    assert.ok(first <= second);
  });
});
