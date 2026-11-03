import test from "node:test";
import assert from "node:assert/strict";
import { mockCmsBackend } from "../src/cms/mock-adapter";
import { cloneSeedCollections } from "@three-acts/cms-schema/seed";
import { parseMultipleValue, parseObjectValue } from "@three-acts/cms-schema";

Object.defineProperty(globalThis, "window", { configurable: true, value: { setTimeout: globalThis.setTimeout.bind(globalThis) } });

test("mock editor backend preserves composed data, ordered video and reference identities", async () => {
  const values = cloneSeedCollections()["case-studies"][0].values;
  const created = await mockCmsBackend.data.createRecord("case-studies", { ...values, slug: "mock-portfolio" });
  const films = parseMultipleValue(created.values.films);
  const saved = await mockCmsBackend.data.saveRecord("case-studies", { ...created, values: { ...created.values, films: JSON.stringify([...films].reverse()) } });
  const reloaded = await mockCmsBackend.data.getRecord("case-studies", saved.id);
  assert.equal(reloaded.values.story, values.story);
  assert.deepEqual(parseMultipleValue(reloaded.values.films), [...films].reverse());
  assert.equal(parseObjectValue(reloaded.values.testimonial)?.id, "testimonial-nandi");
  await assert.rejects(mockCmsBackend.data.saveRecord("case-studies", { ...saved, values: { ...saved.values, client: "missing" } }), /missing/);
  await assert.rejects(mockCmsBackend.data.saveRecord("case-studies", { ...saved, values: { ...saved.values, services: '["service-film","service-film"]' } }), /duplicate/);
  const uploaded = await mockCmsBackend.storage.uploadAsset("case-studies", "testimonial.portrait", new File(["image"], "portrait.png", { type: "image/png" }));
  assert.equal(uploaded.fileName, "portrait.png");
});
