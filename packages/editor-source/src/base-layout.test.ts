import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { patchSource, authoredSourceEdits } from "./node.mjs";
test("Astro source editing skips compiler generated nodes without source positions", async () => {
  const code = await readFile(
    new URL("../../../apps/web/src/layouts/BaseLayout.astro", import.meta.url),
    "utf8",
  );
  const start = code.indexOf('<p class="text-body font-medium text-ink"');
  assert.ok(start > 0);
  const changed = await patchSource(
    code,
    "apps/web/src/layouts/BaseLayout.astro",
    [
      {
        start,
        target: "footer",
        style: { utilities: ["pb-7"], customClasses: [] },
      },
    ],
  );
  assert.match(changed, /pb-7/);
});
test("committed conditional classes are recovered for independent section duplication", async () => {
  const code =
    'function Demo(){const id=(v:string)=>v;return <p data-editor-id={id("source.demo")} className="pb-2">Text</p>}';
  const changed = await patchSource(code, "apps/web/src/views/demo.tsx", [
    {
      start: code.indexOf("<p"),
      target: "source.demo",
      style: { utilities: ["pb-12"], customClasses: [] },
    },
  ]);
  assert.equal(
    authoredSourceEdits(changed, "apps/web/src/views/demo.tsx")[0].target,
    "source.demo",
  );
  assert.deepEqual(
    authoredSourceEdits(changed, "apps/web/src/views/demo.tsx")[0].style
      .utilities,
    ["pb-12"],
  );
});
