import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mockCmsBackend } from "../src/cms/mock-adapter.ts";
import { parseFileValue, parseVideoValue, serializeFileValue, serializeVideoValue } from "../src/cms/types.ts";

// The mock adapter intentionally models browser latency through window.setTimeout.
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { setTimeout: globalThis.setTimeout.bind(globalThis) }
});

function makeFile(name: string, type: string, size = 12): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("file/video field persistence", () => {
  it("saves and reloads typed file and video metadata", async () => {
    const original = await mockCmsBackend.data.getRecord("product-catalog", "pro-0001");
    const specSheet = {
      src: "/mock-storage/cms-documents/product_catalog/spec-sheet-001.pdf",
      fileName: "spec-sheet-001.pdf",
      size: 64200,
      contentType: "application/pdf"
    };
    const demoVideo = {
      src: "/mock-storage/cms-assets/product_catalog/demo-001.mp4",
      fileName: "demo-001.mp4",
      size: 2450000,
      contentType: "video/mp4"
    };

    const saved = await mockCmsBackend.data.saveRecord(
      "product-catalog",
      {
        ...original,
        values: {
          ...original.values,
          specSheet: serializeFileValue(specSheet),
          demoVideo: serializeVideoValue(demoVideo)
        }
      },
      { expectedModifiedAt: original.modifiedAt }
    );
    const reloaded = await mockCmsBackend.data.getRecord("product-catalog", saved.id);

    assert.deepEqual(parseFileValue(reloaded.values.specSheet), specSheet);
    assert.deepEqual(parseVideoValue(reloaded.values.demoVideo), demoVideo);
  });

  it("clears file/video values and keeps them empty across reload", async () => {
    const original = await mockCmsBackend.data.getRecord("product-catalog", "pro-0002");

    const saved = await mockCmsBackend.data.saveRecord(
      "product-catalog",
      { ...original, values: { ...original.values, specSheet: "", demoVideo: "" } },
      { expectedModifiedAt: original.modifiedAt }
    );
    const reloaded = await mockCmsBackend.data.getRecord("product-catalog", saved.id);

    assert.equal(parseFileValue(reloaded.values.specSheet), null);
    assert.equal(parseVideoValue(reloaded.values.demoVideo), null);
  });

  it("rejects values without a usable src as empty", () => {
    assert.equal(parseFileValue(JSON.stringify({ fileName: "spec.pdf" })), null);
    assert.equal(parseVideoValue(JSON.stringify({ fileName: "demo.mp4" })), null);
    assert.equal(serializeFileValue(null), "");
    assert.equal(serializeVideoValue(undefined), "");
  });

  it("rejects invalid upload types on typed fields", async () => {
    await assert.rejects(() => mockCmsBackend.storage.uploadAsset("product-catalog", "demoVideo", makeFile("photo.png", "image/png")), /only accepts videos/);
    await assert.rejects(
      () => mockCmsBackend.storage.uploadAsset("product-catalog", "demoVideo", makeFile("notes.txt", "text/plain")),
      /only accepts videos/
    );
  });

  it("accepts uploads on the typed file field and preserves name/size", async () => {
    const result = await mockCmsBackend.storage.uploadAsset("product-catalog", "specSheet", makeFile("spec-sheet.pdf", "application/pdf", 24));
    assert.equal(result.fileName, "spec-sheet.pdf");
    assert.equal(result.size, 24);
  });

  it("rejects file extensions outside the field accept contract", async () => {
    await assert.rejects(
      () => mockCmsBackend.storage.uploadAsset("product-catalog", "specSheet", makeFile("notes.txt", "text/plain")),
      /does not accept this file type/
    );
  });
});
