import assert from "node:assert/strict";
import test from "node:test";
import { CmsError, collectionRegistry, parseLinkValue, type CmsCollection } from "@three-acts/cms-schema";
import { MemoryBlobStore, MemoryDataStore } from "./memory-store";
import { setBlobStoreForTests, setDataStoreForTests } from "./resolve-store";
import { createRecord, getRecord, publishQueued, saveRecord, setPublishStatus, uploadAsset } from "./service";

const linkFixture: CmsCollection = {
  id: "link-contract-test",
  label: "Link contract test",
  tableName: "link_contract_test",
  fields: [
    {
      key: "destination",
      label: "Destination",
      type: "link",
      required: true,
      pages: [{ id: "about", label: "About", href: "/about" }]
    },
    { key: "externalFile", label: "External file", type: "link" },
    { key: "document", label: "Document", type: "link", bucket: "documents", accept: ".pdf,application/pdf" }
  ],
  listColumns: [{ key: "destination", label: "Destination" }]
};

test("CMS API validates and canonicalizes Link values and gates configured uploads", async (t) => {
  collectionRegistry.push(linkFixture);
  setDataStoreForTests(new MemoryDataStore());
  setBlobStoreForTests(new MemoryBlobStore());
  t.after(() => {
    collectionRegistry.splice(collectionRegistry.indexOf(linkFixture), 1);
    setDataStoreForTests(undefined);
    setBlobStoreForTests(undefined);
  });

  const created = await createRecord(linkFixture.id);
  const canonical = await saveRecord(linkFixture.id, created.id, {
    ...created,
    values: { ...created.values, destination: JSON.stringify({ type: "url", href: "example.com/path" }) }
  });
  assert.deepEqual(parseLinkValue(canonical.values.destination), { type: "url", href: "https://example.com/path" });

  const page = await saveRecord(linkFixture.id, created.id, {
    ...canonical,
    values: { ...canonical.values, destination: JSON.stringify({ type: "page", href: "https://untrusted.test", destinationId: "about" }) }
  });
  assert.deepEqual(parseLinkValue(page.values.destination), { type: "page", href: "/about", destinationId: "about" });

  await assert.rejects(
    saveRecord(linkFixture.id, created.id, {
      ...page,
      values: { ...page.values, destination: JSON.stringify({ type: "url", href: "javascript:alert(1)" }) }
    }),
    (error: unknown) => error instanceof CmsError && error.code === "validation"
  );
  await assert.rejects(
    saveRecord(linkFixture.id, created.id, { ...page, publishStatus: "queued_to_publish", values: { ...page.values, destination: "" } }),
    (error: unknown) => error instanceof CmsError && error.code === "validation" && /required/i.test(error.message)
  );

  const incomplete = await createRecord(linkFixture.id);
  await assert.rejects(
    setPublishStatus(linkFixture.id, [incomplete.id], "queued_to_publish"),
    (error: unknown) => error instanceof CmsError && error.code === "validation" && /required/i.test(error.message)
  );
  const [queued] = await setPublishStatus(linkFixture.id, [created.id], "queued_to_publish");
  assert.equal(queued.publishStatus, "queued_to_publish");
  assert.equal((await publishQueued(linkFixture.id)).published, 1);
  const published = await getRecord(linkFixture.id, created.id);
  assert.equal(published.publishStatus, "published");
  assert.deepEqual(published.liveValues, published.values);

  const upload = { fileName: "guide.pdf", contentType: "application/pdf", size: 1, data: "AQ==" };
  await assert.rejects(
    uploadAsset(linkFixture.id, "externalFile", upload),
    (error: unknown) => error instanceof CmsError && error.code === "not_found"
  );
  const uploaded = await uploadAsset(linkFixture.id, "document", upload);
  assert.equal(uploaded.fileName, "guide.pdf");
  assert.equal(uploaded.size, 1);
});
