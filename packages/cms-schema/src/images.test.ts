import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  imageSrc,
  moveImageItem,
  parseImageGallery,
  parseImageValue,
  serializeImageGallery,
  serializeImageValue,
  type ImageValue
} from "./images.ts";

describe("parseImageValue", () => {
  it("returns null for empty values", () => {
    assert.equal(parseImageValue(""), null);
    assert.equal(parseImageValue(null), null);
    assert.equal(parseImageValue(undefined), null);
    assert.equal(parseImageValue("   "), null);
  });

  it("tolerates a legacy plain URL string", () => {
    assert.deepEqual(parseImageValue("/mock-storage/cms-assets/posts/cover-001.png"), {
      src: "/mock-storage/cms-assets/posts/cover-001.png"
    });
  });

  it("parses the canonical JSON object string", () => {
    const stored = JSON.stringify({
      src: "https://cdn.test/a.png",
      fileName: "a.png",
      size: 1200,
      width: 800,
      height: 600,
      alt: "A photo"
    });
    assert.deepEqual(parseImageValue(stored), {
      src: "https://cdn.test/a.png",
      fileName: "a.png",
      size: 1200,
      width: 800,
      height: 600,
      alt: "A photo"
    });
  });

  it("drops unusable numeric metadata but keeps the src", () => {
    assert.deepEqual(parseImageValue(JSON.stringify({ src: "https://cdn.test/a.png", width: -4, size: Number.NaN })), {
      src: "https://cdn.test/a.png"
    });
  });

  it("returns null when there is no usable src", () => {
    assert.equal(parseImageValue(JSON.stringify({ fileName: "a.png" })), null);
    assert.equal(parseImageValue(JSON.stringify({ src: "  " })), null);
    assert.equal(parseImageValue(42), null);
  });
});

describe("serializeImageValue", () => {
  it("round-trips through parse", () => {
    const value: ImageValue = { src: "https://cdn.test/a.png", fileName: "a.png", width: 800, height: 600, alt: "A" };
    assert.deepEqual(parseImageValue(serializeImageValue(value)), value);
  });

  it("serializes empty values as an empty string", () => {
    assert.equal(serializeImageValue(null), "");
    assert.equal(serializeImageValue(undefined), "");
    assert.equal(serializeImageValue({ src: "  " }), "");
  });
});

describe("parseImageGallery / serializeImageGallery", () => {
  it("returns [] for empty values", () => {
    assert.deepEqual(parseImageGallery(""), []);
    assert.deepEqual(parseImageGallery(null), []);
    assert.deepEqual(parseImageGallery(undefined), []);
    assert.deepEqual(parseImageGallery("[]"), []);
  });

  it("parses a JSON array string and drops entries without src", () => {
    const stored = JSON.stringify([{ src: "https://cdn.test/a.png", alt: "A" }, { fileName: "nope.png" }, "https://cdn.test/b.png"]);
    assert.deepEqual(parseImageGallery(stored), [{ src: "https://cdn.test/a.png", alt: "A" }, { src: "https://cdn.test/b.png" }]);
  });

  it("rejects a non-JSON gallery value", () => {
    assert.deepEqual(parseImageGallery("https://cdn.test/a.png"), []);
  });

  it("accepts a live array (import/draft paths)", () => {
    assert.deepEqual(parseImageGallery([{ src: "https://cdn.test/a.png" }]), [{ src: "https://cdn.test/a.png" }]);
  });

  it("round-trips and serializes empties as []", () => {
    const items: ImageValue[] = [
      { src: "https://cdn.test/a.png", width: 100, height: 100 },
      { src: "https://cdn.test/b.png", alt: "B" }
    ];
    assert.deepEqual(parseImageGallery(serializeImageGallery(items)), items);
    assert.equal(serializeImageGallery([]), "[]");
  });
});

describe("moveImageItem", () => {
  const items: ImageValue[] = [{ src: "a" }, { src: "b" }, { src: "c" }];

  it("moves an item and returns a new array", () => {
    const next = moveImageItem(items, 0, 2);
    assert.deepEqual(next.map((item) => item.src), ["b", "c", "a"]);
    assert.deepEqual(items.map((item) => item.src), ["a", "b", "c"]);
  });

  it("clamps the target into range and ignores out-of-range sources", () => {
    assert.deepEqual(moveImageItem(items, 2, 99).map((item) => item.src), ["a", "b", "c"]);
    assert.deepEqual(moveImageItem(items, -1, 0).map((item) => item.src), ["a", "b", "c"]);
    assert.deepEqual(moveImageItem(items, 0, -99).map((item) => item.src), ["a", "b", "c"]);
  });
});

describe("imageSrc", () => {
  it("extracts src from typed and legacy values", () => {
    assert.equal(imageSrc(JSON.stringify({ src: "https://cdn.test/a.png", alt: "A" })), "https://cdn.test/a.png");
    assert.equal(imageSrc("https://cdn.test/a.png"), "https://cdn.test/a.png");
    assert.equal(imageSrc(""), "");
    assert.equal(imageSrc(null), "");
  });
});
