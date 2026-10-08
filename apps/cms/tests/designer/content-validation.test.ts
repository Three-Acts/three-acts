import assert from "node:assert/strict";
import test from "node:test";
import { contentDefinitions, isSafeMediaUrl, validateContent } from "@three-acts/static-content";

test("rejects malformed default image URLs", () => {
  const shared = structuredClone(contentDefinitions.find((item) => item.id === "shared")!.content);
  const site = shared.site as Record<string, unknown>;
  site.defaultImage = "http://[";

  assert.throws(() => validateContent("shared", shared), /defaultImage: use a site path or https\/http image URL\./);
});

test("image sources reject non-image schemes at the persisted document boundary", () => {
  const home = structuredClone(contentDefinitions.find(item => item.id === "home")!.content);
  const image = (home.intro_section as Record<string, unknown>).fallback_image_2 as Record<string, unknown>;
  for (const src of ["mailto:person@example.com", "tel:123", "#image", "//other.example/image", "javascript:alert(1)", "https://[", "/unsafe\\image"]) {
    assert.equal(isSafeMediaUrl(src), false);
    image.src = src;
    assert.throws(() => validateContent("home", home), /image URL/);
  }
  image.src = "/content/islands.png";
  image.alt = "";
  assert.doesNotThrow(() => validateContent("home", home));
});

test("template drafts cannot add collection bindings or unsafe template links", () => {
  const template = structuredClone(contentDefinitions.find((item) => item.id === "product-template")!.content);
  assert.doesNotThrow(() => validateContent("product-template", { ...template, what_you_get: "Included with your piece" }));
  assert.throws(() => validateContent("product-template", { ...template, title: "Overwrite a CMS title" }), /content fields have changed/);
  assert.throws(() => validateContent("product-template", { ...template, see_all_faqs_href: "javascript:alert(1)" }), /use a site path/);
});
