import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultLayout, duplicateSection, insertSection, moveSection } from "@three-acts/static-content";
import home from "@three-acts/static-content/documents/home.json";
import { HomePage } from "../src/views/home";

const data = { products: [], categories: [], articles: [], testimonials: [], faqs: [] };
test("canonical Home rendering follows saved order, independent copy, hidden state and a single primary heading", () => {
  let layout = duplicateSection(defaultLayout(), "home-hero", "section-copy", home);
  layout.pages.home.sections["section-copy"].content!.display_1 = "Independent duplicated headline";
  layout = moveSection(layout, "section-copy", 0);
  layout.pages.home.sections["home-hero"].hidden = true;
  const html = renderToStaticMarkup(createElement(HomePage, { ...data, layout }));
  assert.ok(html.indexOf('data-layout-section="section-copy"') < html.indexOf('data-layout-section="home-hero"'));
  assert.match(html, /data-layout-section="home-hero"[^>]*hidden=""/);
  assert.match(html, /data-static-field="layout.pages.home.sections.section-copy.content.display_1"/);
  assert.match(html, /data-editor-id="composition.section-copy.home.hero_section.display_1"/);
  assert.match(html, /Independent duplicated headline/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.equal(home.hero_section.display_1, "The client website template that ships production-ready.");
});
test("every approved Home section type can be inserted with a stable SSR carrier", () => {
  let layout = defaultLayout();
  for (const type of ["hero", "stats", "categories", "products", "intro", "journal", "testimonials", "faq", "cta"] as const) layout = insertSection(layout, type, `section-${type}`, home);
  const html = renderToStaticMarkup(createElement(HomePage, { ...data, layout }));
  for (const type of ["hero", "stats", "categories", "products", "intro", "journal", "testimonials", "faq", "cta"]) assert.ok(html.includes(`data-layout-section="section-${type}" data-layout-type="${type}"`));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  for (const section of Object.values(layout.pages.home.sections)) section.hidden = true;
  const hiddenHtml = renderToStaticMarkup(createElement(HomePage, { ...data, layout }));
  assert.equal((hiddenHtml.match(/<h1\b/g) ?? []).length, 1);
  assert.match(hiddenHtml, /<h1 class="sr-only">/);
});
