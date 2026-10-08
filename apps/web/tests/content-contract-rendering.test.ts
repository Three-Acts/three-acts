import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { toProduct } from "@three-acts/ecommerce";
import { seedCollections } from "@three-acts/cms-schema/seed";
import { Image } from "../src/components/ui/image";
import { Prose } from "../src/components/ui/prose";
import { IntroSection } from "../src/components/home/intro-section";
import { HomePage } from "../src/views/home";

test("production images preserve explicit media bindings and identify their optimized source", () => {
  const image = renderToStaticMarkup(createElement(Image, { src: "/content/islands.png", alt: "", "data-static-media": "home.intro_section.fallback_image_2" }));
  assert.match(image, /data-image-avif="" srcSet="\/content\/islands.avif"/);
  assert.match(image, /alt=""[^>]*data-static-media="home.intro_section.fallback_image_2"/);
  const fallback = renderToStaticMarkup(createElement(IntroSection, { images: [] }));
  assert.equal((fallback.match(/data-static-media="home.intro_section.fallback_image_2"/g) ?? []).length, 3);
});
test("Home's derived images retain each product's exact gallery source", () => {
  const products = seedCollections.products.map(toProduct).filter(product => product !== null);
  const html = renderToStaticMarkup(createElement(HomePage, { products, categories: [], articles: [], testimonials: [], faqs: [] }));
  const imageSources = [...html.matchAll(/<img[^>]*data-cms-bound="products.images.0"[^>]*data-cms-item-id="([^"]+)"/g)].map(match => match[1]);
  assert.ok(imageSources.length >= 4);
  assert.ok(products.some(product => product.id === imageSources[0]));
  assert.ok(new Set(imageSources).size >= 3);
});
test("production body rendering autolinks every block and escapes literal markup", () => {
  const html = renderToStaticMarkup(createElement(Prose.Root, { body: "## Visit /shop/app\n- https://example.com/path\n\nOne\ntwo <img src=x onerror=alert(1)>" }));
  assert.match(html, /<h2[^>]*>Visit <a[^>]*href="\/shop\/app"/);
  assert.match(html, /<li><a[^>]*href="https:\/\/example.com\/path"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(html, /One<br\/>two &lt;img/);
  assert.doesNotMatch(html, /<img/);
});
