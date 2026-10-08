import assert from "node:assert/strict";
import test from "node:test";
import type { Drafts } from "../../src/components/designer/drafts";
import { createHistory, endHistoryGroup, recordHistory, redoHistory, undoHistory } from "../../src/components/designer/history";

const draft = (value: string) => ({ content: { title: value }, original: { title: "Source" }, sha: "a".repeat(40) });
test("undo/redo restores draft maps across documents and keeps their original source SHA", () => {
  const home: Drafts = { home: draft("Home") };
  const both: Drafts = { ...home, about: draft("About") };
  const history = recordHistory(recordHistory(createHistory(), home, { label: "Home" }), both, { label: "About" });
  const undone = undoHistory(history);
  assert.deepEqual(undone.present, home);
  assert.equal(undone.present.home.sha, "a".repeat(40));
  assert.deepEqual(redoHistory(undone).present, both);
  assert.deepEqual(undoHistory(undone).present, {});
});
test("typing groups only adjacent edits to the same field within the typing window", () => {
  let history = createHistory();
  for (const [at, value] of [[0, "H"], [100, "He"], [200, "Hello"]] as const) history = recordHistory(history, { home: draft(value) }, { label: "Text", group: "home:title", at });
  assert.equal(history.past.length, 1);
  assert.deepEqual(undoHistory(history).present, {});
  history = recordHistory(history, { home: draft("Hello!") }, { label: "Text", group: "home:title", at: 2000 });
  assert.equal(history.past.length, 2);
  history = recordHistory(history, { ...history.present, about: draft("About") }, { label: "Text", group: "about:title", at: 2100 });
  assert.equal(history.past.length, 3);
});
test("focus/commit boundaries and ungrouped design actions keep individual transactions", () => {
  let history = recordHistory(createHistory(), { home: draft("Text") }, { label: "Text", group: "home:title", at: 0 });
  history = recordHistory(endHistoryGroup(history), { home: draft("Next") }, { label: "Text", group: "home:title", at: 100 });
  history = recordHistory(history, { ...history.present, design: draft("Variant") }, { label: "Variant", at: 200 });
  assert.equal(history.past.length, 3);
  assert.deepEqual(undoHistory(history).present, { home: draft("Next") });
});
test("new edits after undo remove redo; no-op edits preserve it", () => {
  const history = recordHistory(createHistory(), { home: draft("One") }, { label: "Text" });
  const undone = undoHistory(history);
  assert.equal(recordHistory(undone, {}, { label: "No-op" }), undone);
  const next = recordHistory(undone, { home: draft("Different") }, { label: "Text" });
  assert.equal(next.future.length, 0);
  assert.deepEqual(redoHistory(next).present, next.present);
});
test("typing back to the initial value removes the empty transaction and draft", () => {
  const initial = recordHistory(createHistory(), { home: draft("Changed") }, { label: "Text", group: "home:title", at: 0 });
  const restored = recordHistory(initial, {}, { label: "Text", group: "home:title", at: 100 });
  assert.deepEqual(restored.present, {});
  assert.equal(restored.past.length, 0);
});
test("history bounds memory by transaction count and baseline replacement drops both stacks", () => {
  let history = createHistory();
  for (let i = 0; i < 150; i++) history = recordHistory(history, { home: draft(String(i)) }, { label: "Text" });
  assert.equal(history.past.length, 100);
  for (let i = 0; i < 100; i++) history = undoHistory(history);
  assert.equal(history.present.home.content.title, "49");
  const loaded = createHistory(history.present);
  assert.equal(loaded.past.length + loaded.future.length, 0);
  assert.deepEqual(loaded.present, history.present);
});
