import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import source from "@three-acts/static-content/documents/design.json";
import { emptyDesign, type DesignDocument } from "@three-acts/design";
import { Button } from "../src/components/ui/button";
import { Grid } from "../src/components/layout/grid";
import { elementClass } from "../src/lib/design";

test("static rendering consumes saved utility, component instance and shared part sources", () => {
  const original = structuredClone(source);
  const design = emptyDesign();
  design.elements["home.lede"] = { utilities: ["pb-12"], customClasses: [] };
  design.instances["home.button"] = { component: "Button.Link", props: { variant: "secondary", size: "sm" } };
  design.instances["home.grid"] = { component: "Grid.Root", props: { cols: "2" } };
  design.components["Button.Link"] = { parts: { label: { utilities: ["text-h3"], customClasses: ["brand-label"] } } };
  Object.assign(source, design);
  try {
    assert.equal(elementClass("home.lede", "pb-8 pt-4"), "pt-4 pb-12");
    const button = renderToStaticMarkup(createElement(Button.Link, { href: "/shop", "data-editor-id": "home.button", size: "lg", children: "Shop" }));
    assert.match(button, /border-line-strong/);
    assert.match(button, /px-\[17px\]/);
    assert.match(button, /data-editor-part="label" class="text-h3 brand-label"/);
    assert.doesNotMatch(button, /style=/);
    const other = renderToStaticMarkup(createElement(Button.Link, { href: "/shop", variant: "inverse", children: "Another" }));
    assert.match(other, /border-surface/);
    assert.match(other, /text-h3 brand-label/);
    const grid = renderToStaticMarkup(createElement(Grid.Root, { "data-editor-id": "home.grid", cols: 4, children: "Cards" }));
    assert.match(grid, /landscape:grid-cols-2/);
    assert.doesNotMatch(grid, /desktop:grid-cols-4/);
  } finally { Object.assign(source, original as unknown as DesignDocument); }
});
