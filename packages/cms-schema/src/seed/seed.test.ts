import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { hasPublishWorkflow } from "../columns";
import { collectionRegistry } from "../registry";
import type { CmsRecord } from "../types";
import type * as SeedModule from "./index";

/**
 * Cross-seed consistency: the content, shop and site seeds are written
 * separately, so this checks the references between them resolve once merged.
 *
 * The seed is imported dynamically so its first evaluation (every generator in
 * content.ts / shop.ts / site.ts) can be timed. `node --test` runs each test
 * file in its own process, so nothing else has loaded it yet.
 */

/** Registry collections allowed to ship without seed records. Keep empty unless a collection genuinely can't be seeded. */
const allowedEmpty = new Set<string>();

let seed: typeof SeedModule;
let importMs = 0;

before(async () => {
  const start = performance.now();
  seed = await import("./index");
  importMs = performance.now() - start;
});

function records(id: string): CmsRecord[] {
  return seed.seedCollections[id] ?? [];
}

function valuesOf(record: CmsRecord) {
  return record.liveValues ?? record.values;
}

function slugSet(id: string): Set<string> {
  return new Set(records(id).map((record) => String(record.values.slug)));
}

describe("merged seed", () => {
  it("builds quickly", () => {
    assert.ok(importMs < 500, `building the seed took ${importMs.toFixed(0)} ms (budget 500 ms)`);
    const start = performance.now();
    seed.cloneSeedCollections();
    const cloneMs = performance.now() - start;
    assert.ok(cloneMs < 500, `cloning the seed took ${cloneMs.toFixed(0)} ms (budget 500 ms)`);
  });

  it("seeds every registry collection and nothing else", () => {
    const registryIds = new Set(collectionRegistry.map((c) => c.id));
    for (const id of Object.keys(seed.seedCollections)) {
      assert.ok(registryIds.has(id), `seed collection ${id} exists in the registry`);
    }
    for (const id of registryIds) {
      if (allowedEmpty.has(id)) continue;
      assert.ok(records(id).length > 0, `${id} has seed records`);
    }
  });

  it("merges the three domain seeds without overlap", () => {
    const keys = [seed.contentSeed, seed.shopSeed, seed.siteSeed].flatMap((part) => Object.keys(part));
    assert.equal(new Set(keys).size, keys.length, "no collection is seeded twice");
  });

  it("uses unique record ids per collection", () => {
    for (const [id, list] of Object.entries(seed.seedCollections)) {
      const ids = list.map((record) => record.id);
      assert.equal(new Set(ids).size, ids.length, `${id}: record ids are unique`);
    }
  });

  it("gives non-workflow collections no live snapshot and the not_published status", () => {
    for (const collection of collectionRegistry) {
      if (hasPublishWorkflow(collection)) continue;
      for (const record of records(collection.id)) {
        assert.equal(record.liveValues, null, `${collection.id}/${record.id}: liveValues is null`);
        assert.equal(record.publishStatus, "not_published", `${collection.id}/${record.id}: status is not_published`);
      }
    }
  });

  it("clones deeply", () => {
    const copy = seed.cloneSeedCollections();
    copy.articles[0].values.title = "mutated";
    copy.articles.pop();
    assert.notEqual(seed.seedCollections.articles[0].values.title, "mutated");
    assert.equal(copy.articles.length, seed.seedCollections.articles.length - 1);
  });

  it("points redirect targets at real articles and products", () => {
    const articleSlugs = slugSet("articles");
    const productSlugs = slugSet("products");
    const liveArticles = new Set(records("articles").filter((r) => r.liveValues).map((r) => String(r.liveValues?.slug)));
    for (const rule of records("redirect-rules")) {
      const target = String(rule.values.targetUrl).split(/[?#]/)[0];
      const blog = /^\/blog\/([^/]+)$/.exec(target);
      if (blog) {
        assert.ok(articleSlugs.has(blog[1]), `${rule.id}: /blog/${blog[1]} is a real article`);
        assert.ok(liveArticles.has(blog[1]), `${rule.id}: /blog/${blog[1]} is live on the site`);
      }
      const shop = /^\/shop\/([^/]+)$/.exec(target);
      if (shop) assert.ok(productSlugs.has(shop[1]), `${rule.id}: /shop/${shop[1]} is a real product`);
    }
  });

  it("only cites order numbers and discount codes that exist", () => {
    const orderNumbers = new Set(records("orders").map((r) => String(r.values.orderNumber)));
    const codes = new Set(records("discount-codes").map((r) => String(r.values.code)));
    const codeWord = /\b(?:code|coupon|voucher)\s+([A-Z][A-Z0-9-]{3,})\b/g;
    for (const submission of records("form-submissions")) {
      const message = String(submission.values.message ?? "");
      for (const match of message.matchAll(/#(TA-\d+)/g)) {
        assert.ok(orderNumbers.has(match[1]), `${submission.id}: order #${match[1]} exists`);
      }
      for (const match of message.matchAll(codeWord)) {
        assert.ok(codes.has(match[1]), `${submission.id}: discount code ${match[1]} exists`);
      }
    }
  });

  it("resolves author references", () => {
    const authors = slugSet("authors");
    for (const article of records("articles")) {
      for (const values of [article.values, article.liveValues].filter(Boolean)) {
        assert.ok(authors.has(String(values?.author)), `articles/${article.id}: author ${values?.author} exists`);
      }
    }
  });

  it("resolves product references from testimonials and reviews", () => {
    const products = slugSet("products");
    for (const id of ["testimonials", "product-reviews"]) {
      for (const record of records(id)) {
        const slug = String(valuesOf(record).product ?? "");
        if (slug) assert.ok(products.has(slug), `${id}/${record.id}: product ${slug} exists`);
      }
    }
  });

  it("orders' line items sum to itemCount and reference real products", () => {
    const products = slugSet("products");
    for (const order of records("orders")) {
      let items: unknown;
      assert.doesNotThrow(() => {
        items = JSON.parse(String(order.values.items));
      }, `${order.id}: items is valid JSON`);
      assert.ok(Array.isArray(items) && items.length > 0, `${order.id}: items is a non-empty array`);
      const quantity = (items as Array<{ slug: string; quantity: number }>).reduce((sum, item) => sum + Number(item.quantity), 0);
      assert.equal(quantity, Number(order.values.itemCount), `${order.id}: item quantities sum to itemCount`);
      for (const item of items as Array<{ slug: string }>) {
        assert.ok(products.has(item.slug), `${order.id}: item ${item.slug} is a real product`);
      }
    }
  });

  it("form submissions only use the registry's form options", () => {
    const formField = collectionRegistry.find((c) => c.id === "form-submissions")?.fields.find((f) => f.key === "form");
    assert.ok(formField && formField.type === "select", "form-submissions has a form select field");
    const allowed = new Set(formField && formField.type === "select" ? formField.options.map((option) => option.value) : []);
    for (const submission of records("form-submissions")) {
      assert.ok(allowed.has(String(submission.values.form)), `${submission.id}: form "${String(submission.values.form)}" is a valid option`);
    }
  });
});
