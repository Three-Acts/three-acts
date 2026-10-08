import assert from "node:assert/strict";
import test from "node:test";
import candidates from "./utility-candidates.json";
import { applyStyle, componentBaseClass, emptyDesign, parseDeclarations, resolveProperties, setUtility, validateDesign, designCss, breakpoints, utilityControls } from "./index";

test("replaces a padding utility without removing its opposite side or responsive overrides", () => {
  const change = setUtility({ utilities: [], customClasses: [] }, "paddingBottom", "base", "pb-12");
  assert.equal(applyStyle("pb-8 pt-4 tablet:pb-16", change), "pt-4 tablet:pb-16 pb-12");
  const responsive = setUtility(change, "paddingBottom", "tablet", "pb-24");
  assert.equal(applyStyle("pb-8 pt-4 tablet:pb-16", responsive), "pt-4 pb-12 tablet:pb-24");
  assert.deepEqual(setUtility(responsive, "paddingBottom", "tablet", "").utilities, ["pb-12"]);
  assert.equal(applyStyle("py-section-sm", change), "py-section-sm pb-12");
});
test("keeps typography sizes and colors as independent utility groups", () => {
  assert.equal(applyStyle("text-display text-ink", { utilities: ["text-h2", "text-surface"], customClasses: [] }), "text-h2 text-surface");
});
test("instance properties use the same variant definition as rendering and preserve unrelated instances", () => {
  const doc = emptyDesign();
  doc.instances["home.cta"] = { component: "Button.Link", props: { variant: "secondary", size: "sm" } };
  const props = resolveProperties(validateDesign(doc), "Button.Link", "home.cta", { variant: "primary", size: "lg" });
  assert.deepEqual(props, { variant: "secondary", size: "sm" });
  assert.match(componentBaseClass("Button.Link", props), /border-line-strong/);
  assert.match(componentBaseClass("Button.Link", props), /px-\[17px\]/);
  assert.equal(resolveProperties(doc, "Button.Link", "home.other", { variant: "inverse" }).variant, "inverse");
  assert.equal(resolveProperties(doc, "Grid.Root", "home.cta", { cols: "4" }).cols, "4");
  doc.instances["home.cta"].props.variant = "invented";
  assert.throws(() => validateDesign(doc), /Invalid component property/);
});
test("rejects unsupported utilities, unknown parts, selectors, malformed CSS and prototype keys", () => {
  const doc = emptyDesign();
  doc.elements["home.title"] = { utilities: ["pb-999999"], customClasses: [] };
  assert.throws(() => validateDesign(doc), /supported Tailwind/);
  delete doc.elements["home.title"];
  doc.components["Button.Link"] = { parts: { arbitrary: { utilities: [], customClasses: [] } } };
  assert.throws(() => validateDesign(doc), /Unknown component part/);
  delete doc.components["Button.Link"];
  doc.customCss["body"] = { color: "red" };
  assert.throws(() => validateDesign(doc), /class selector/);
  assert.throws(() => parseDeclarations("color: red; color: blue;"), /Duplicate/);
  assert.throws(() => parseDeclarations("color: red; background-color: url(https://example.com);"), /unsupported/);
  assert.throws(() => parseDeclarations("color: red}body{display:none"), /invalid/);
  assert.throws(() => validateDesign(JSON.parse('{"version":1,"elements":{"__proto__":{}},"components":{},"instances":{},"customCss":{}}')), /invalid key/);
});
test("preserves component part styles, custom classes and safe CSS across serialization", () => {
  const doc = emptyDesign();
  doc.components["Button.Link"] = { parts: { label: { utilities: ["text-h3"], customClasses: ["callout"] } } };
  doc.customCss[".callout:hover"] = parseDeclarations("color: var(--color-ink); padding-bottom: 24px;");
  const saved = validateDesign(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(saved, doc);
  assert.equal(designCss(saved), ".callout:hover{color:var(--color-ink);padding-bottom:24px}");
});

test("Tailwind candidates cover every supported property and project breakpoint", () => {
  const expected = Object.keys(breakpoints).flatMap(breakpoint => Object.values(utilityControls).flatMap(control => control.classes.map(value => (breakpoint === "base" ? "" : `${breakpoint}:`) + value)));
  assert.deepEqual(candidates, expected);
});

test("merges named project spacing and container tokens with numeric overrides", () => {
  assert.equal(applyStyle("py-section-sm landscape:py-section-md desktop:py-section", { utilities: ["pt-4", "landscape:pb-8"], customClasses: [] }), "py-section-sm landscape:py-section-md desktop:py-section pt-4 landscape:pb-8");
  assert.equal(applyStyle("gap-x-gap gap-y-gap-y", { utilities: ["gap-4"], customClasses: [] }), "gap-4");
  assert.equal(applyStyle("max-w-content", { utilities: ["max-w-3xl"], customClasses: [] }), "max-w-3xl");
});
