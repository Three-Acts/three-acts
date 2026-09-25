import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { leadScore } from "./lead-score";
import type { FormSubmission } from "./models";

function submission(overrides: Partial<FormSubmission> = {}): FormSubmission {
  return { form: "contact", email: "a@example.com", consent: false, ...overrides };
}

describe("leadScore — base by form", () => {
  it("scores inquiry highest, then contact, then newsletter", () => {
    assert.equal(leadScore(submission({ form: "inquiry" })), 60);
    assert.equal(leadScore(submission({ form: "contact" })), 30);
    assert.equal(leadScore(submission({ form: "newsletter" })), 10);
  });
});

describe("leadScore — bonuses", () => {
  it("adds 15 when company is present", () => {
    assert.equal(leadScore(submission({ form: "newsletter", company: "Acme" })), 25);
  });

  it("does not add the company bonus for a blank company", () => {
    assert.equal(leadScore(submission({ form: "newsletter", company: "   " })), 10);
  });

  it("adds 10 when phone is present", () => {
    assert.equal(leadScore(submission({ form: "newsletter", phone: "+27 21 555 0100" })), 20);
  });

  it("adds 5 when consent is true", () => {
    assert.equal(leadScore(submission({ form: "newsletter", consent: true })), 15);
  });

  it("adds up to 15 for message length, 1 point per 100 characters", () => {
    assert.equal(leadScore(submission({ form: "newsletter", message: "a".repeat(50) })), 10, "under 100 chars: no bonus");
    assert.equal(leadScore(submission({ form: "newsletter", message: "a".repeat(100) })), 11, "exactly 100 chars: +1");
    assert.equal(leadScore(submission({ form: "newsletter", message: "a".repeat(250) })), 12, "250 chars: +2");
  });

  it("caps the message length bonus at 15", () => {
    assert.equal(leadScore(submission({ form: "newsletter", message: "a".repeat(5000) })), 25, "10 base + 15 cap");
  });

  it("combines every bonus", () => {
    const score = leadScore(
      submission({
        form: "inquiry",
        company: "Acme",
        phone: "+27 21 555 0100",
        message: "a".repeat(500),
        consent: true
      })
    );
    // 60 base + 15 company + 10 phone + 5 message + 5 consent = 95
    assert.equal(score, 95);
  });
});

describe("leadScore — clamping", () => {
  it("never exceeds 100", () => {
    const score = leadScore(
      submission({
        form: "inquiry",
        company: "Acme",
        phone: "+27 21 555 0100",
        message: "a".repeat(5000),
        consent: true
      })
    );
    // 60 + 15 + 10 + 15 + 5 = 105, clamped to 100
    assert.equal(score, 100);
  });

  it("never goes below 0", () => {
    assert.ok(leadScore(submission({ form: "newsletter" })) >= 0);
  });
});

describe("leadScore — determinism", () => {
  it("returns the same score for the same input every time", () => {
    const input = submission({ form: "contact", company: "Acme", message: "hello world" });
    const first = leadScore(input);
    const second = leadScore(input);
    assert.equal(first, second);
  });
});
