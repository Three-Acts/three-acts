import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createCmsDraftPreview, cmsPreviewCollections, type CmsPreviewCollection, type CmsPreviewTemplateCollection, type CmsRecord } from "@three-acts/cms-schema";
import { cloneSeedCollections } from "@three-acts/cms-schema/seed";
import { CmsDraftPreviewView } from "../src/views/editor-cms-preview";

function fixture(collectionId: CmsPreviewTemplateCollection) {
  const seed = cloneSeedCollections();
  const selected = seed[collectionId][0];
  selected.publishStatus = "not_published";
  selected.liveValues = null;
  selected.values[collectionId === "articles" || collectionId === "products" ? "title" : "name"] = "Unpublished preview item";
  const records = Object.fromEntries(cmsPreviewCollections.map(id => [id, seed[id]])) as Record<CmsPreviewCollection, CmsRecord[]>;
  return { records, selected, collectionId };
}
test("each private template renders unpublished values with exact CMS identity", () => {
  for (const collectionId of ["products", "articles", "authors", "product-categories", "article-categories"] as const) {
    const { records, selected } = fixture(collectionId);
    const preview = createCmsDraftPreview({ collectionId, recordId: selected.id, session: "render-session-123456", sequence: 1 }, records);
    const html = renderToStaticMarkup(createElement(CmsDraftPreviewView, { preview }));
    assert.match(html, /Unpublished preview item/);
    assert.ok(html.includes(`data-cms-collection="${collectionId}" data-cms-item-id="${selected.id}"`));
    if (collectionId === "products") assert.match(html, /<button[^>]*disabled=""[^>]*title="Purchases are available on the published site"/);
  }
});
test("incomplete private templates use render-only placeholders without modifying saved values", () => {
  for (const collectionId of ["products", "articles", "authors", "product-categories", "article-categories"] as const) {
    const { records, selected } = fixture(collectionId);
    selected.values.slug = "";
    selected.values.title = "";
    selected.values.name = "";
    const preview = createCmsDraftPreview({ collectionId, recordId: selected.id, session: "render-session-123456", sequence: 1 }, records);
    const before = JSON.stringify(preview);
    const html = renderToStaticMarkup(createElement(CmsDraftPreviewView, { preview }));
    assert.match(html, /This draft uses preview placeholders/);
    assert.match(html, /Untitled (product|article|author|category)/);
    assert.equal(JSON.stringify(preview), before);
    assert.equal(selected.values.slug, "");
  }
});
test("private article bodies reuse canonical formatting and cannot interpret source HTML", () => {
  const { records, selected, collectionId } = fixture("articles");
  selected.values.body = "## A draft heading\n- https://example.com\n\n<img src=x onerror=alert(1)>";
  const preview = createCmsDraftPreview({ collectionId, recordId: selected.id, session: "render-session-123456", sequence: 1 }, records);
  const html = renderToStaticMarkup(createElement(CmsDraftPreviewView, { preview }));
  assert.match(html, /A draft heading/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /href="https:\/\/example.com"[^>]*rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /<img src="x"/);
});
