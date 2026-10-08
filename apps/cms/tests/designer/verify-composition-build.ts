import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { contentDefinitions, contentPath, serializeContent, validateContent, validateLayout, type ContentObject } from "@three-acts/static-content";

// Run after the browser composition push workflow. Temporarily rebuild its
// exact public source snapshot, then restore every original file in finally.
const root = process.cwd();
const snapshot = JSON.parse(await readFile(resolve(root, "apps/cms/tests/designer/artifacts/composition-committed.json"), "utf8")) as { documents: Array<{ id: string; content: ContentObject }> };
assert.equal(snapshot.documents.length, contentDefinitions.length);
const sources = new Map(snapshot.documents.map(doc => [doc.id, validateContent(doc.id, doc.content)]));
assert.equal(sources.size, contentDefinitions.length);
for (const definition of contentDefinitions) assert.ok(sources.has(definition.id));
const originals = new Map(await Promise.all(contentDefinitions.map(async doc => [contentPath(doc.id), await readFile(resolve(root, contentPath(doc.id)))] as const)));
let server: ReturnType<typeof createServer> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  for (const doc of contentDefinitions) await writeFile(resolve(root, contentPath(doc.id)), serializeContent(sources.get(doc.id)!));
  const build = spawnSync("npm", ["run", "build:web"], { cwd: root, env: { ...process.env, CONTENT_SOURCE: "mock", PUBLIC_EDITOR_PREVIEW: "false" }, encoding: "utf8" });
  if (build.status !== 0) throw new Error(`Composition production build failed:\n${build.stdout}\n${build.stderr}`);
  const dist = resolve(root, "apps/web/dist");
  server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url!, "http://preview.invalid").pathname;
      const path = resolve(dist, `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!path.startsWith(`${dist}/`)) { response.writeHead(404).end(); return; }
      const mime: Record<string, string> = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".avif": "image/avif", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
      response.setHeader("Content-Type", mime[extname(path)] ?? "application/octet-stream");
      response.end(await readFile(path));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  browser = await chromium.launch();
  const page = await browser.newPage();
  const layout = validateLayout(sources.get("layout"));
  const expected = layout.pages.home;
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`http://127.0.0.1:${address.port}/`);
    assert.equal(await page.locator("#three-acts-editor-config").count(), 0);
    assert.equal(await page.locator('script[src="/editor-preview.js"]').count(), 0);
    assert.equal(await page.locator('astro-island[component-export="HomeCompositionPreview"]').count(), 0);
    assert.deepEqual(await page.locator("[data-layout-section]").evaluateAll(elements => elements.map(element => element.getAttribute("data-layout-section"))), expected.order);
    assert.equal(await page.locator("h1").count(), 1);
    for (const id of expected.order) {
      const section = page.locator(`[data-layout-section="${id}"]`);
      if (expected.sections[id].hidden) assert.equal(await section.evaluate(element => getComputedStyle(element).display), "none");
      if (expected.sections[id].type === "cta" && expected.sections[id].content) {
        assert.equal(await section.locator(`[data-static-field="layout.pages.home.sections.${id}.content.p_1"]`).textContent(), expected.sections[id].content.p_1);
        const style = (sources.get("design")!.elements as Record<string, { utilities: string[] }>)[`composition.${id}.source.cta-section.1`];
        assert.ok(style.utilities.includes("pt-12") && style.utilities.includes("tablet:pt-16"), "Fixture must include the browser-authored responsive instance styles");
        assert.equal(await section.locator(":scope > section").evaluate(element => getComputedStyle(element).paddingTop), width >= 1024 ? "64px" : "48px");
      }
    }
    await page.screenshot({ path: resolve(root, `apps/cms/tests/designer/artifacts/composition-published-${width}.png`), fullPage: true });
  }
  console.log("Committed composition snapshot matches the normal SSR production build at 1280px and 390px, without the editor renderer.");
} finally {
  await Promise.allSettled([browser?.close(), server ? new Promise<void>(resolve => server!.close(() => resolve())) : Promise.resolve()]);
  for (const [path, bytes] of originals) await writeFile(resolve(root, path), bytes);
}
