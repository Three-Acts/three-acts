import assert from "node:assert/strict";
import test from "node:test";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MemoryDataStore } from "../_lib/cms/memory-store";
import { setDataStoreForTests } from "../_lib/cms/resolve-store";
import { findRecords } from "../_lib/cms/service";
import type { ApiFailure, ApiSuccess } from "../_lib/http";
import submit from "./submit";

/** Minimal `VercelRequest`/`VercelResponse` pair `withApi` needs, capturing the response for assertions. */
function makeExchange(body: unknown, headers: Record<string, string> = {}): {
  request: VercelRequest;
  response: VercelResponse;
  result: () => { status: number; body: unknown };
} {
  let status = 200;
  let responseBody: unknown;

  const request = {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
    query: {},
    cookies: {}
  } as unknown as VercelRequest;

  const response = {
    status(code: number) {
      status = code;
      return response;
    },
    setHeader() {
      return response;
    },
    json(payload: unknown) {
      responseBody = payload;
      return response;
    },
    end() {
      return response;
    }
  } as unknown as VercelResponse;

  return { request, response, result: () => ({ status, body: responseBody }) };
}

async function submitForm(body: unknown): Promise<{ status: number; body: ApiSuccess<{ received: true; submissionId: string }> | ApiFailure }> {
  const exchange = makeExchange(body);
  await submit(exchange.request, exchange.response);
  return exchange.result() as { status: number; body: ApiSuccess<{ received: true; submissionId: string }> | ApiFailure };
}

function freshStore(t: import("node:test").TestContext): void {
  setDataStoreForTests(new MemoryDataStore());
  t.after(() => setDataStoreForTests(undefined));
}

test("POST /api/forms/submit — contact form stores the right form and score", async (t) => {
  freshStore(t);

  const { status, body } = await submitForm({
    form: "contact",
    name: "Ada Lovelace",
    email: "ada@example.com",
    message: "Do you ship internationally?",
    consent: true
  });

  assert.equal(status, 201);
  assert.equal(body.ok, true);
  const data = (body as ApiSuccess<{ received: true; submissionId: string }>).data;
  assert.equal(data.received, true);
  assert.ok(data.submissionId.startsWith("sub_"), `expected submissionId to start with "sub_", got ${data.submissionId}`);

  const [record] = await findRecords("form-submissions", (candidate) => candidate.values.email === "ada@example.com");
  assert.ok(record, "expected a stored form-submissions record");
  assert.equal(record.values.form, "contact");
  assert.equal(record.values.submittedBy, "Ada Lovelace");
  assert.equal(record.values.submissionId, data.submissionId);
  // contact base score (30) + consent bonus (5) + a short message length bonus (0).
  assert.equal(record.values.score, 35);
});

test("POST /api/forms/submit — inquiry form stores company/phone and a higher score", async (t) => {
  freshStore(t);

  const { status, body } = await submitForm({
    form: "inquiry",
    name: "Wholesale Buyer",
    email: "buyer@example.com",
    message: "Interested in a wholesale account.",
    company: "Roast Co",
    phone: "+27 21 555 0100",
    consent: true
  });

  assert.equal(status, 201);
  const [record] = await findRecords("form-submissions", (candidate) => candidate.values.email === "buyer@example.com");
  assert.ok(record);
  assert.equal(record.values.form, "inquiry");
  assert.equal(record.values.company, "Roast Co");
  assert.equal(record.values.phone, "+27 21 555 0100");
  // inquiry base score (60) + company (15) + phone (10) + consent (5) = 90.
  assert.equal(record.values.score, 90);
  assert.equal((body as ApiSuccess<unknown>).ok, true);
});

test("POST /api/forms/submit — newsletter form without a name stores 'Newsletter subscriber'", async (t) => {
  freshStore(t);

  const { status } = await submitForm({
    form: "newsletter",
    email: "subscriber@example.com"
  });

  assert.equal(status, 201);
  const [record] = await findRecords("form-submissions", (candidate) => candidate.values.email === "subscriber@example.com");
  assert.ok(record);
  assert.equal(record.values.submittedBy, "Newsletter subscriber");
  assert.equal(record.values.form, "newsletter");
  // newsletter base score (10), no company/phone/message/consent bonuses.
  assert.equal(record.values.score, 10);
});

test("POST /api/forms/submit — honeypot short-circuits without storing anything", async (t) => {
  freshStore(t);

  const { status, body } = await submitForm({
    form: "contact",
    name: "Bot",
    email: "bot@example.com",
    message: "buy pills",
    website: "http://spam.example"
  });

  assert.equal(status, 200);
  const data = (body as ApiSuccess<{ received: true; submissionId: string }>).data;
  assert.equal(data.received, true);
  assert.equal(data.submissionId, "");

  const matches = await findRecords("form-submissions", (candidate) => candidate.values.email === "bot@example.com");
  assert.equal(matches.length, 0, "expected no record stored for a honeypot-tripped submission");
});

test("POST /api/forms/submit — invalid email is a 400 validation_error with a details map", async (t) => {
  freshStore(t);

  const { status, body } = await submitForm({
    form: "contact",
    name: "Bad Email",
    email: "not-an-email",
    message: "hello"
  });

  assert.equal(status, 400);
  assert.equal(body.ok, false);
  const failure = body as ApiFailure;
  assert.equal(failure.error.code, "validation_error");
  assert.ok(failure.error.message.length > 0);
  assert.ok(failure.error.details && typeof failure.error.details === "object");
  assert.match((failure.error.details as Record<string, string>).email, /valid email/);

  const matches = await findRecords("form-submissions", (candidate) => candidate.values.email === "not-an-email");
  assert.equal(matches.length, 0, "expected no record stored for an invalid submission");
});

test("POST /api/forms/submit — a 6th submission from the same email within 10 minutes is rate limited", async (t) => {
  freshStore(t);

  for (let index = 0; index < 5; index += 1) {
    const { status } = await submitForm({
      form: "newsletter",
      email: "frequent@example.com"
    });
    assert.equal(status, 201, `submission ${index + 1} should succeed`);
  }

  const { status, body } = await submitForm({
    form: "newsletter",
    email: "frequent@example.com"
  });

  assert.equal(status, 429);
  const failure = body as ApiFailure;
  assert.equal(failure.error.code, "rate_limited");

  const matches = await findRecords("form-submissions", (candidate) => candidate.values.email === "frequent@example.com");
  assert.equal(matches.length, 5, "expected exactly the first 5 submissions to be stored");
});
