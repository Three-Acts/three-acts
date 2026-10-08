import assert from "node:assert/strict";
import test from "node:test";
import { instrumentAstro, instrumentJsx } from "../scripts/editor-source.mjs";
import { editorElementProps } from "../src/lib/design";

test("source inference preserves caller props, original IDs and named parts without evaluating expressions twice", () => {
  const source = 'export const View = () => <div className="p-4" {...readProps()}><p>Hello</p><span data-editor-id="existing"/><span data-editor-part="label"/></div>';
  const result = instrumentJsx(source, "/web/src/view.tsx", "/web")!.code;
  assert.equal(result.match(/readProps\(\)/g)?.length, 1);
  assert.match(result, /"className": \("p-4"\)/);
  assert.match(result, /<p \{\.\.\.__threeActsElementProps/);
  assert.match(result, /<span data-editor-id="existing"\/>/);
  assert.match(result, /<span data-editor-part="label"\/>/);
  assert.deepEqual(editorElementProps("inferred", { "data-editor-id": "caller", className: "p-4", title: "Original" }), { "data-editor-id": "caller", "data-editor-base-class": "p-4", className: "p-4", title: "Original" });
});

test("Astro inference handles Unicode, class expressions, source spreads and hydration directives", async () => {
  const source = '---\nconst title = "é";\n---\n<div class="p-4">é<span class={title}>Hello</span><Image src="/a.png" alt="" client:load /></div>';
  const result = (await instrumentAstro(source, "/web/src/view.astro", "/web"))!.code;
  assert.match(result, /^---\nimport/);
  assert.match(result, />é<Fragment><span \{\.\.\.__threeActsElementProps/);
  assert.match(result, /"class": \(title\)/);
  assert.match(result, /<Image client:load/);
  assert.match(result, /"className"\)\} \/>/);
  assert.equal((await instrumentAstro(source, "/web/src/view.astro", "/web"))!.code, result);
});

test("source inference leaves scripts, head metadata, SVG internals and fragments untouched", async () => {
  const source = '<head><title>Title</title></head><svg><path/></svg><div class="p-4"/>';
  const result = (await instrumentAstro(source, "/web/src/view.astro", "/web"))!.code;
  assert.match(result, /<head><title>Title<\/title><\/head><svg><path\/><\/svg>/);
  assert.equal(result.match(/__threeActsElementProps\("auto\./g)?.length, 1);
  assert.equal(instrumentJsx('export const View=()=> <Fragment><svg><path/></svg></Fragment>', "/web/src/view.tsx", "/web"), null);
});


test("Astro keeps named slots static and normalizes class:list without losing conditions", async () => {
  const source = '<div><slot name="actions"><span>Fallback</span></slot><Image slot="cover" src="/a.jpg" /></div>';
  const result = (await instrumentAstro(source, "/web/src/slots.astro", "/web"))!.code;
  assert.match(result, /<slot name="actions">/);
  assert.match(result, /<Image slot="cover"/);
  assert.match(result, /<span \{\.\.\.__threeActsElementProps/);
  assert.equal(editorElementProps("classes", {class:["p-4", {"hidden":false, "flex":true}, ["gap-2"]]}, "class")["data-editor-base-class"], "p-4 flex gap-2");
});

test("unrelated source insertions keep inferred identities and adjacent wrappers remain valid JSX", async () => {
  const ts = await import("typescript");
  const source = 'export const View=()=> <div><h1>Heading</h1><p>Description</p></div>';
  const transformed = instrumentJsx(source, "/web/src/stable.tsx", "/web")!.code;
  const next = instrumentJsx('export const Other=()=> <section/>; '+source, "/web/src/stable.tsx", "/web")!.code;
  const ids = (value: string) => [...value.matchAll(/__threeActsElementProps\("(auto\.[^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids(next).slice(1), ids(transformed));
  const ast = ts.createSourceFile("view.tsx", transformed, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal((ast as unknown as {parseDiagnostics:unknown[]}).parseDiagnostics.length, 0);
});


test("Astro compiles inferred addition renderers as components and preserves nested ordering", async () => {
  const {transform}=await import("@astrojs/compiler");
  const source='---\nconst items=["Shop"];\n---\n<div>{items.map(x=><a href="/shop"><span>{x}</span></a>)}</div>';
  const code=(await instrumentAstro(source,"/web/src/nested.astro","/web"))!.code;
  const compiled=await transform(code);
  assert.match(compiled.code,/renderComponent\([^\n]+ThreeActsEditorAdditions/);
  assert.doesNotMatch(compiled.code,/&lt;ThreeActsEditorAdditions/);
  assert.ok(code.indexOf('position="after"') < code.indexOf('position="inside"',code.indexOf('position="after"')));
});
