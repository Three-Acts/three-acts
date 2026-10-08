import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Card } from "../src/components/ui/card";
import { Byline } from "../src/components/blog/byline";
import { ProductPage } from "../src/views/shop/ProductPage";
import type { Author } from "@three-acts/content";
import type { Product, ProductCategory } from "@three-acts/ecommerce";

test("main product and category fields carry their own canonical CMS identities", () => {
  const product = { id: "product-own", title: "Product" } as Product;
  const category = { id: "category-own", slug: "apps", name: "Apps" } as ProductCategory;
  const html = renderToStaticMarkup(createElement(ProductPage.Header, { product, category }));
  assert.match(html, /data-cms-bound="products.title" data-cms-collection="products" data-cms-item-id="product-own"/);
  assert.match(html, /data-cms-bound="product-categories.name" data-cms-collection="product-categories" data-cms-item-id="category-own"/);
});
test("related cards and byline authors do not inherit the parent article record", () => {
  const html = renderToStaticMarkup(createElement(Card.Article, { title: "Related", href: "/blog/related", cmsSource: { collectionId: "articles", recordId: "related-own", label: "Related" } }));
  assert.match(html, /data-cms-bound="articles.title" data-cms-collection="articles" data-cms-item-id="related-own"/);
  const author = { id: "author-own", slug: "author", name: "Author" } as Author;
  const byline = renderToStaticMarkup(createElement(Byline, { author, publishedAt: "2026-10-08", articleSource: { collectionId: "articles", recordId: "parent-article", label: "Article" } }));
  assert.match(byline, /data-cms-bound="authors.name" data-cms-collection="authors" data-cms-item-id="author-own"/);
  assert.match(byline, /data-cms-bound="articles.publishedAt" data-cms-collection="articles" data-cms-item-id="parent-article"/);
});
