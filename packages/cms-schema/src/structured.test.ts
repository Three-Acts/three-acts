import test from "node:test";
import assert from "node:assert/strict";
import { validateFieldValue } from "./validation";
import { moveValue, parseMultipleValue, parseObjectValue, preserveReadOnlyChildren, resolveFieldPath } from "./structured";
import { studioCollections } from "./studio";
import { sqlColumnType, constraintSql } from "../../../apps/api/scripts/schema/sql";
import { snapshotOf, diffSnapshots } from "../../../apps/api/scripts/schema/diff";
import type { CmsField } from "./types";

test("multiple text, number, boolean and selectors reuse primitive normalization", () => {
  const cases: Array<[CmsField, unknown[], unknown[]]> = [
    [{ key: "x", label: "Names", type: "text", cardinality: "multiple" }, ["Ada", "Bo"], ["Ada", "Bo"]],
    [{ key: "x", label: "Scores", type: "number", cardinality: "multiple" }, ["3", 2], [3, 2]],
    [{ key: "x", label: "Flags", type: "boolean", cardinality: "multiple" }, [true, false], [true, false]],
    [{ key: "x", label: "Sector", type: "select", cardinality: "multiple", options: [{ label: "A", value: "a" }] }, ["a"], ["a"]]
  ];
  for (const [field, values, expected] of cases) assert.deepEqual(parseMultipleValue(validateFieldValue(field, JSON.stringify(values), true)), expected);
  assert.throws(() => validateFieldValue(cases[1][0], '["bad"]', false), /item 1/);
  assert.throws(() => validateFieldValue(cases[2][0], '["true"]', false), /item 1/);
  assert.throws(() => validateFieldValue(cases[3][0], '["bad"]', false), /item 1/);
  assert.throws(() => parseMultipleValue('{"x":1}'), /array/);
  assert.throws(() => parseMultipleValue('[{}]'), /array/);
});

test("nested validation keeps child types, stable identities and precise child errors", () => {
  const field: CmsField = { key: "results", label: "Results", type: "object", cardinality: "multiple", fields: [{ key: "score", label: "Score", type: "number", required: true }, { key: "link", label: "Website", type: "link" }] };
  const raw = JSON.stringify([JSON.stringify({ id: "a", values: { score: "12", link: "example.com" } })]);
  const result = parseObjectValue(parseMultipleValue(validateFieldValue(field, raw, true))[0])!;
  assert.equal(result.id, "a"); assert.equal(result.values.score, 12);
  assert.match(String(result.values.link), /https:\/\/example.com/);
  assert.throws(() => validateFieldValue(field, JSON.stringify([JSON.stringify({ id: "a", values: { score: "bad" } })]), true), /item 1: Score/);
  assert.throws(() => validateFieldValue(field, JSON.stringify([JSON.stringify({ id: "a", values: { score: 1, link: "javascript:alert(1)" } })]), false), /item 1/);
  assert.throws(() => validateFieldValue(field, JSON.stringify([JSON.stringify({ id: "a", values: {} })]), true), /required/);
  assert.throws(() => validateFieldValue(field, JSON.stringify([...JSON.parse(raw), ...JSON.parse(raw)]), false), /identities/);
  assert.equal(resolveFieldPath(studioCollections[2].fields, "testimonial.portrait")?.type, "image");
});

test("ordered lists add, remove and reorder without mutation; limits gate publishing", () => {
  const list = ["launch", "detail", "credits"];
  assert.deepEqual(moveValue(list, 2, 0), ["credits", "launch", "detail"]);
  assert.deepEqual(list, ["launch", "detail", "credits"]);
  const field: CmsField = { key: "x", label: "Films", type: "video", cardinality: "multiple", minItems: 1, maxItems: 2, required: true };
  assert.throws(() => validateFieldValue(field, "[]", true), /count/);
  assert.equal(validateFieldValue(field, "[]", false), "[]");
  assert.throws(() => validateFieldValue(field, '["not media"]', false), /item 1/);
});

test("multiple numeric/boolean/select fields use text SQL; cardinality changes require explicit migration", () => {
  const collection = { ...studioCollections[1], fields: [{ key: "score", label: "Score", type: "number" as const }] };
  const next = { ...collection, fields: [{ ...collection.fields[0], cardinality: "multiple" as const }] };
  assert.equal(sqlColumnType(next.fields[0]), "text");
  const select = { ...collection, fields: [{ key: "choices", label: "Choices", type: "select" as const, cardinality: "multiple" as const, options: [{ label: "A", value: "a" }] }] };
  assert.doesNotMatch(constraintSql(select), /choices.*in \(/);
  const diff = diffSnapshots(snapshotOf([collection]), snapshotOf([next]));
  assert.match(JSON.stringify(diff), /cardinality changed/);
});


test("protected children follow stable object identity when editors reorder items", () => {
  const field: CmsField = { key: "entries", label: "Entries", type: "object", cardinality: "multiple", fields: [{ key: "private", label: "System value", type: "number", readOnly: true }, { key: "name", label: "Name", type: "text" }] };
  const old = JSON.stringify([JSON.stringify({ id: "a", values: { private: 10, name: "A" } }), JSON.stringify({ id: "b", values: { private: 20, name: "B" } })]);
  const incoming = JSON.stringify([JSON.stringify({ id: "b", values: { private: 999, name: "Edited B" } }), JSON.stringify({ id: "a", values: { private: 999, name: "A" } })]);
  const protectedItems = parseMultipleValue(preserveReadOnlyChildren(field, incoming, old)).map(parseObjectValue);
  assert.equal(protectedItems[0]?.values.private, 20);
  assert.equal(protectedItems[0]?.values.name, "Edited B");
  assert.equal(protectedItems[1]?.values.private, 10);
});
