import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./passwords";

describe("hashPassword / verifyPassword", () => {
  it("hashes in the documented scrypt$N$r$p$salt$hash format", async () => {
    const hash = await hashPassword("correct horse battery staple");
    const parts = hash.split("$");
    assert.equal(parts.length, 6);
    assert.equal(parts[0], "scrypt");
    assert.ok(Number(parts[1]) > 0);
    assert.ok(Number(parts[2]) > 0);
    assert.ok(Number(parts[3]) > 0);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("hunter2");
    assert.equal(await verifyPassword("hunter2", hash), true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("hunter2");
    assert.equal(await verifyPassword("hunter3", hash), false);
  });

  it("uses a random salt each time, so two hashes of the same password differ", async () => {
    const first = await hashPassword("same-password");
    const second = await hashPassword("same-password");
    assert.notEqual(first, second);
    assert.equal(await verifyPassword("same-password", first), true);
    assert.equal(await verifyPassword("same-password", second), true);
  });

  it("returns false (never throws) for a malformed hash", async () => {
    await assert.doesNotReject(async () => {
      assert.equal(await verifyPassword("anything", "not-a-real-hash"), false);
      assert.equal(await verifyPassword("anything", ""), false);
      assert.equal(await verifyPassword("anything", "scrypt$x$y$z$not-base64!$also-not-base64!"), false);
      assert.equal(await verifyPassword("anything", "bcrypt$10$abc$def"), false);
      assert.equal(await verifyPassword("anything", "scrypt$0$0$0$c2FsdA==$aGFzaA=="), false);
    });
  });
});
