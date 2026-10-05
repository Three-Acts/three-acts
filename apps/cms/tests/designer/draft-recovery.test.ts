import assert from "node:assert/strict";
import test from "node:test";
import { contentDefinitions } from "@three-acts/static-content";
import { readDrafts, type Draft } from "../../src/components/designer/drafts";

test("recovers an invalid page draft without losing valid drafts on later reads", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key: string) { return values.get(key) ?? null; },
      setItem(key: string, value: string) { values.set(key, value); }
    }
  });

  const home = structuredClone(contentDefinitions.find((item) => item.id === "home")!.content);
  const original = structuredClone(home);
  (home.hero_section as Record<string, unknown>).display_1 = "Updated home title";
  const valid: Draft = { content: home, original, sha: "a".repeat(40) };
  const invalid: Draft = { content: {}, original: {}, sha: "b".repeat(40) };
  const key = "three-acts:editor:drafts:test";
  const raw = JSON.stringify({ home: valid, about: invalid });
  values.set(key, raw);

  const firstRead = readDrafts(key);
  assert.equal(firstRead.drafts.home.content.hero_section && (firstRead.drafts.home.content.hero_section as Record<string, unknown>).display_1, "Updated home title");
  assert.equal(firstRead.recovery, raw);
  assert.equal(values.get(`${key}:recovery`), raw);

  const secondRead = readDrafts(key);
  assert.deepEqual(secondRead.drafts, firstRead.drafts);
  assert.equal(secondRead.recovery, raw);
  assert.equal(values.get(`${key}:recovery`), raw);
});
