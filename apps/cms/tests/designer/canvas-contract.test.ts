import assert from "node:assert/strict";
import test from "node:test";
import { isCanvasSelection } from "../../src/components/designer/canvas-contract";

const selection = { selector: "main > a", label: "Button link", tag: "a", category: "component", editable: false, breadcrumbs: [], styles: {} };
test("rejects malformed optional component metadata without throwing", () => {
  for (const component of [null, "Button.Link", { name: "Unknown", props: {}, fields: [] }, { name: "Button.Link", props: null, fields: [] }, { name: "Button.Link", props: [], fields: [] }, { name: "Button.Link", props: {}, fields: [null] }]) {
    assert.equal(isCanvasSelection({ ...selection, component }), false);
  }
  assert.equal(isCanvasSelection({ ...selection, component: { name: "Button.Link", props: { variant: "primary" }, fields: [] } }), true);
  for (const sourceProps of [null, [], "primary", { variant: 1 }]) assert.equal(isCanvasSelection({ ...selection, component: { name: "Button.Link", props: {}, sourceProps, fields: [] } }), false);
  assert.equal(isCanvasSelection({ ...selection, component: { name: "Button.Link", props: { variant: "secondary" }, sourceProps: { variant: "primary" }, fields: [] } }), true);
});
test("rejects malformed or unregistered style scopes and accepts registered parts", () => {
  for (const designTarget of [null, "home", {}, { kind: "component", component: "Button.Link", part: "arbitrary" }]) assert.equal(isCanvasSelection({ ...selection, designTarget }), false);
  assert.equal(isCanvasSelection({ ...selection, designTarget: { kind: "component", component: "Button.Link", part: "label" } }), true);
  assert.equal(isCanvasSelection({ ...selection, designTarget: { kind: "element", id: "home.title" } }), true);
});
test("CMS source metadata must identify a registered collection and an explicit record", () => {
  for (const cmsSource of [null, {}, { collectionId: "products", label: "Product", field: "title" }, { collectionId: "products", recordId: "../unsafe", label: "Product" }]) assert.equal(isCanvasSelection({ ...selection, cmsSource }), false);
  assert.equal(isCanvasSelection({ ...selection, cmsSource: { collectionId: "products", recordId: "product-1", label: "Product", field: "title" } }), true);
});
