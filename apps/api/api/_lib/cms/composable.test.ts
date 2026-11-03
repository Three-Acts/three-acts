import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectionRegistry, parseMultipleValue, parseObjectValue, resolveReferences, validateFieldValue, type CmsRecordValue } from "@three-acts/cms-schema";
import { cloneSeedCollections } from "@three-acts/cms-schema/seed";
import { MemoryDataStore, MemoryBlobStore } from "./memory-store";
import { FileDataStore } from "./file-store";
import { setDataStoreForTests, setBlobStoreForTests } from "./resolve-store";
import { createRecord, saveRecord, getRecord, setPublishStatus, publishQueued, uploadAsset } from "./service";

for (const backend of ["memory", "file"]) test(`${backend}: realistic portfolio preserves Markdown, media, composites and relationships`, async t => {
  const dir = await mkdtemp(join(tmpdir(), "cms-composable-"));
  const makeStore = () => backend === "file" ? new FileDataStore({ dir, loadSeed: cloneSeedCollections }) : new MemoryDataStore(cloneSeedCollections);
  setDataStoreForTests(makeStore()); setBlobStoreForTests(new MemoryBlobStore());
  t.after(async () => { setDataStoreForTests(undefined); setBlobStoreForTests(undefined); await rm(dir, { recursive: true, force: true }); });
  const original = cloneSeedCollections()["case-studies"][0];
  const created = await createRecord("case-studies", { ...original.values, slug: `copy-${backend}` });
  const films = parseMultipleValue(created.values.films);
  assert.equal(films.length, 2);
  const updated = await saveRecord("case-studies", created.id, { ...created, values: { ...created.values, films: JSON.stringify([...films].reverse()), services: JSON.stringify(["service-film", "service-strategy"]) } });
  if (backend === "file") setDataStoreForTests(makeStore()); // actual reload from a fresh persistence instance
  const reloaded = await getRecord("case-studies", created.id);
  assert.equal(reloaded.values.story, original.values.story);
  assert.deepEqual(reloaded.values, updated.values);
  assert.equal(parseObjectValue(reloaded.values.testimonial)?.id, "testimonial-nandi");
  const result = parseObjectValue(parseMultipleValue(reloaded.values.results)[0])!;
  assert.equal(result.id, "result-enquiries"); assert.equal(typeof result.values.value, "number");
  const resolved = await resolveReferences(parseMultipleValue(reloaded.values.services) as string[], id => getRecord("services", id));
  assert.deepEqual(resolved.map(item => item?.id), ["service-film", "service-strategy"]);
  const missing = await resolveReferences(["deleted"], async () => null); assert.deepEqual(missing, [null]);
  await assert.rejects(saveRecord("case-studies", created.id, { ...updated, values: { ...updated.values, client: "deleted" } }), /referenced record is missing/);
  await assert.rejects(saveRecord("case-studies", created.id, { ...updated, values: { ...updated.values, services: '["service-film","service-film"]' } }), /duplicate/);
  await assert.rejects(saveRecord("case-studies", created.id, { ...updated, values: { ...updated.values, films: '["bad"]' } }), /item 1/);
  const withoutFilm = await saveRecord("case-studies", created.id, { ...updated, values: { ...updated.values, films: JSON.stringify([films[0]]) } });
  assert.equal(parseMultipleValue(withoutFilm.values.films).length, 1);
  await setPublishStatus("case-studies", [created.id], "queued_to_publish");
  await publishQueued("case-studies");
  assert.deepEqual((await getRecord("case-studies", created.id)).liveValues, withoutFilm.values);
  const image = await uploadAsset("case-studies", "testimonial.portrait", { fileName: "nandi.png", contentType: "image/png", size: 1, data: "AQ==" });
  assert.equal(image.fileName, "nandi.png");
  for (const collection of collectionRegistry.filter(item => ["case-studies", "clients", "services"].includes(item.id))) {
    for (const record of cloneSeedCollections()[collection.id]) for (const field of collection.fields) validateFieldValue(field, record.values[field.key] as CmsRecordValue, true);
  }
});
