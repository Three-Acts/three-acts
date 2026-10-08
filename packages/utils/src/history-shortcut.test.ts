import assert from "node:assert/strict";
import test from "node:test";
import { historyShortcut } from "./history-shortcut";
const event = { key: "z", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
test("recognizes editor undo and redo across Mac and Windows/Linux modifiers", () => {
  assert.equal(historyShortcut({ ...event, metaKey: true }), "undo");
  assert.equal(historyShortcut({ ...event, ctrlKey: true }), "undo");
  assert.equal(historyShortcut({ ...event, metaKey: true, shiftKey: true }), "redo");
  assert.equal(historyShortcut({ ...event, ctrlKey: true, key: "Y" }), "redo");
});
test("does not consume plain, Alt-modified or unrelated keyboard actions", () => {
  assert.equal(historyShortcut(event), null);
  assert.equal(historyShortcut({ ...event, ctrlKey: true, altKey: true }), null);
  assert.equal(historyShortcut({ ...event, metaKey: true, key: "y" }), null);
  assert.equal(historyShortcut({ ...event, ctrlKey: true, key: "x" }), null);
});
