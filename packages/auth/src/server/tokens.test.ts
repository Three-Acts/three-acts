import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TOKEN_TTL_SECONDS, signSessionToken, verifySessionToken } from "./tokens";

const SECRET = "test-secret-do-not-use-in-prod";

const BASE_PAYLOAD = {
  sub: "user_1",
  email: "amy@example.com",
  name: "Amy Example",
  scope: "shop" as const
};

describe("signSessionToken / verifySessionToken", () => {
  it("round-trips: verify recovers the signed user", () => {
    const { token, expiresAt } = signSessionToken(BASE_PAYLOAD, SECRET);

    assert.equal(typeof token, "string");
    assert.equal(token.split(".").length, 3);
    assert.equal(typeof expiresAt, "string");
    assert.ok(!Number.isNaN(Date.parse(expiresAt)));

    const user = verifySessionToken(token, SECRET);
    assert.deepEqual(user, {
      id: "user_1",
      email: "amy@example.com",
      name: "Amy Example",
      scope: "shop"
    });
  });

  it("carries optional customerId/role claims through when present", () => {
    const { token } = signSessionToken({ ...BASE_PAYLOAD, customerId: "cust_9" }, SECRET);
    const user = verifySessionToken(token, SECRET);
    assert.equal(user?.customerId, "cust_9");
    assert.equal(user?.role, undefined);

    const { token: cmsToken } = signSessionToken({ ...BASE_PAYLOAD, scope: "cms", role: "editor" }, SECRET);
    const cmsUser = verifySessionToken(cmsToken, SECRET);
    assert.equal(cmsUser?.role, "editor");
    assert.equal(cmsUser?.scope, "cms");
  });

  it("defaults the token lifetime to DEFAULT_TOKEN_TTL_SECONDS", () => {
    const before = Date.now();
    const { expiresAt } = signSessionToken(BASE_PAYLOAD, SECRET);
    const expiresInMs = Date.parse(expiresAt) - before;

    // Allow slack for test execution time either side of the target.
    assert.ok(Math.abs(expiresInMs - DEFAULT_TOKEN_TTL_SECONDS * 1000) < 5_000);
  });

  it("honors an explicit ttlSeconds", () => {
    const { expiresAt } = signSessionToken({ ...BASE_PAYLOAD, ttlSeconds: 60 }, SECRET);
    const expiresInMs = Date.parse(expiresAt) - Date.now();
    assert.ok(expiresInMs > 0 && expiresInMs <= 60_000);
  });

  it("rejects a token whose signature was tampered with", () => {
    const { token } = signSessionToken(BASE_PAYLOAD, SECRET);
    const [header, payload, signature] = token.split(".");
    const tamperedSignature = signature.slice(0, -2) + (signature.slice(-2) === "AA" ? "BB" : "AA");
    const tampered = `${header}.${payload}.${tamperedSignature}`;

    assert.equal(verifySessionToken(tampered, SECRET), null);
  });

  it("rejects a token whose payload was tampered with (signature no longer matches)", () => {
    const { token } = signSessionToken(BASE_PAYLOAD, SECRET);
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ ...BASE_PAYLOAD, sub: "attacker", iat: 0, exp: 9_999_999_999 })).toString(
      "base64url"
    );

    assert.equal(verifySessionToken(`${header}.${forgedPayload}.${signature}`, SECRET), null);
  });

  it("rejects an expired token", () => {
    const { token } = signSessionToken({ ...BASE_PAYLOAD, ttlSeconds: -10 }, SECRET);
    assert.equal(verifySessionToken(token, SECRET), null);
  });

  it("rejects a token verified with the wrong secret", () => {
    const { token } = signSessionToken(BASE_PAYLOAD, SECRET);
    assert.equal(verifySessionToken(token, "a-different-secret"), null);
  });

  it("never throws on malformed input, returning null instead", () => {
    assert.equal(verifySessionToken("", SECRET), null);
    assert.equal(verifySessionToken("not-a-token", SECRET), null);
    assert.equal(verifySessionToken("a.b", SECRET), null);
    assert.equal(verifySessionToken("a.b.c.d", SECRET), null);
    assert.equal(verifySessionToken("not-base64!.not-base64!.not-base64!", SECRET), null);
    // Well-formed base64url segments but not valid JSON once decoded.
    const bogusHeader = Buffer.from("not json").toString("base64url");
    const bogusPayload = Buffer.from("also not json").toString("base64url");
    assert.equal(verifySessionToken(`${bogusHeader}.${bogusPayload}.sig`, SECRET), null);
  });
});
