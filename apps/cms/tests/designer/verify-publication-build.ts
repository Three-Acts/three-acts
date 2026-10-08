import assert from "node:assert/strict";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, extname } from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { contentDefinitions, contentPath, serializeContent, validateContent, validateLayout, type ContentObject } from "@three-acts/static-content";

// A local publication fixture supplies the exact committed documents. Rebuild
// them as production output, then restore canonical files even on failure.
const root = process.cwd();
const fixture = JSON.parse(await readFile(resolve(root, "apps/cms/tests/designer/artifacts/publication-committed.json"), "utf8")) as { revision: string; documents: Array<{ id: string; content: ContentObject }> };
assert.match(fixture.revision, /^[a-f0-9]{40}$/);
const sources = new Map(fixture.documents.map(doc => [doc.id, validateContent(doc.id, doc.content)]));
assert.equal(sources.size, contentDefinitions.length);
for (const doc of contentDefinitions) assert.ok(sources.has(doc.id));
const publicationId = sources.get("publication")!.publicationId;
assert.equal(typeof publicationId, "string");
const originals = new Map(await Promise.all(contentDefinitions.map(async doc => [contentPath(doc.id), await readFile(resolve(root, contentPath(doc.id)))] as const)));
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let server: ReturnType<typeof createServer> | undefined;
try {
  for (const doc of contentDefinitions) await writeFile(resolve(root, contentPath(doc.id)), serializeContent(sources.get(doc.id)!));
  const build = spawnSync("npm", ["run", "build:web"], { cwd: root, env: { ...process.env, CONTENT_SOURCE: "mock", PUBLIC_EDITOR_PREVIEW: "false", VERCEL_GIT_COMMIT_SHA: fixture.revision, EDITOR_SOURCE_REVISION: fixture.revision, EDITOR_PUBLICATION_ID: publicationId as string }, encoding: "utf8" });
  if (build.status !== 0) throw new Error(`Reviewed publication build failed:\n${build.stdout}\n${build.stderr}`);
  const dist = resolve(root, "apps/web/dist");
  assert.deepEqual(JSON.parse(await readFile(resolve(dist, "editor-revision.json"), "utf8")), { version: 1, revision: fixture.revision, publicationId });
  const files = await readdir(dist, { recursive: true });
  assert.equal(files.some(file => file.startsWith("editor-preview/")), false);
  for (const file of files.filter(file => file.endsWith(".html"))) {
    const html = await readFile(resolve(dist, file), "utf8");
    assert.equal(/three-acts-editor-config|\/editor-preview\.js|HomeCompositionPreview|CmsDraftPreview/.test(html), false, `Private editor output in ${file}`);
  }
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url!, "http://local.invalid");
      const path = resolve(dist, `.${url.pathname === "/" ? "/index.html" : url.pathname}`);
      if (!path.startsWith(dist + "/")) { response.writeHead(404).end(); return; }
      const mime: Record<string, string> = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".avif": "image/avif", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
      response.setHeader("Content-Type", mime[extname(path)] ?? "application/octet-stream");
      response.end(await readFile(path));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  browser = await chromium.launch();
  const page = await browser.newPage();
  const layout = validateLayout(sources.get("layout")).pages.home;
  const copy = Object.entries(layout.sections).find(([, section]) => section.content?.p_1 === "A reviewed composed section");
  assert.ok(copy);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`http://127.0.0.1:${address.port}/`);
    assert.equal(await page.locator('[data-static-field="home.hero_section.display_1"]').textContent(), "A reviewed publication headline");
    assert.deepEqual(await page.locator("[data-layout-section]").evaluateAll(elements => elements.map(element => element.getAttribute("data-layout-section"))), layout.order);
    assert.equal(await page.locator(`[data-layout-section="${copy[0]}"] > section`).evaluate(element => getComputedStyle(element).paddingTop), width >= 1024 ? "64px" : "48px");
    assert.equal(await page.locator('[data-editor-component="Button.Link"][data-editor-instance="home.hero_section.href_3"]').evaluate(element => element.classList.contains("border-line-strong")), true);
    await page.screenshot({ path: resolve(root, `apps/cms/tests/designer/artifacts/publication-built-${width}.png`), fullPage: true });
  }
  console.log(`Reviewed text, component variant, composition and responsive Tailwind styles match normal SSR at 1280px/390px. ${files.filter(file => file.endsWith(".html")).length} HTML files exclude private editor data; the build marker matches the captured fixture revision/publication.`);
} finally {
  await Promise.allSettled([browser?.close(), server ? new Promise<void>(resolve => server!.close(() => resolve())) : Promise.resolve()]);
  for (const [path, bytes] of originals) await writeFile(resolve(root, path), bytes);
}
