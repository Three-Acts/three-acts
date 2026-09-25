import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isHoneypotTripped, MAX_COMPANY_LENGTH, MAX_EMAIL_LENGTH, MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH, MAX_PHONE_LENGTH, validateSubmission } from "./validate";

function ok(input: unknown) {
  const result = validateSubmission(input);
  assert.equal(result.ok, true, result.ok ? undefined : `expected ok, got errors: ${JSON.stringify(result.errors)}`);
  return result.ok ? result.value : (undefined as never);
}

function fails(input: unknown, field: string) {
  const result = validateSubmission(input);
  assert.equal(result.ok, false, "expected validation to fail");
  if (!result.ok) {
    assert.ok(field in result.errors, `expected an error on "${field}", got: ${JSON.stringify(result.errors)}`);
  }
}

describe("validateSubmission — form type matrix", () => {
  it("accepts a minimal valid contact submission", () => {
    const value = ok({ form: "contact", name: "Amara Stone", email: "amara@example.com", message: "Hello there" });
    assert.deepEqual(value, {
      form: "contact",
      email: "amara@example.com",
      consent: false,
      name: "Amara Stone",
      message: "Hello there"
    });
  });

  it("accepts a minimal valid newsletter submission with no name or message", () => {
    const value = ok({ form: "newsletter", email: "reader@example.com" });
    assert.deepEqual(value, { form: "newsletter", email: "reader@example.com", consent: false });
  });

  it("accepts a minimal valid inquiry submission", () => {
    const value = ok({
      form: "inquiry",
      name: "Wholesale Buyer",
      email: "buyer@example.com",
      message: "We'd like to stock your beans.",
      company: "Buyer Co",
      phone: "+27 21 555 0100"
    });
    assert.equal(value.company, "Buyer Co");
    assert.equal(value.phone, "+27 21 555 0100");
  });

  it("requires name for contact and inquiry but not newsletter", () => {
    fails({ form: "contact", email: "a@example.com", message: "hi" }, "name");
    fails({ form: "inquiry", email: "a@example.com", message: "hi" }, "name");
    ok({ form: "newsletter", email: "a@example.com" });
  });

  it("requires message for contact and inquiry but not newsletter", () => {
    fails({ form: "contact", name: "A", email: "a@example.com" }, "message");
    fails({ form: "inquiry", name: "A", email: "a@example.com" }, "message");
    ok({ form: "newsletter", email: "a@example.com" });
  });
});

describe("validateSubmission — email", () => {
  it("rejects a missing or blank email", () => {
    fails({ form: "newsletter", email: "" }, "email");
    fails({ form: "newsletter" }, "email");
    fails({ form: "newsletter", email: "   " }, "email");
  });

  it("rejects a malformed email", () => {
    fails({ form: "newsletter", email: "not-an-email" }, "email");
    fails({ form: "newsletter", email: "missing-domain@" }, "email");
    fails({ form: "newsletter", email: "@missing-local.com" }, "email");
  });

  it("rejects an email over the max length", () => {
    const local = "a".repeat(MAX_EMAIL_LENGTH);
    fails({ form: "newsletter", email: `${local}@example.com` }, "email");
  });

  it("accepts an email at the max length", () => {
    const email = `${"a".repeat(MAX_EMAIL_LENGTH - "@example.com".length)}@example.com`;
    assert.equal(email.length, MAX_EMAIL_LENGTH);
    const value = ok({ form: "newsletter", email });
    assert.equal(value.email, email);
  });

  it("trims surrounding whitespace", () => {
    const value = ok({ form: "newsletter", email: "  spaced@example.com  " });
    assert.equal(value.email, "spaced@example.com");
  });
});

describe("validateSubmission — name", () => {
  it("rejects a name over the max length", () => {
    fails({ form: "contact", name: "a".repeat(MAX_NAME_LENGTH + 1), email: "a@example.com", message: "hi" }, "name");
  });

  it("accepts a name at the max length", () => {
    const name = "a".repeat(MAX_NAME_LENGTH);
    const value = ok({ form: "contact", name, email: "a@example.com", message: "hi" });
    assert.equal(value.name, name);
  });

  it("trims the name and rejects a whitespace-only name where required", () => {
    fails({ form: "contact", name: "   ", email: "a@example.com", message: "hi" }, "name");
    const value = ok({ form: "contact", name: "  Amara  ", email: "a@example.com", message: "hi" });
    assert.equal(value.name, "Amara");
  });
});

