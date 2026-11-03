import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownPreview } from "../src/components/editor/markdown-preview";

test("Markdown preview renders website content and blocks executable HTML and URLs", () => {
  const source = '# Story\n\nA **bold** and *quiet* welcome.\n\n- One\n- Two\n\n> A quote\n\n[Guide](https://example.com)\n\n```js\nconst ok = true;\n```\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))\n\n<img src=x onerror=alert(1)>';
  const html = renderToStaticMarkup(createElement(MarkdownPreview, { source }));
  for (const tag of ['h1', 'strong', 'em', 'ul', 'blockquote', 'code']) assert.match(html, new RegExp(`<${tag}[ >]`));
  assert.match(html, /href="https:\/\/example.com"/);
  assert.doesNotMatch(html, /<script|onerror|href="javascript:/);
});
