import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CmsRecord, CmsRecordValue } from "@three-acts/cms-schema";
import { cloneSeedCollections } from "@three-acts/cms-schema/seed";
import {
  sortArticleCategories,
  sortArticles,
  sortFaqs,
  sortTestimonials,
  toArticle,
  toArticleCategory,
  toAuthor,
  toFaq,
  toPageSettings,
  toRedirectRule,
  toSiteSettings,
  toTestimonial
} from "./mappers.ts";
import type { Article, ArticleCategory, Faq, Testimonial } from "./models.ts";

/** Builds the "live" record a public content route would return: `values` replaced by the live snapshot. */
function live(record: CmsRecord): CmsRecord {
  return { ...record, values: { ...(record.liveValues ?? record.values) } };
}

function withValues(base: CmsRecord, values: Record<string, CmsRecordValue>): CmsRecord {
  return { ...base, values: { ...base.values, ...values } };
}

const seed = cloneSeedCollections();

describe("toArticle", () => {
  const liveArticles = seed.articles.filter((record) => record.liveValues).map(live);

  it("maps every field by registry key", () => {
    const record = liveArticles.find((item) => typeof item.values.slug === "string" && item.values.slug);
    assert.ok(record, "at least one live article exists");
    const article = toArticle(record!);
    assert.ok(article);
    assert.equal(article!.id, record!.id);
    assert.equal(article!.slug, record!.values.slug);
    assert.equal(article!.title, record!.values.title);
    assert.equal(article!.excerpt, record!.values.excerpt);
    assert.equal(article!.body, record!.values.body);
    assert.equal(article!.authorSlug, record!.values.author);
    assert.equal(article!.categorySlug, record!.values.category);
    assert.equal(article!.updatedAt, record!.modifiedAt);
    assert.equal(typeof article!.readingTime, "number");
    assert.equal(typeof article!.featured, "boolean");
    assert.ok(Array.isArray(article!.tags));
  });

  it("splits comma-separated tags into a trimmed array", () => {
    const record = liveArticles.find((item) => typeof item.values.tags === "string" && (item.values.tags as string).includes(","));
    assert.ok(record, "a live article with multiple tags exists");
    const article = toArticle(record!)!;
    const expected = String(record!.values.tags)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    assert.deepEqual(article.tags, expected);
    for (const tag of article.tags) {
      assert.equal(tag, tag.trim());
    }
  });

  it("resolves a typed cover image, tolerating the legacy plain-URL form", () => {
    const record = liveArticles.find((item) => typeof item.values.coverImage === "string" && item.values.coverImage);
    assert.ok(record, "a live article with a cover image exists");
    const article = toArticle(record!)!;
    assert.ok(article.coverImage);
    assert.match(article.coverImage!.src, /^https?:\/\//);

    const legacy = withValues(record!, { coverImage: "https://cdn.test/legacy.jpg" });
    assert.deepEqual(toArticle(legacy)!.coverImage, { src: "https://cdn.test/legacy.jpg", alt: "" });
  });

  it("returns null and drops the record when the slug is empty", () => {
    const record = withValues(liveArticles[0]!, { slug: "" });
    assert.equal(toArticle(record), null);
  });

  it("falls back to createdAt when publishedAt is blank", () => {
    const record = withValues(liveArticles[0]!, { publishedAt: "" });
    assert.equal(toArticle(record)!.publishedAt, record.createdAt);
  });
});

describe("sortArticles", () => {
  it("orders newest publishedAt first", () => {
    const articles: Article[] = [
      { id: "a", slug: "a", title: "", excerpt: "", body: "", authorSlug: "", categorySlug: "", tags: [], publishedAt: "2026-01-01T00:00:00.000Z", updatedAt: "", readingTime: 1, featured: false },
      { id: "b", slug: "b", title: "", excerpt: "", body: "", authorSlug: "", categorySlug: "", tags: [], publishedAt: "2026-03-01T00:00:00.000Z", updatedAt: "", readingTime: 1, featured: false },
      { id: "c", slug: "c", title: "", excerpt: "", body: "", authorSlug: "", categorySlug: "", tags: [], publishedAt: "2026-02-01T00:00:00.000Z", updatedAt: "", readingTime: 1, featured: false }
    ];
    assert.deepEqual(
      sortArticles(articles).map((a) => a.id),
      ["b", "c", "a"]
    );
  });
});

describe("toAuthor", () => {
  const liveAuthors = seed.authors.filter((record) => record.liveValues).map(live);

  it("maps every field and treats blank optional fields as undefined", () => {
    const record = liveAuthors.find((item) => !item.values.websiteUrl);
    assert.ok(record, "a live author without a website exists");
    const author = toAuthor(record!)!;
    assert.equal(author.slug, record!.values.slug);
    assert.equal(author.name, record!.values.name);
    assert.equal(author.websiteUrl, undefined);
  });

  it("returns null when the slug is empty", () => {
    assert.equal(toAuthor(withValues(liveAuthors[0]!, { slug: "" })), null);
  });
});

describe("toArticleCategory + sortArticleCategories", () => {
  it("maps sortOrder as a number and returns null for an empty slug", () => {
    const record = live(seed["article-categories"][0]!);
    const category = toArticleCategory(record)!;
    assert.equal(category.sortOrder, Number(record.values.sortOrder));
    assert.equal(toArticleCategory(withValues(record, { slug: "" })), null);
  });

  it("sorts by sortOrder ascending, then name", () => {
    const categories: ArticleCategory[] = [
      { id: "1", slug: "z", name: "Zebra", description: "", sortOrder: 10 },
      { id: "2", slug: "a", name: "Apple", description: "", sortOrder: 10 },
      { id: "3", slug: "m", name: "Middle", description: "", sortOrder: 5 }
    ];
    assert.deepEqual(
      sortArticleCategories(categories).map((c) => c.id),
      ["3", "2", "1"]
    );
  });
});

describe("toFaq + sortFaqs", () => {
  it("maps every field (no slug, never null)", () => {
    const record = live(seed.faqs[0]!);
    const faq = toFaq(record);
    assert.ok(faq);
    assert.equal(faq!.question, record.values.question);
    assert.equal(faq!.answer, record.values.answer);
    assert.equal(faq!.topic, record.values.topic);
    assert.equal(faq!.sortOrder, Number(record.values.sortOrder));
  });

  it("sorts by sortOrder ascending, then question", () => {
    const faqs: Faq[] = [
      { id: "1", question: "Zed question", answer: "", topic: "general", sortOrder: 1 },
      { id: "2", question: "Alpha question", answer: "", topic: "general", sortOrder: 1 },
      { id: "3", question: "Before", answer: "", topic: "general", sortOrder: 0 }
    ];
    assert.deepEqual(
      sortFaqs(faqs).map((f) => f.id),
      ["3", "2", "1"]
    );
  });
});

describe("toTestimonial + sortTestimonials", () => {
  it("reads the select-stored rating as a number and maps product -> productSlug", () => {
    const record = live(seed.testimonials.find((item) => typeof item.values.product === "string" && item.values.product)!);
    const testimonial = toTestimonial(record)!;
    assert.equal(testimonial.rating, Number(record.values.rating));
    assert.equal(testimonial.productSlug, record.values.product);
  });

  it("treats an empty product as no productSlug", () => {
    const record = live(seed.testimonials.find((item) => !item.values.product)!);
    assert.equal(toTestimonial(record)!.productSlug, undefined);
  });

  it("sorts by sortOrder ascending, then customerName", () => {
    const testimonials: Testimonial[] = [
      { id: "1", customerName: "Zoe", quote: "", rating: 5, featured: false, sortOrder: 1 },
      { id: "2", customerName: "Amy", quote: "", rating: 5, featured: false, sortOrder: 1 },
      { id: "3", customerName: "Before", quote: "", rating: 5, featured: false, sortOrder: 0 }
    ];
    assert.deepEqual(
      sortTestimonials(testimonials).map((t) => t.id),
      ["3", "2", "1"]
    );
  });
});

describe("toSiteSettings", () => {
  it("maps the live snapshot, including parsed schema markup", () => {
    const record = live(seed["site-settings"][0]!);
    const settings = toSiteSettings(record);
    assert.equal(settings.siteName, record.values.siteName);
    assert.equal(settings.twitterHandle, record.values.twitterHandle);
    assert.equal(settings.allowIndexing, true);
    assert.ok(Array.isArray(settings.schemaMarkup));
    assert.ok(settings.schemaMarkup.length > 0);
    assert.ok(settings.defaultOgImage);
    assert.match(settings.defaultOgImage!.src, /^https?:\/\//);
  });

  it("returns an empty schemaMarkup array on blank or invalid JSON", () => {
    const record = live(seed["site-settings"][0]!);
    assert.deepEqual(toSiteSettings(withValues(record, { schemaMarkup: "" })).schemaMarkup, []);
    assert.deepEqual(toSiteSettings(withValues(record, { schemaMarkup: "{not json" })).schemaMarkup, []);
  });
});

describe("toPageSettings", () => {
  it("maps every field, including optional images", () => {
    const record = live(seed["page-settings"].find((item) => item.liveValues)!);
    const page = toPageSettings(record)!;
    assert.equal(page.pageName, record.values.pageName);
    assert.equal(page.pagePath, record.values.pagePath);
    assert.equal(page.metaTitle, record.values.metaTitle);
    assert.ok(Array.isArray(page.schemaMarkup));
  });
});

describe("toRedirectRule", () => {
  it("parses the select-stored status code to a number and derives permanent", () => {
    const record = seed["redirect-rules"][0]!;
    const rule = toRedirectRule(record)!;
    assert.equal(rule.sourcePath, record.values.sourcePath);
    assert.equal(rule.targetUrl, record.values.targetUrl);
    assert.equal(String(rule.statusCode), record.values.statusCode);
    assert.equal(rule.permanent, record.values.permanent);
  });

  it("returns null when sourcePath is empty", () => {
    assert.equal(toRedirectRule(withValues(seed["redirect-rules"][0]!, { sourcePath: "" })), null);
  });

  it("falls back to 301 for an unparsable status code", () => {
    const rule = toRedirectRule(withValues(seed["redirect-rules"][0]!, { statusCode: "not-a-code" }))!;
    assert.equal(rule.statusCode, 301);
  });
});