describe("validateSubmission — message", () => {
  it("rejects a message over the max length", () => {
    fails({ form: "contact", name: "A", email: "a@example.com", message: "a".repeat(MAX_MESSAGE_LENGTH + 1) }, "message");
  });

  it("accepts a message at the max length", () => {
    const message = "a".repeat(MAX_MESSAGE_LENGTH);
    const value = ok({ form: "contact", name: "A", email: "a@example.com", message });
    assert.equal(value.message, message);
  });

  it("rejects a whitespace-only message where required", () => {
    fails({ form: "contact", name: "A", email: "a@example.com", message: "   " }, "message");
  });

  it("still enforces the max length for an optional newsletter message", () => {
    fails({ form: "newsletter", email: "a@example.com", message: "a".repeat(MAX_MESSAGE_LENGTH + 1) }, "message");
  });
});

describe("validateSubmission — company / phone", () => {
  it("company and phone are optional", () => {
    const value = ok({ form: "newsletter", email: "a@example.com" });
    assert.equal(value.company, undefined);
    assert.equal(value.phone, undefined);
  });

  it("rejects company over the max length", () => {
    fails({ form: "newsletter", email: "a@example.com", company: "a".repeat(MAX_COMPANY_LENGTH + 1) }, "company");
  });

  it("rejects phone over the max length", () => {
    fails({ form: "newsletter", email: "a@example.com", phone: "1".repeat(MAX_PHONE_LENGTH + 1) }, "phone");
  });
});

describe("validateSubmission — consent coercion", () => {
  const truthy = [true, "true", "on", 1, "1"];
  const falsy = [false, "false", "off", 0, undefined, null, "yes", "no"];

  for (const input of truthy) {
    it(`coerces ${JSON.stringify(input)} to true`, () => {
      const value = ok({ form: "newsletter", email: "a@example.com", consent: input });
      assert.equal(value.consent, true);
    });
  }

  for (const input of falsy) {
    it(`coerces ${JSON.stringify(input)} to false`, () => {
      const value = ok({ form: "newsletter", email: "a@example.com", consent: input });
      assert.equal(value.consent, false);
    });
  }
});

describe("validateSubmission — form field", () => {
  it("rejects a missing form", () => {
    fails({ email: "a@example.com" }, "form");
  });

  it("rejects an unknown form value", () => {
    fails({ form: "wholesale", email: "a@example.com" }, "form");
    fails({ form: "product_enquiry", email: "a@example.com" }, "form");
  });

  it("still runs the rest of validation when form is invalid, collecting every error", () => {
    const result = validateSubmission({ form: "bogus" });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok("form" in result.errors);
      assert.ok("email" in result.errors);
      // form isn't recognized as "newsletter", so name is still required.
      assert.ok("name" in result.errors);
    }
  });
});

describe("validateSubmission — malformed input", () => {
  it("treats non-object input as an empty payload instead of throwing", () => {
    for (const input of [null, undefined, "a string", 42, true, ["array"]]) {
      const result = validateSubmission(input);
      assert.equal(result.ok, false);
    }
  });
});

describe("validateSubmission — honeypot", () => {
  it("passes website through untouched, without trimming", () => {
    const value = ok({ form: "newsletter", email: "a@example.com", website: "  http://bot.example  " });
    assert.equal(value.website, "  http://bot.example  ");
  });

  it("omits website when not a string", () => {
    const value = ok({ form: "newsletter", email: "a@example.com", website: 123 });
    assert.equal(value.website, undefined);
  });
});

describe("isHoneypotTripped", () => {
  it("is false when website is absent, undefined, or blank", () => {
    assert.equal(isHoneypotTripped({}), false);
    assert.equal(isHoneypotTripped({ website: undefined }), false);
    assert.equal(isHoneypotTripped({ website: "" }), false);
    assert.equal(isHoneypotTripped({ website: "   " }), false);
  });

  it("is true when a bot filled the honeypot", () => {
    assert.equal(isHoneypotTripped({ website: "http://bot.example" }), true);
    assert.equal(isHoneypotTripped({ website: "  http://bot.example  " }), true);
  });
});
