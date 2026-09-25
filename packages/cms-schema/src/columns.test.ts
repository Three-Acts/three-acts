import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canCreateRecords, isReadOnlyField, recordSourceFor } from "./columns";
import type { CmsCollection, CmsField } from "./types";

function collection(overrides: Partial<CmsCollection>): CmsCollection {
  return {
    id: "widgets",
    label: "Widgets",
    tableName: "widgets",
    fields: [],
    listColumns: [],
    ...overrides
  };
}

const textField: CmsField = { key: "name", label: "Name", type: "text" };

describe("recordSourceFor", () => {
  it("defaults to editors when mode and recordSource are both unset", () => {
    assert.equal(recordSourceFor(collection({})), "editors");
  });

  it("defaults to editors for an explicit editorial or data mode", () => {
    assert.equal(recordSourceFor(collection({ mode: "editorial" })), "editors");
    assert.equal(recordSourceFor(collection({ mode: "data" })), "editors");
  });

  it("honours an explicit recordSource", () => {
    assert.equal(recordSourceFor(collection({ recordSource: "site" })), "site");
    assert.equal(recordSourceFor(collection({ mode: "data", recordSource: "site" })), "site");
  });

  it("readonly mode is always site, even if recordSource says otherwise", () => {
    assert.equal(recordSourceFor(collection({ mode: "readonly" })), "site");
    assert.equal(recordSourceFor(collection({ mode: "readonly", recordSource: "editors" })), "site");
  });
});

describe("canCreateRecords", () => {
  it("is true for the editors default", () => {
    assert.equal(canCreateRecords(collection({})), true);
    assert.equal(canCreateRecords(collection({ mode: "data" })), true);
  });

  it("is false for recordSource: site", () => {
    assert.equal(canCreateRecords(collection({ recordSource: "site" })), false);
    assert.equal(canCreateRecords(collection({ mode: "data", recordSource: "site" })), false);
  });

  it("is false for readonly mode regardless of recordSource", () => {
    assert.equal(canCreateRecords(collection({ mode: "readonly" })), false);
    assert.equal(canCreateRecords(collection({ mode: "readonly", recordSource: "editors" })), false);
  });
});

describe("isReadOnlyField", () => {
  it("is false for an ordinary editable field", () => {
    assert.equal(isReadOnlyField(textField), false);
  });

  it("is true when readOnly is set", () => {
    assert.equal(isReadOnlyField({ ...textField, readOnly: true }), true);
  });

  it("is true for the readonly field type even without an explicit flag", () => {
    const field: CmsField = { key: "id", label: "ID", type: "readonly" };
    assert.equal(isReadOnlyField(field), true);
  });
});
