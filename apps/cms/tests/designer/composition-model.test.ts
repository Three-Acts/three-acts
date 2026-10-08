import assert from "node:assert/strict";
import test from "node:test";
import { emptyDesign } from "@three-acts/design";
import { copySectionDesign } from "../../src/components/designer/composition-model";

test("section duplication copies authored utilities and variants to a new scope without changing shared definitions", () => {
  const design = emptyDesign();
  design.elements["source.cta-section.1"] = { utilities: ["pt-4", "tablet:pb-8"], customClasses: ["editor-band"] };
  design.elements["source.hero-section.2"] = { utilities: ["pb-4"], customClasses: [] };
  design.instances["home.cta_section.href_2"] = { component: "Button.Link", props: { size: "sm" } };
  design.components["Button.Link"] = { parts: { root: { utilities: ["rounded-lg"], customClasses: [] } } };
  design.customCss[".editor-band"] = { color: "red" };
  const before = JSON.stringify(design);
  const next = copySectionDesign(design, "cta", "home-cta", "section-copy");
  assert.deepEqual(next.elements["composition.section-copy.source.cta-section.1"], design.elements["source.cta-section.1"]);
  assert.equal(next.elements["composition.section-copy.source.hero-section.2"], undefined);
  assert.deepEqual(next.instances["composition.section-copy.home.cta_section.href_2"], design.instances["home.cta_section.href_2"]);
  assert.equal(JSON.stringify(design), before);
  assert.deepEqual(next.components, design.components);
  assert.deepEqual(next.customCss, design.customCss);
  const again = copySectionDesign(next, "cta", "section-copy", "section-second-copy");
  assert.deepEqual(again.elements["composition.section-second-copy.source.cta-section.1"], design.elements["source.cta-section.1"]);
});

test('source duplication merges committed branches with current-session overrides',async()=>{
  const {copiedSectionSourceEdits}=await import('../../src/components/designer/composition-model');
  const baseline=[{start:100,target:'source.cta-section.1',style:{utilities:['pl-6','bg-ink'],customClasses:[]}},{start:150,target:'source.cta-section.4',style:{utilities:['mb-4'],customClasses:[]}}];
  const pending=[{start:100,target:'source.cta-section.1',style:{utilities:['pt-8','bg-surface'],customClasses:[]}}];
  const copied=copiedSectionSourceEdits('cta','home-cta','section-copy',baseline,pending);
  assert.equal(copied.length,2);
  assert.deepEqual(copied[0].style.utilities,['pl-6','pt-8','bg-surface']);
  assert.deepEqual(copied[1].style.utilities,['mb-4']);
  assert.match(copied[0].target,/composition.section-copy/);
});
