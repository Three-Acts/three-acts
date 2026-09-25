import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyTitleTemplate } from "./title-template.ts";

describe("applyTitleTemplate", () => {
  it("replaces %s with the page title", () => {
    assert.equal(applyTitleTemplate("%s | Three Acts", "About"), "About | Three Acts");
  });

  it("replaces only the first %s", () => {
    assert.equal(applyTitleTemplate("%s — %s", "About"), "About — %s");
  });

  it("ignores a template without %s", () => {
    assert.equal(applyTitleTemplate("Three Acts", "About"), "About");
    assert.equal(applyTitleTemplate("", "About"), "About");
    assert.equal(applyTitleTemplate(undefined, "About"), "About");
  });
});
