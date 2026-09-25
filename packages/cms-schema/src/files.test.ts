import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fileSrc,
  parseFileValue,
  parseVideoValue,
  serializeFileValue,
  serializeVideoValue,
  videoSrc,
  type FileValue,
  type VideoValue
} from "./files.ts";

describe("parseVideoValue", () => {
  it("returns null for empty values", () => {
    assert.equal(parseVideoValue(""), null);
    assert.equal(parseVideoValue(null), null);
    assert.equal(parseVideoValue(undefined), null);
    assert.equal(parseVideoValue("   "), null);
  });

  it("tolerates a legacy plain URL string", () => {
    assert.deepEqual(parseVideoValue("/mock-storage/cms-assets/product_catalog/demo-001.mp4"), {
      src: "/mock-storage/cms-assets/product_catalog/demo-001.mp4"
    });
  });

  it("parses the canonical JSON object string", () => {
    const stored = JSON.stringify({
      src: "https://cdn.test/demo.mp4",
      fileName: "demo.mp4",
      size: 2400000,
      contentType: "video/mp4"
    });
    assert.deepEqual(parseVideoValue(stored), {
      src: "https://cdn.test/demo.mp4",
      fileName: "demo.mp4",
      size: 2400000,
      contentType: "video/mp4"
    });
  });

  it("drops unusable metadata but keeps the src", () => {
    assert.deepEqual(parseVideoValue(JSON.stringify({ src: "https://cdn.test/demo.mp4", size: -4, contentType: "not-a-type" })), {
      src: "https://cdn.test/demo.mp4"
    });
  });

  it("returns null when there is no usable src", () => {
    assert.equal(parseVideoValue(JSON.stringify({ fileName: "demo.mp4" })), null);
    assert.equal(parseVideoValue(JSON.stringify({ src: "  " })), null);
    assert.equal(parseVideoValue(42), null);
  });
});

describe("serializeVideoValue", () => {
  it("round-trips through parse", () => {
    const value: VideoValue = { src: "https://cdn.test/demo.mp4", fileName: "demo.mp4", size: 100, contentType: "video/mp4" };
    assert.deepEqual(parseVideoValue(serializeVideoValue(value)), value);
  });

  it("serializes empty values as an empty string", () => {
    assert.equal(serializeVideoValue(null), "");
    assert.equal(serializeVideoValue(undefined), "");
    assert.equal(serializeVideoValue({ src: "  " }), "");
  });
});

describe("parseFileValue", () => {
  it("returns null for empty values", () => {
    assert.equal(parseFileValue(""), null);
    assert.equal(parseFileValue(null), null);
    assert.equal(parseFileValue(undefined), null);
    assert.equal(parseFileValue("   "), null);
  });

  it("tolerates a legacy plain URL string", () => {
    assert.deepEqual(parseFileValue("/mock-storage/cms-documents/product_catalog/spec-sheet-001.pdf"), {
      src: "/mock-storage/cms-documents/product_catalog/spec-sheet-001.pdf"
    });
  });

  it("parses the canonical JSON object string", () => {
    const stored = JSON.stringify({
      src: "https://cdn.test/spec.pdf",
      fileName: "spec.pdf",
      size: 64000,
      contentType: "application/pdf"
    });
    assert.deepEqual(parseFileValue(stored), {
      src: "https://cdn.test/spec.pdf",
      fileName: "spec.pdf",
      size: 64000,
      contentType: "application/pdf"
    });
  });

  it("returns null when there is no usable src", () => {
    assert.equal(parseFileValue(JSON.stringify({ fileName: "spec.pdf" })), null);
    assert.equal(parseFileValue(42), null);
  });
});

describe("serializeFileValue", () => {
  it("round-trips through parse", () => {
    const value: FileValue = { src: "https://cdn.test/spec.pdf", fileName: "spec.pdf", size: 100, contentType: "application/pdf" };
    assert.deepEqual(parseFileValue(serializeFileValue(value)), value);
  });

  it("serializes empty values as an empty string", () => {
    assert.equal(serializeFileValue(null), "");
    assert.equal(serializeFileValue(undefined), "");
    assert.equal(serializeFileValue({ src: "  " }), "");
  });
});

describe("videoSrc / fileSrc", () => {
  it("extracts src from typed and legacy values", () => {
    assert.equal(videoSrc(JSON.stringify({ src: "https://cdn.test/demo.mp4" })), "https://cdn.test/demo.mp4");
    assert.equal(videoSrc("https://cdn.test/demo.mp4"), "https://cdn.test/demo.mp4");
    assert.equal(videoSrc(""), "");
    assert.equal(fileSrc(JSON.stringify({ src: "https://cdn.test/spec.pdf" })), "https://cdn.test/spec.pdf");
    assert.equal(fileSrc("https://cdn.test/spec.pdf"), "https://cdn.test/spec.pdf");
    assert.equal(fileSrc(null), "");
  });
});
