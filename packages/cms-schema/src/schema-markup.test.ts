import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSchemaMarkup } from "./schema-markup.ts";

describe("parseSchemaMarkup", () => {
  it("treats empty values as no markup", () => {
    assert.deepEqual(parseSchemaMarkup(""), { ok: true, value: [] });
    assert.deepEqual(parseSchemaMarkup("   \n "), { ok: true, value: [] });
    assert.deepEqual(parseSchemaMarkup(null), { ok: true, value: [] });
    assert.deepEqual(parseSchemaMarkup(undefined), { ok: true, value: [] });
  });

  it("wraps a single JSON object in an array", () => {
    const stored = JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "Three Acts" });
    assert.deepEqual(parseSchemaMarkup(stored), {
      ok: true,
      value: [{ "@context": "https://schema.org", "@type": "Organization", name: "Three Acts" }]
    });
  });

  it("accepts an array of objects", () => {
    const stored = JSON.stringify([{ "@type": "Organization" }, { "@type": "WebSite", url: "https://threeacts.test" }]);
    assert.deepEqual(parseSchemaMarkup(stored), {
      ok: true,
      value: [{ "@type": "Organization" }, { "@type": "WebSite", url: "https://threeacts.test" }]
    });
  });

  it("accepts an empty array", () => {
    assert.deepEqual(parseSchemaMarkup("[]"), { ok: true, value: [] });
  });

  it("rejects malformed JSON with a friendly message", () => {
    const result = parseSchemaMarkup('{ "@type": "Organization", }');
    assert.equal(result.ok, false);
    assert.match((result as { error: string }).error, /not valid JSON/);
  });

  it("rejects primitives and null", () => {
    for (const stored of ['"Organization"', "42", "true", "null"]) {
      const result = parseSchemaMarkup(stored);
      assert.equal(result.ok, false, stored);
      assert.match((result as { error: string }).error, /object or an array of objects/);
    }
  });

  it("rejects arrays holding non-objects and names the offending item", () => {
    const result = parseSchemaMarkup('[{ "@type": "Organization" }, "oops"]');
    assert.equal(result.ok, false);
    assert.match((result as { error: string }).error, /item 2 must be a JSON object/);

    const nested = parseSchemaMarkup("[[{}]]");
    assert.equal(nested.ok, false);
  });
});
