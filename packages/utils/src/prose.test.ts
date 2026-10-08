import assert from "node:assert/strict";
import test from "node:test";
import { parseProse, proseRuns } from "./prose";

test("body source preserves paragraph breaks, soft lines, headings and consecutive lists", () => {
  assert.deepEqual(parseProse("First\nsecond\n\n## Heading\n- one\n- two\nNext\n\n- three"), [
    { type: "p", lines: ["First", "second"] }, { type: "h2", text: "Heading" },
    { type: "ul", items: ["one", "two"] }, { type: "p", lines: ["Next"] }, { type: "ul", items: ["three"] },
  ]);
});
test("body source leaves markup and unsafe schemes literal while exposing supported links", () => {
  const text = '<img src=x onerror=alert(1)> javascript:alert(1) /shop/app https://example.com/path';
  const runs = proseRuns(text);
  assert.deepEqual(runs.filter(run => run.href).map(run => run.href), ["/shop/app", "https://example.com/path"]);
  assert.equal(runs.map(run => run.text).join(""), text);
});
