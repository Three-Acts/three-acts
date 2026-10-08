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
  doc.elements["home.title"] = { utilities: ["pb-[url(javascript:alert(1))]"], customClasses: [] };
  assert.throws(() => validateDesign(doc), /valid Tailwind/);
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

test("arbitrary Tailwind values replace only their property and breakpoint", async () => {
  const { propertyUtility, utilityProperty, utilityScope } = await import("./index");
  assert.equal(propertyUtility("paddingBottom", "7"), "pb-7");
  assert.equal(propertyUtility("paddingBottom", "calc(3rem + 2px)"), "pb-[calc(3rem_+_2px)]");
  assert.equal(propertyUtility("fontSize", "var(--heading-size)"), "text-[length:var(--heading-size)]");
  assert.equal(utilityProperty("text-[length:var(--heading-size)]"), "fontSize");
  assert.equal(utilityProperty("bg-linear-to-r"), null);
  assert.equal(utilityScope("tablet:[padding-bottom:calc(3rem+2px)]"), "tablet:");
  assert.equal(utilityProperty("tablet:pb-[calc(3rem+2px)]"), "paddingBottom");
  const style = {utilities:["pb-[31px]", "tablet:pb-[42px]", "hover:pb-8", "pt-4"],customClasses:[]};
  const next = setUtility(style, "paddingBottom", "base", "pb-[var(--space)]");
  assert.deepEqual(next.utilities, ["tablet:pb-[42px]", "hover:pb-8", "pt-4", "pb-[var(--space)]"]);
  assert.deepEqual(setUtility(next, "paddingBottom", "base", "").utilities, style.utilities.slice(1));
  const doc = emptyDesign(); doc.elements.example = next;
  assert.deepEqual(validateDesign(doc).elements.example, next);
});

test("added elements preserve source anchors and reject cycles, scripts and unsafe attributes", async () => {
  const { validateAdditions } = await import("./index");
  const node = { id:"added-one",type:"h1",position:"inside",text:"My heading",attributes:{} };
  const additions = { "auto.source.heading": [node], "added-one": [{...node,id:"added-two",type:"Button.Link",position:"after",attributes:{href:"/shop"}}] };
  assert.deepEqual(validateAdditions(additions), additions);
  assert.throws(() => validateAdditions({source:[{...node,type:"script"}]}), /supported/);
  assert.throws(() => validateAdditions({source:[{...node,attributes:{href:"javascript:alert(1)"}}]}), /attributes/);
  assert.throws(() => validateAdditions({source:[{...node,attributes:{onload:"alert(1)"}}]}), /attributes/);
  assert.throws(() => validateAdditions({...additions,"added-two":[{...node,id:"added-three"}],"added-three":[{...node,id:"added-one"}]}), /distinct/);
  assert.throws(() => validateAdditions({"added-one":[{...node,id:"added-two"}],"added-two":[node]}), /cycle/);
});


test("added sibling operations preserve independent siblings and clean nested removals", async () => {
  const {insertAddition,moveAddition,removeAddition,validateAdditions}=await import("./index");
  const node={id:"added-heading",type:"h1",position:"inside" as const,text:"Heading",attributes:{}};
  const additions={source:[node]} as Record<string, import("./index").AddedElement[]>;
  insertAddition(additions,node.id,{...node,id:"added-button",type:"Button.Root",position:"after"});
  assert.deepEqual(additions.source.map(n=>n.id),["added-heading","added-button"]);
  insertAddition(additions,node.id,{...node,id:"added-child",type:"span",position:"inside"});
  moveAddition(additions,"added-button",-1);
  assert.deepEqual(additions.source.map(n=>n.id),["added-button","added-heading"]);
  assert.deepEqual(removeAddition(additions,node.id),["added-heading","added-child"]);
  assert.deepEqual(additions.source.map(n=>n.id),["added-button"]);
  assert.deepEqual(validateAdditions(additions),additions);
});


test("arbitrary CSS properties replace equivalent source utilities before Tailwind compilation", async () => {
  const {propertyUtility}=await import("./index");
  assert.equal(applyStyle("pb-8 pt-4 tablet:pb-12",{utilities:["[padding-bottom:50px]"],customClasses:[]}),"pt-4 tablet:pb-12 [padding-bottom:50px]");
  assert.equal(propertyUtility("color","text-blue-500"),"text-blue-500");
  assert.equal(propertyUtility("fontSize","text-2xl"),"text-2xl");
  assert.equal(propertyUtility("paddingBottom","pb-[var(--space)]"),"pb-[var(--space)]");
  assert.equal(propertyUtility("width","w-1/2"),"w-1/2");
});
