import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkFormTypesMatchRegistry } from "./registry-check";

describe("checkFormTypesMatchRegistry", () => {
  it("matches @three-acts/forms's formTypes to the form-submissions collection's form select options", () => {
    // This assertion is the drift guard the spec asks for: it fails loudly
    // (with the message "registry form-submissions.form field missing")
    // while the registry still calls the field `source`, and starts passing
    // the moment the concurrent registry rename lands — see the package
    // report for the current status of that rename.
    const result = checkFormTypesMatchRegistry();
    assert.equal(result.ok, true, !result.ok ? result.reason : undefined);
  });
});
