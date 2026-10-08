import assert from "node:assert/strict";
import test from "node:test";
import { isCanvasSelection, readCanvasNodes, readCanvasTreeStatus } from "../../src/components/designer/canvas-contract";

const selection = { selector: "main > a", label: "Button link", tag: "a", category: "component", editable: false, breadcrumbs: [], styles: {} };
test("formatted source editing requires an explicit supported format and cannot enable inline editing", () => {
  const prose = { ...selection, textFormat: "prose", textField: { id: "terms", path: "terms.sections_2.0.body", value: "## Body" } };
  assert.equal(isCanvasSelection(prose), true);
  assert.equal(isCanvasSelection({ ...prose, editable: true }), false);
  assert.equal(isCanvasSelection({ ...prose, textField: undefined }), false);
  assert.equal(isCanvasSelection({ ...prose, textFormat: "html" }), false);
});
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
test("visibility metadata rejects malformed states and invalid hidden parents", () => {
  for (const visibility of [null, "hidden", { state: "hidden" }, { state: "unknown", reason: "Unknown" }, { state: "revealed", reason: "x".repeat(221) }]) assert.equal(isCanvasSelection({ ...selection, visibility }), false);
  assert.equal(isCanvasSelection({ ...selection, visibility: { state: "hidden", reason: "Closed disclosure" } }), true);
  const body = { selector: "body", parentSelector: null, depth: 0, category: "element", tag: "body", label: "Body" };
  const invalid = { ...body, selector: "invalid", parentSelector: "body", depth: 1, visibility: { state: "hidden" } };
  const child = { ...body, selector: "child", parentSelector: "invalid", depth: 2 };
  assert.deepEqual(readCanvasNodes([body, invalid, child]), [body]);
});
test("outline status bounds lazy pages and the explicit safety limit", () => {
  const status = { limit: 400, maximum: 5000, loaded: 402, total: 960, hasMore: true, capped: false };
  assert.deepEqual(readCanvasTreeStatus(status), status);
  for (const value of [null, {}, { ...status, limit: 5001 }, { ...status, limit: 0 }, { ...status, loaded: 5101 }, { ...status, total: Infinity }, { ...status, capped: "false" }]) assert.equal(readCanvasTreeStatus(value), null);
});
