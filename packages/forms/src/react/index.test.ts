import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapApiErrorMessage } from "./index";

// `useFormSubmission` itself is thin glue over `validateSubmission` (tested
// thoroughly in ../validate.test.ts) and `apiFetch`; it isn't unit-tested
// here since that would require a React test renderer this package doesn't
// otherwise need. `mapApiErrorMessage` is the one piece of real logic the
// hook adds, and it's a pure function, so it's covered directly.
describe("mapApiErrorMessage", () => {
  it("maps a message starting with a known field name onto that field", () => {
    assert.deepEqual(mapApiErrorMessage("email must be a valid email address."), {
      email: "email must be a valid email address."
    });
    assert.deepEqual(mapApiErrorMessage("message must be between 1 and 5000 characters."), {
      message: "message must be between 1 and 5000 characters."
    });
    assert.deepEqual(mapApiErrorMessage("name is required."), { name: "name is required." });
    assert.deepEqual(mapApiErrorMessage("company must be 200 characters or fewer."), {
      company: "company must be 200 characters or fewer."
    });
    assert.deepEqual(mapApiErrorMessage("phone must be 40 characters or fewer."), {
      phone: "phone must be 40 characters or fewer."
    });
    assert.deepEqual(mapApiErrorMessage("form must be one of contact, newsletter, inquiry."), {
      form: "form must be one of contact, newsletter, inquiry."
    });
  });

  it("falls back to a form-level error for an unrecognized message", () => {
    assert.deepEqual(mapApiErrorMessage("Something went sideways."), { form: "Something went sideways." });
  });
});
