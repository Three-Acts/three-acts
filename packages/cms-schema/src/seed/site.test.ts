import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasPublishWorkflow, isUniqueField } from "../columns";
import { parseFileValue, parseVideoValue } from "../files";
import { parseImageGallery, parseImageValue } from "../images";
import { collectionRegistry } from "../registry";
import { parseSchemaMarkup } from "../schema-markup";
import type { CmsCollection, CmsRecordValue } from "../types";
import { authorSlugs, productSlugs, staticPagePaths } from "./keys";
import { siteSeed } from "./site";

function collectionFor(id: string): CmsCollection {
  const collection = collectionRegistry.find((item) => item.id === id);
  assert.ok(collection, `unknown collection ${id}`);
  return collection;
}

function isEmpty(value: CmsRecordValue): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

const entries = Object.entries(siteSeed);

describe("site seed", () => {
  it("covers the site collections with realistic volumes", () => {
    assert.deepEqual(Object.keys(siteSeed).sort(), ["cms-users", "form-submissions", "media-library", "page-settings", "redirect-rules", "site-settings"]);
    assert.equal(siteSeed["site-settings"].length, 1);
    assert.ok(siteSeed["redirect-rules"].length >= 40);
    assert.ok(siteSeed["media-library"].length >= 55);
    assert.ok(siteSeed["form-submissions"].length >= 75);
    assert.ok(siteSeed["cms-users"].length >= 10);
  });

  it("uses only real field keys, valid selects and well-formed stored values", () => {
    for (const [collectionId, records] of entries) {
      const collection = collectionFor(collectionId);
      const fields = new Map(collection.fields.map((field) => [field.key, field]));
      for (const record of records) {
        for (const snapshot of [record.values, record.liveValues ?? {}]) {
          for (const [key, value] of Object.entries(snapshot)) {
            const field = fields.get(key);
            assert.ok(field, `${collectionId}/${record.id}: unknown field ${key}`);
            if (isEmpty(value)) continue;
            switch (field.type) {
              case "select":
                assert.ok(field.options.some((option) => option.value === value), `${collectionId}/${record.id}: invalid ${key}=${String(value)}`);
                break;
              case "number":
                assert.equal(typeof value, "number", `${record.id}.${key}`);
                break;
              case "boolean":
                assert.equal(typeof value, "boolean", `${record.id}.${key}`);
                break;
              case "datetime":
                assert.ok(!Number.isNaN(Date.parse(String(value))) && String(value).endsWith("Z"), `${record.id}.${key}`);
                break;
              case "image":
                assert.ok(parseImageValue(value), `${record.id}.${key} image`);
                assert.doesNotThrow(() => JSON.parse(String(value)), `${record.id}.${key} canonical image JSON`);
                break;
              case "image-gallery":
                assert.ok(parseImageGallery(value).length > 0, `${record.id}.${key} gallery`);
                break;
              case "video":
                assert.ok(parseVideoValue(value), `${record.id}.${key} video`);
                break;
              case "file":
                assert.ok(parseFileValue(value), `${record.id}.${key} file`);
                break;
              case "asset":
                assert.match(String(value), /^https:\/\//, `${record.id}.${key} asset URL`);
                break;
              default:
                if ("format" in field && field.format === "json-ld") {
                  const parsed = parseSchemaMarkup(String(value));
                  assert.ok(parsed.ok, `${record.id}.${key}: ${parsed.ok ? "" : parsed.error}`);
                  assert.ok(parsed.value.every((item) => item["@type"]), `${record.id}.${key} has @type`);
                }
            }
          }
        }
      }
    }
  });

  it("fills required fields for published, queued and data records", () => {
    for (const [collectionId, records] of entries) {
      const collection = collectionFor(collectionId);
      for (const record of records) {
        const enforce = !hasPublishWorkflow(collection) || record.publishStatus === "published" || record.publishStatus === "queued_to_publish";
        if (!enforce) continue;
        for (const field of collection.fields.filter((item) => item.required)) {
          assert.ok(!isEmpty(record.values[field.key]), `${collectionId}/${record.id}: required ${field.key} is empty`);
        }
      }
    }
  });

  it("keeps ids and unique fields unique", () => {
    for (const [collectionId, records] of entries) {
      const collection = collectionFor(collectionId);
      assert.equal(new Set(records.map((record) => record.id)).size, records.length, `${collectionId}: duplicate ids`);
      for (const field of collection.fields.filter(isUniqueField)) {
        const values = records.map((record) => record.values[field.key]).filter((value) => !isEmpty(value));
        assert.equal(new Set(values).size, values.length, `${collectionId}.${field.key}: duplicate values`);
      }
    }
    // Explicitly the ones the settings screens rely on.
    const unique = (collectionId: string, key: string) => {
      const values = siteSeed[collectionId].map((record) => record.values[key]);
      assert.equal(new Set(values).size, values.length, `${collectionId}.${key}`);
    };
    unique("redirect-rules", "sourcePath");
    unique("page-settings", "pagePath");
    unique("cms-users", "email");
  });

  it("orders timestamps and applies the live snapshot rules", () => {
    for (const [collectionId, records] of entries) {
      const collection = collectionFor(collectionId);
      for (const record of records) {
        assert.ok(record.createdAt <= record.modifiedAt, `${collectionId}/${record.id}: createdAt after modifiedAt`);
        if (!hasPublishWorkflow(collection)) {
          assert.equal(record.liveValues ?? null, null, `${record.id}: non-workflow records have no live snapshot`);
          assert.equal(record.publishStatus, "not_published", `${record.id}: non-workflow records stay not_published`);
          continue;
        }
        if (record.publishStatus === "published") assert.deepEqual(record.liveValues, record.values, record.id);
        if (record.publishStatus === "not_published") assert.equal(record.liveValues ?? null, null, record.id);
        if (record.publishStatus === "draft" && record.liveValues) assert.notDeepEqual(record.liveValues, record.values, record.id);
      }
    }
  });

  it("has one page-settings record per static page with the expected status mix", () => {
    const byPath = new Map(siteSeed["page-settings"].map((record) => [record.values.pagePath, record]));
    for (const path of staticPagePaths) assert.ok(byPath.has(path), `missing page settings for ${path}`);
    assert.equal(byPath.size, staticPagePaths.length);
    assert.equal(byPath.get("/careers")?.publishStatus, "queued_to_publish");
    assert.equal(byPath.get("/subscriptions")?.publishStatus, "not_published");
    const wholesale = byPath.get("/wholesale");
    assert.equal(wholesale?.publishStatus, "draft");
    assert.ok(wholesale?.liveValues, "wholesale draft keeps its older live snapshot");
    assert.equal(byPath.get("/")?.publishStatus, "published");

    const types = (path: string) => (parseSchemaMarkup(String(byPath.get(path)?.values.schemaMarkup)) as { ok: true; value: Record<string, unknown>[] }).value.map((item) => item["@type"]);
    assert.deepEqual(types("/"), ["WebSite"]);
    assert.deepEqual(types("/faq"), ["FAQPage"]);
    assert.deepEqual(types("/visit-the-roastery"), ["CafeOrCoffeeShop"]);
    assert.deepEqual(types("/shop"), ["CollectionPage"]);
    for (const record of byPath.values()) assert.match(String(record.values.canonicalUrl), /^https:\/\/fynbosandfire\.co\.za\//);
  });

  it("gives site settings a draft with an older live snapshot", () => {
    const [settings] = siteSeed["site-settings"];
    assert.equal(settings.publishStatus, "draft");
    assert.ok(settings.liveValues);
    assert.equal(settings.values.titleTemplate, "%s · Fynbos & Fire");
    assert.equal(settings.values.allowIndexing, true);
  });

  it("resolves cross-collection references", () => {
    const knownProducts = new Set<string>(productSlugs);
    for (const record of siteSeed["redirect-rules"]) {
      const target = String(record.values.targetUrl);
      assert.ok(target.startsWith("/") || target.startsWith("https://"), `${record.id}: target ${target}`);
      const match = /^\/shop\/([^/?#]+)/.exec(target);
      if (match) assert.ok(knownProducts.has(match[1]), `${record.id}: unknown product ${match[1]}`);
      assert.equal(record.values.permanent, record.values.statusCode === "301" || record.values.statusCode === "308", `${record.id}: permanent matches code`);
    }
    assert.ok(siteSeed["redirect-rules"].some((record) => /^\/shop\/[^/?#]+/.test(String(record.values.targetUrl))));

    const knownAuthors = new Set<string>(authorSlugs);
    for (const record of siteSeed["cms-users"]) {
      const slug = String(record.values.authorSlug ?? "");
      if (slug) assert.ok(knownAuthors.has(slug), `${record.id}: unknown author ${slug}`);
      if (record.values.role === "author") assert.ok(slug, `${record.id}: author-role user without authorSlug`);
      if (record.values.status === "invited") assert.equal(record.values.lastActiveAt, "", `${record.id}: invited users have not been active`);
    }
  });

  it("covers every form source and every media edge case", () => {
    const sources = new Set(siteSeed["form-submissions"].map((record) => record.values.source));
    const options = collectionFor("form-submissions").fields.find((field) => field.key === "source");
    assert.ok(options?.type === "select");
    for (const option of options.options) assert.ok(sources.has(option.value), `no ${option.value} submissions`);
    assert.ok(siteSeed["media-library"].some((record) => isEmpty(record.values.altText) && /^https:\/\/picsum/.test(String(record.values.file))), "an image missing alt text");
    assert.ok(siteSeed["media-library"].some((record) => String(record.values.file).endsWith(".pdf")));
    assert.ok(siteSeed["media-library"].some((record) => String(record.values.file).endsWith(".mp4")));
  });
});
