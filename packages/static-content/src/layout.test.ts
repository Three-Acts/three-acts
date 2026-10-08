import assert from "node:assert/strict";
import test from "node:test";
import home from "./documents/home.json";
import { validateContent, contentFields } from "./index";
import { defaultLayout, duplicateSection, insertSection, moveSection, validateLayout, sectionElementId, sectionField, layoutLimits, type LayoutDocument } from "./layout";

test("approved layout preserves default section order and original binding identities", () => {
  const layout = defaultLayout();
  assert.equal(layout.pages.home.order.length, 9);
  assert.deepEqual(validateLayout(layout), layout);
  assert.deepEqual(validateContent("layout", layout), layout);
  assert.equal(sectionElementId("home-hero", "hero", "home.hero"), "home.hero");
  assert.equal(sectionField("home-hero", layout.pages.home.sections["home-hero"], "home.hero_section.display_1"), "home.hero_section.display_1");
});
test("insert, duplicate, hide and reorder retain source independence and identities", () => {
  const source = structuredClone(home);
  source.hero_section.display_1 = "Current browser draft";
  let layout = duplicateSection(defaultLayout(), "home-hero", "section-copy", source);
  assert.equal(layout.pages.home.sections["section-copy"].content?.display_1, "Current browser draft");
  assert.equal(layout.pages.home.sections["home-hero"].content, undefined);
  layout.pages.home.sections["section-copy"].content!.display_1 = "Independent copy";
  layout.pages.home.sections["section-copy"].hidden = true;
  layout = moveSection(layout, "section-copy", 9);
  assert.equal(layout.pages.home.order.at(-1), "section-copy");
  assert.equal(layout.pages.home.sections["section-copy"].hidden, true);
  assert.equal(source.hero_section.display_1, "Current browser draft");
  assert.equal(sectionElementId("section-copy", "hero", "home.hero"), "composition.section-copy.home.hero");
  assert.equal(sectionField("section-copy", layout.pages.home.sections["section-copy"], "home.hero_section.display_1"), "layout.pages.home.sections.section-copy.content.display_1");
  layout = insertSection(layout, "cta", "section-cta", source, "section-copy");
  assert.equal(layout.pages.home.order.at(-1), "section-cta");
  assert.ok(contentFields(validateContent("layout", layout)).some(field => field.path.join(".") === "pages.home.sections.section-copy.content.display_1" && field.value === "Independent copy"));
});
test("layout contract rejects arbitrary nesting, versions, types, identities, source fields and unsafe URLs", () => {
  for (const mutate of [
    (doc: LayoutDocument) => { (doc as unknown as { version: number }).version = 2; },
    (doc: LayoutDocument) => { Object.assign(doc.pages.home.sections["home-hero"], { children: [] }); },
    (doc: LayoutDocument) => { Object.assign(doc.pages.home.sections["home-hero"], { type: "arbitrary-script" }); },
    (doc: LayoutDocument) => { doc.pages.home.order.push("home-hero"); },
    (doc: LayoutDocument) => { delete doc.pages.home.sections["home-hero"]; },
    (doc: LayoutDocument) => { Object.assign(doc.pages.home.sections, { "section-orphan": { type: "cta", hidden: false } }); },
    (doc: LayoutDocument) => { Object.assign(doc.pages.home.sections["home-hero"], { content: { arbitrary: "value" } }); },
    (doc: LayoutDocument) => { doc.pages.home.sections["home-hero"].content = { ...home.hero_section, href_3: "javascript:alert(1)" }; },
  ]) {
    const invalid = defaultLayout(); mutate(invalid);
    assert.throws(() => validateContent("layout", invalid));
  }
  assert.throws(() => insertSection(defaultLayout(), "hero", "__proto__", home));
  assert.throws(() => sectionField("home-hero", defaultLayout().pages.home.sections["home-hero"], "shared.site.name"), /outside/);
  assert.throws(() => moveSection(defaultLayout(), "home-hero", -1), /position/);
});
test("layout limits bound approved section count and aggregate source size", () => {
  let layout = defaultLayout();
  for (let index = layout.pages.home.order.length; index < layoutLimits.sections; index++) layout = insertSection(layout, "hero", `section-${index}`, home);
  assert.throws(() => insertSection(layout, "hero", "section-too-many", home), /60/);
  const large = structuredClone(home);
  large.hero_section.display_1 = "x".repeat(20_000);
  layout = defaultLayout();
  assert.throws(() => { for (let index = 0; index < 30; index++) layout = insertSection(layout, "hero", `section-big-${index}`, large); }, /512 KiB/);
});
