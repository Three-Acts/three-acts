import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statusDotVariants, statusTextVariants } from "../src/components/atoms/styles.ts";

describe("publish status styles", () => {
  it("renders drafts with the shared solid orange treatment", () => {
    const dotClasses = statusDotVariants({ status: "draft" });
    const textClasses = statusTextVariants({ status: "draft" });

    assert.match(dotClasses, /\bborder-solid\b/);
    assert.match(dotClasses, /\bborder-cms-draft\b/);
    assert.match(textClasses, /\btext-cms-draft\b/);
  });
});
