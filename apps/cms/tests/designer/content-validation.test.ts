import assert from "node:assert/strict";
import test from "node:test";
import { contentDefinitions, validateContent } from "@three-acts/static-content";

test("rejects malformed default image URLs", () => {
  const shared = structuredClone(contentDefinitions.find((item) => item.id === "shared")!.content);
  const site = shared.site as Record<string, unknown>;
  site.defaultImage = "http://[";

  assert.throws(() => validateContent("shared", shared), /defaultImage: use a site path, anchor, https\/http, mailto or tel URL\./);
});

test("template drafts cannot add collection bindings or unsafe template links", () => {
  const template = structuredClone(contentDefinitions.find((item) => item.id === "product-template")!.content);
  assert.doesNotThrow(() => validateContent("product-template", { ...template, what_you_get: "Included with your piece" }));
  assert.throws(() => validateContent("product-template", { ...template, title: "Overwrite a CMS title" }), /content fields have changed/);
  assert.throws(() => validateContent("product-template", { ...template, see_all_faqs_href: "javascript:alert(1)" }), /use a site path/);
});
