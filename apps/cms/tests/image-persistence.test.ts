import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mockCmsBackend } from "../src/cms/mock-adapter.ts";
import { moveImageItem, parseImageGallery, parseImageValue, serializeImageGallery, serializeImageValue } from "../src/cms/types.ts";

// The mock adapter intentionally models browser latency through window.setTimeout.
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { setTimeout: globalThis.setTimeout.bind(globalThis) }
});

describe("image field persistence", () => {
  it("saves and reloads single-image metadata and alt text", async () => {
    const original = await mockCmsBackend.data.getRecord("articles", "article-registry-source-of-truth");
    const image = {
      src: "/mock-storage/cms-assets/articles/campaign-cover.png",
      fileName: "campaign-cover.png",
      size: 248320,
      width: 1600,
      height: 900,
      alt: "Campaign team at the workshop"
    };

    const saved = await mockCmsBackend.data.saveRecord(
      "articles",
      { ...original, values: { ...original.values, coverImage: serializeImageValue(image) } },
      { expectedModifiedAt: original.modifiedAt }
    );
    const reloaded = await mockCmsBackend.data.getRecord("articles", saved.id);

    assert.deepEqual(parseImageValue(reloaded.values.coverImage), image);
  });

  it("preserves gallery add, remove, reorder, and metadata across reload", async () => {
    const original = await mockCmsBackend.data.getRecord("products", "product-web-app");
    const initial = [
      { src: "/mock-storage/a.jpg", fileName: "a.jpg", width: 1200, height: 800, size: 1000, alt: "A" },
      { src: "/mock-storage/b.jpg", fileName: "b.jpg", width: 1200, height: 800, size: 2000, alt: "B" }
    ];
    const added = [...initial, { src: "/mock-storage/c.jpg", fileName: "c.jpg", size: 3000, alt: "C" }];
    const removed = added.filter((item) => item.src !== "/mock-storage/b.jpg");
    const reordered = moveImageItem(removed, 1, 0);

    const saved = await mockCmsBackend.data.saveRecord(
      "products",
      { ...original, values: { ...original.values, images: serializeImageGallery(reordered) } },
      { expectedModifiedAt: original.modifiedAt }
    );
    const reloaded = await mockCmsBackend.data.getRecord("products", saved.id);

    assert.deepEqual(parseImageGallery(reloaded.values.images), reordered);
    assert.deepEqual(parseImageGallery(reloaded.values.images).map((item) => item.src), ["/mock-storage/c.jpg", "/mock-storage/a.jpg"]);
  });
});
