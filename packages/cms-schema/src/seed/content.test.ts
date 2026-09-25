import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectionRegistry } from "../registry";
import { parseImageGallery, parseImageValue } from "../images";
import type { CmsCollection, CmsRecord, CmsRecordValue } from "../types";
import { contentSeed, estimateReadingTime } from "./content";
import { articleCategorySlugs, authorSlugs, productSlugs } from "./keys";
import { seedNow } from "./types";

const isEmpty = (value: CmsRecordValue) => value === null || value === undefined || (typeof value === "string" && value.trim() === "");

function collection(id: string): CmsCollection {
  const found = collectionRegistry.find((item) => item.id === id);
  assert.ok(found, `collection ${id} exists in the registry`);
  return found;
}

function snapshots(record: CmsRecord): Array<[string, Record<string, CmsRecordValue>]> {
  const list: Array<[string, Record<string, CmsRecordValue>]> = [["values", record.values]];
  if (record.liveValues) list.push(["liveValues", record.liveValues]);
  return list;
}

describe("contentSeed", () => {
  it("only seeds the content collections this file owns", () => {
    assert.deepEqual(Object.keys(contentSeed).sort(), ["article-categories", "articles", "authors", "faqs"]);
  });

  for (const [collectionId, records] of Object.entries(contentSeed)) {
    describe(collectionId, () => {
      const def = collection(collectionId);
      const fieldByKey = new Map(def.fields.map((field) => [field.key, field]));

      it("has stable, unique record ids and ordered timestamps", () => {
        const ids = records.map((record) => record.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const record of records) {
          assert.match(record.id, /^[a-z0-9-]+$/);
          assert.ok(!Number.isNaN(Date.parse(record.createdAt)), `${record.id} createdAt`);
          assert.ok(record.createdAt <= record.modifiedAt, `${record.id}: createdAt ≤ modifiedAt`);
          assert.ok(Date.parse(record.modifiedAt) <= seedNow.getTime(), `${record.id}: modifiedAt not in the future`);
        }
      });

      it("uses only real field keys", () => {
        for (const record of records) {
          for (const [label, values] of snapshots(record)) {
            for (const key of Object.keys(values)) {
              assert.ok(fieldByKey.has(key), `${record.id}.${label}.${key} is a field of ${collectionId}`);
            }
          }
        }
      });

      it("fills required fields on published and queued records", () => {
        for (const record of records) {
          if (record.publishStatus !== "published" && record.publishStatus !== "queued_to_publish") continue;
          for (const [label, values] of snapshots(record)) {
            for (const field of def.fields.filter((item) => item.required)) {
              assert.ok(!isEmpty(values[field.key]), `${record.id}.${label}.${field.key} is required`);
            }
          }
        }
      });

      it("uses valid select options, typed values and parseable images", () => {
        for (const record of records) {
          for (const [label, values] of snapshots(record)) {
            for (const [key, value] of Object.entries(values)) {
              const field = fieldByKey.get(key)!;
              if (isEmpty(value)) continue;
              const where = `${record.id}.${label}.${key}`;
              if (field.type === "select") {
                assert.ok(field.options.some((option) => option.value === value), `${where}: "${String(value)}" is a valid option`);
              } else if (field.type === "number") {
                assert.equal(typeof value, "number", where);
              } else if (field.type === "boolean") {
                assert.equal(typeof value, "boolean", where);
              } else if (field.type === "datetime") {
                assert.equal(typeof value, "string", where);
                assert.equal(new Date(value as string).toISOString(), value, `${where} is ISO UTC`);
              } else if (field.type === "image") {
                assert.doesNotThrow(() => JSON.parse(value as string), `${where} is canonical JSON`);
                const image = parseImageValue(value);
                assert.ok(image, `${where} parses`);
                assert.match(image.src, /^https:\/\/picsum\.photos\/seed\/[a-z0-9-]+\/\d+\/\d+$/, where);
                assert.ok(image.alt && image.alt.length > 0, `${where} has alt text`);
              } else if (field.type === "image-gallery") {
                assert.ok(parseImageGallery(value).length > 0, where);
              } else {
                assert.equal(typeof value, "string", where);
              }
            }
          }
        }
      });

      it("keeps unique fields unique (ignoring empty values)", () => {
        const uniqueFields = def.fields.filter((field) => field.unique ?? field.type === "slug");
        assert.ok(uniqueFields.length > 0 || collectionId === "faqs");
        for (const field of uniqueFields) {
          const seen = records.map((record) => record.values[field.key]).filter((value) => !isEmpty(value));
          assert.equal(new Set(seen).size, seen.length, `${collectionId}.${field.key} is unique`);
        }
      });

      it("follows the publish model's liveValues rules", () => {
        for (const record of records) {
          switch (record.publishStatus) {
            case "published":
              assert.deepEqual(record.liveValues, record.values, `${record.id}: published → live = values`);
              break;
            case "not_published":
              assert.equal(record.liveValues, null, `${record.id}: not_published → no snapshot`);
              break;
            case "draft":
            case "queued_to_publish":
              if (record.liveValues) {
                assert.notDeepEqual(record.liveValues, record.values, `${record.id}: pending edit differs from live`);
              }
              break;
          }
        }
      });
    });
  }

  it("seeds exactly the shared author and category slugs", () => {
    assert.deepEqual(contentSeed.authors.map((record) => record.values.slug).sort(), [...authorSlugs].sort());
    assert.deepEqual(contentSeed["article-categories"].map((record) => record.values.slug).sort(), [...articleCategorySlugs].sort());
  });

  it("resolves article references to authors, categories and products", () => {
    const authors = new Set<string>(authorSlugs);
    const categories = new Set<string>(articleCategorySlugs);
    const products = new Set<string>(productSlugs);
    for (const record of contentSeed.articles) {
      for (const [label, values] of snapshots(record)) {
        assert.ok(authors.has(values.author as string), `${record.id}.${label}.author`);
        if (!isEmpty(values.category)) assert.ok(categories.has(values.category as string), `${record.id}.${label}.category`);
        for (const match of String(values.body).matchAll(/\/shop\/([a-z0-9-]+)/g)) {
          assert.ok(products.has(match[1]), `${record.id}.${label} links unknown product ${match[1]}`);
        }
      }
    }
  });

  it("only publishes articles by published authors", () => {
    const liveAuthors = new Set(contentSeed.authors.filter((record) => record.publishStatus === "published").map((record) => record.values.slug));
    for (const record of contentSeed.articles) {
      if (record.publishStatus === "published" || record.publishStatus === "queued_to_publish") {
        assert.ok(liveAuthors.has(record.values.author), `${record.id} author is live`);
      }
    }
  });

  it("keeps article reading times consistent with body length", () => {
    for (const record of contentSeed.articles) {
      for (const [label, values] of snapshots(record)) {
        assert.equal(values.readingTime, estimateReadingTime(String(values.body)), `${record.id}.${label}.readingTime`);
      }
    }
  });

  it("looks like a real journal: volume, spread, status mix and edge cases", () => {
    const articles = contentSeed.articles;
    assert.ok(articles.length >= 35, `~40 articles (got ${articles.length})`);
    assert.ok(contentSeed.faqs.length >= 18, "~20 FAQs");

    const dated = articles.filter((record) => record.publishStatus === "published").map((record) => Date.parse(record.values.publishedAt as string));
    const spanDays = (Math.max(...dated) - Math.min(...dated)) / 86_400_000;
    assert.ok(spanDays > 365 && spanDays < 600, `published dates span ~18 months (got ${Math.round(spanDays)} days)`);

    const count = (status: string) => articles.filter((record) => record.publishStatus === status).length;
    assert.ok(count("published") > articles.length / 2, "mostly published");
    assert.ok(articles.some((record) => record.publishStatus === "draft" && record.liveValues), "a draft edit of a published article");
    assert.ok(articles.some((record) => record.publishStatus === "draft" && !record.liveValues), "a brand-new draft");
    assert.ok(articles.some((record) => record.publishStatus === "queued_to_publish" && record.liveValues), "a queued edit");
    assert.ok(articles.some((record) => record.publishStatus === "queued_to_publish" && !record.liveValues), "a queued new article");
    assert.ok(count("not_published") >= 1, "an unpublished article");

    const featured = articles.filter((record) => record.values.featured === true);
    assert.ok(featured.length >= 2 && featured.length <= 8, "a few featured articles");
    assert.ok(articles.some((record) => isEmpty(record.values.coverImage)), "an article without a cover image");
    assert.ok(articles.some((record) => String(record.values.title).length > 120), "a very long title");
    assert.ok(articles.some((record) => /[^\u0000-\u007f]/.test(String(record.values.title))), "a unicode title");
    assert.ok(articles.some((record) => /\p{Extended_Pictographic}/u.test(String(record.values.title))), "an emoji");
    const withSeo = articles.filter((record) => !isEmpty(record.values.seoTitle) && !isEmpty(record.values.seoDescription));
    assert.ok(withSeo.length > articles.length / 2 && withSeo.length < articles.length, "SEO fields on most articles, not all");
    for (const record of articles) {
      assert.doesNotMatch(`${record.values.title} ${record.values.body}`, /lorem|ipsum|Article \d+/i, record.id);
    }
  });

  it("covers every FAQ topic with contiguous sort orders", () => {
    const topicField = collection("faqs").fields.find((field) => field.key === "topic");
    assert.ok(topicField && topicField.type === "select");
    for (const option of topicField.options) {
      const orders = contentSeed.faqs
        .filter((record) => record.values.topic === option.value)
        .map((record) => record.values.sortOrder as number)
        .sort((a, b) => a - b);
      assert.ok(orders.length > 0, `FAQs for topic ${option.value}`);
      assert.deepEqual(orders, orders.map((_, index) => index + 1), `${option.value} sort orders`);
    }
  });

});
