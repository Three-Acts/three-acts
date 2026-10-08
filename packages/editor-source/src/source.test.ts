import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { parse } from "@astrojs/compiler";
import { patchSource, sourceSha } from "./node.mjs";
import { validateSourceContent, sourcePath } from "./index";
const style = { utilities: ["pb-[24px]"], customClasses: [] };
test("source edits replace literal classes and preserve all existing inferred identities", async () => {
  const original =
    'export function Demo(){return <div className="p-4"><p className="pb-2 text-ink">Hello</p></div>}';
  const changed = await patchSource(original, "apps/web/src/views/demo.tsx", [
    { start: original.indexOf("<p"), style, target: "source.paragraph" },
  ]);
  assert.match(changed, /p-4/);
  assert.match(changed, /pb-\[24px\]/);
  assert.doesNotMatch(changed, /pb-2/);
  assert.equal((changed.match(/data-editor-id=/g) ?? []).length, 2);
  assert.equal(
    ts.createSourceFile(
      "demo.tsx",
      changed,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ).parseDiagnostics.length,
    0,
  );
});
test("Astro edits use one baseline, handle unicode and normalize class:list once", async () => {
  const original =
    '---\nconst active=true;\n---\n<div>☕<p class:list={["pb-2", { "font-bold": active }]}>One</p><p class="pb-4">Two</p></div>';
  const changed = await patchSource(original, "apps/web/src/pages/demo.astro", [
    { start: original.indexOf("<p"), style, target: "one" },
    {
      start: original.indexOf('<p class="'),
      style: { utilities: ["pb-[50px]"], customClasses: [] },
      target: "two",
    },
  ]);
  assert.match(changed, /__threeActsSourceClsx/);
  assert.match(changed, /class=\{__threeActsSourceClass/);
  assert.match(changed, /pb-\[50px\]/);
  assert.equal((changed.match(/data-editor-id=/g) ?? []).length, 3);
  await parse(changed);
});
test("dynamic JSX preserves conditional expressions and emits safe expression strings", async () => {
  const original =
    'const Demo=()=> <p className={enabled ? "pb-2" : "pb-4"}>Text</p>';
  const changed = await patchSource(original, "apps/web/src/views/demo.tsx", [
    { start: original.indexOf("<p"), style, target: "demo" },
  ]);
  assert.match(
    changed,
    /__threeActsSourceClass\(enabled \? "pb-2" : "pb-4", "pb-\[24px\]"\)/,
  );
  assert.equal(
    ts.createSourceFile(
      "demo.tsx",
      changed,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ).parseDiagnostics.length,
    0,
  );
});
test("rejects stale selectors, arbitrary paths, duplicate operations and overriding spreads", async () => {
  assert.throws(() => sourcePath("apps/web/src/../../api/file.tsx"));
  assert.throws(() =>
    validateSourceContent({
      code: "",
      edits: [
        { start: 1, style, target: "demo" },
        { start: 1, style, target: "demo" },
      ],
    }),
  );
  await assert.rejects(
    patchSource("<p/>", "apps/web/src/views/demo.tsx", [
      { start: 2, style, target: "demo" },
    ]),
    /changed/,
  );
  await assert.rejects(
    patchSource(
      '<p className="pb-2" {...props}/>',
      "apps/web/src/views/demo.tsx",
      [{ start: 0, style, target: "demo" }],
    ),
    /forwards/,
  );
  assert.equal(sourceSha("Hello").length, 40);
});
test("repeated composition nodes keep independent styles as actual conditional source classes", async () => {
  const original =
    'function Demo(){const id=(v:string)=>v;return <p data-editor-id={id("source.demo")} className="pb-2">Text</p>}';
  const changed = await patchSource(original, "apps/web/src/views/demo.tsx", [
    { start: original.indexOf("<p"), style, target: "source.demo" },
    {
      start: original.indexOf("<p"),
      style: { utilities: ["pb-[48px]"], customClasses: [] },
      target: "section-1.demo",
    },
  ]);
  assert.match(changed, /=== "source.demo"/);
  assert.match(changed, /=== "section-1.demo"/);
  assert.match(changed, /pb-\[48px\]/);
  assert.equal(
    ts.createSourceFile(
      "demo.tsx",
      changed,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ).parseDiagnostics.length,
    0,
  );
});
