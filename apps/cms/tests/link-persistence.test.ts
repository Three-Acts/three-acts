import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectionRegistry, parseLinkValue, type CmsCollection } from "@three-acts/cms-schema";
import { mockCmsBackend } from "../src/cms/mock-adapter.ts";

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { setTimeout: globalThis.setTimeout.bind(globalThis) }
});

const linkFixture: CmsCollection = {
  id: "mock-link-contract-test",
  label: "Mock link contract test",
  tableName: "mock_link_contract_test",
  fields: [
    { key: "destination", label: "Destination", type: "link", required: true, pages: [{ id: "about", label: "About", href: "/about" }] },
    { key: "externalFile", label: "External file", type: "link" },
    { key: "document", label: "Document", type: "link", bucket: "documents", accept: ".pdf,application/pdf" }
  ],
  listColumns: [{ key: "destination", label: "Destination" }]
};

describe("mock Link field persistence", () => {
  it("validates and canonicalizes link saves and gates configured uploads", async () => {
    collectionRegistry.push(linkFixture);
    try {
      const created = await mockCmsBackend.data.createRecord(linkFixture.id);
      const canonical = await mockCmsBackend.data.saveRecord(linkFixture.id, {
        ...created,
        values: { ...created.values, destination: JSON.stringify({ type: "url", href: "example.com/path" }) }
      });
      assert.deepEqual(parseLinkValue(canonical.values.destination), { type: "url", href: "https://example.com/path" });

      await assert.rejects(
        mockCmsBackend.data.saveRecord(linkFixture.id, {
          ...canonical,
          values: { ...canonical.values, destination: JSON.stringify({ type: "url", href: "javascript:alert(1)" }) }
        }),
        /http\(s\) URL/i
      );

      const incomplete = await mockCmsBackend.data.createRecord(linkFixture.id);
      await assert.rejects(
        mockCmsBackend.data.setPublishStatus(linkFixture.id, [incomplete.id], "queued_to_publish"),
        /required/i
      );
      const unchanged = await mockCmsBackend.data.getRecord(linkFixture.id, incomplete.id);
      assert.equal(unchanged.publishStatus, "not_published");
      assert.equal(unchanged.values.destination, "");

      const [queued] = await mockCmsBackend.data.setPublishStatus(linkFixture.id, [canonical.id], "queued_to_publish");
      assert.equal(queued.publishStatus, "queued_to_publish");
      assert.equal((await mockCmsBackend.data.publishQueued(linkFixture.id)).published, 1);
      const published = await mockCmsBackend.data.getRecord(linkFixture.id, canonical.id);
      assert.equal(published.publishStatus, "published");
      assert.deepEqual(published.liveValues, published.values);

      const makeFile = (name: string, type: string) => new File([new Uint8Array([1])], name, { type });
      await assert.rejects(() => mockCmsBackend.storage.uploadAsset(linkFixture.id, "externalFile", makeFile("guide.pdf", "application/pdf")), /not an asset field/i);
      const uploaded = await mockCmsBackend.storage.uploadAsset(linkFixture.id, "document", makeFile("guide.pdf", "application/pdf"));
      assert.equal(uploaded.fileName, "guide.pdf");
      await assert.rejects(() => mockCmsBackend.storage.uploadAsset(linkFixture.id, "document", makeFile("guide.exe", "application/octet-stream")), /does not accept/i);
    } finally {
      collectionRegistry.splice(collectionRegistry.indexOf(linkFixture), 1);
    }
  });
});
