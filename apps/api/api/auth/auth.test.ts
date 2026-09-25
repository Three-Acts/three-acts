import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";
import type { VercelRequest } from "@vercel/node";
import { CmsError } from "@three-acts/cms-schema";
import { cloneSeedCollections } from "@three-acts/cms-schema/seed";
import { verifySessionToken } from "@three-acts/auth/server";
import { MemoryDataStore } from "../_lib/cms/memory-store";
import { setDataStoreForTests } from "../_lib/cms/resolve-store";
import { findRecords } from "../_lib/cms/service";
import { MemoryIdentityStore, setIdentityStoreForTests } from "../_lib/auth/identity-store";
import { getAccount, signIn, signUp, updateAccount } from "../_lib/auth/service";
import { authenticate, requireCmsAuth, requireShopAuth } from "../_lib/auth/sessions";
import { ApiError } from "../_lib/http";

const TEST_SECRET = "auth-test-secret";
const ENV_KEYS = ["AUTH_SECRET", "AUTH_TOKEN_TTL_SECONDS", "CMS_AUTH_MODE", "CMS_EDITORS", "SHOP_OPEN_PASSWORDS", "PUBLISH_TOKEN", "VERCEL_ENV", "NODE_ENV"] as const;

/** Fresh seeded memory store + memory identity store + known auth env, torn down after the test. */
function setupAuthTest(t: TestContext): void {
  const original: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};
  for (const key of ENV_KEYS) original[key] = process.env[key];

  process.env.AUTH_SECRET = TEST_SECRET;
  process.env.CMS_AUTH_MODE = "open";
  delete process.env.CMS_EDITORS;
  process.env.SHOP_OPEN_PASSWORDS = "true";
  delete process.env.PUBLISH_TOKEN;

  setDataStoreForTests(new MemoryDataStore(() => cloneSeedCollections()));
  setIdentityStoreForTests(new MemoryIdentityStore());

  t.after(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    setDataStoreForTests(undefined);
    setIdentityStoreForTests(undefined);
  });
}

function fakeRequest(headers: Record<string, string> = {}): VercelRequest {
  return { headers } as unknown as VercelRequest;
}

test("signUp creates a customer record and returns a verifiable shop session", async (t) => {
  setupAuthTest(t);

  const session = await signUp({ name: "Nia Roast", email: "Nia.Roast@Example.com ", password: "correct-horse-battery", marketingOptIn: true });

  assert.equal(session.user.scope, "shop");
  assert.equal(session.user.email, "nia.roast@example.com");
  assert.ok(session.user.customerId);

  const verified = verifySessionToken(session.token, TEST_SECRET);
  assert.ok(verified, "the issued token must verify against AUTH_SECRET");
  assert.equal(verified?.scope, "shop");
  assert.equal(verified?.customerId, session.user.customerId);

  const [record] = await findRecords("customers", (r) => r.id === session.user.customerId);
  assert.ok(record, "signUp must create a customers record");
  assert.equal(record.values.name, "Nia Roast");
  assert.equal(record.values.email, "nia.roast@example.com");
  assert.equal(record.values.marketingOptIn, true);
});

test("signUp rejects a duplicate email with 409 conflict", async (t) => {
  setupAuthTest(t);

  await signUp({ name: "Dupe One", email: "dupe@example.com", password: "password-one" });

  await assert.rejects(
    () => signUp({ name: "Dupe Two", email: "dupe@example.com", password: "password-two" }),
    (error: unknown) => {
      assert.ok(error instanceof CmsError);
      assert.equal(error.code, "conflict");
      assert.equal(error.status, 409);
      return true;
    }
  );
});

test("signIn with the wrong password is rejected with 401 unauthorized", async (t) => {
  setupAuthTest(t);

  await signUp({ name: "Wrong Pass", email: "wrongpass@example.com", password: "the-real-password" });

  await assert.rejects(
    () => signIn({ email: "wrongpass@example.com", password: "not-the-password", scope: "shop" }),
    (error: unknown) => {
      assert.ok(error instanceof CmsError);
      assert.equal(error.code, "unauthorized");
      assert.equal(error.status, 401);
      return true;
    }
  );
});

test("a seeded customer with no identity yet can sign in under SHOP_OPEN_PASSWORDS, then must use that same password", async (t) => {
  setupAuthTest(t);

  const [seeded] = await findRecords("customers", () => true);
  assert.ok(seeded, "expected at least one seeded customer");
  const email = String(seeded.values.email);

  const first = await signIn({ email, password: "first-login-password", scope: "shop" });
  assert.equal(first.user.scope, "shop");
  assert.equal(first.user.customerId, seeded.id);

  // The password from that first sign-in is now the identity's password:
  // a different password is rejected...
  await assert.rejects(() => signIn({ email, password: "a-different-password", scope: "shop" }), (error: unknown) => {
    assert.ok(error instanceof CmsError);
    assert.equal(error.code, "unauthorized");
    return true;
  });

  // ...and the original one still works.
  const second = await signIn({ email, password: "first-login-password", scope: "shop" });
  assert.equal(second.user.customerId, seeded.id);
});

test("CMS open mode issues a cms-scoped token that requireCmsAuth accepts", async (t) => {
  setupAuthTest(t);

  const session = await signIn({ email: "editor@example.com", password: "anything-at-all", scope: "cms" });
  assert.equal(session.user.scope, "cms");
  assert.equal(session.user.role, "editor");

  const request = fakeRequest({ authorization: `Bearer ${session.token}` });
  const user = requireCmsAuth(request);
  assert.equal(user.scope, "cms");
  assert.equal(user.email, "editor@example.com");
});

test("a shop-scoped session token is rejected by requireCmsAuth (but accepted by requireShopAuth)", async (t) => {
  setupAuthTest(t);

  const shopSession = await signUp({ name: "Shop Only", email: "shoponly@example.com", password: "shop-password" });
  const request = fakeRequest({ authorization: `Bearer ${shopSession.token}` });

  assert.throws(
    () => requireCmsAuth(request),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 401);
      return true;
    }
  );

  const shopUser = requireShopAuth(request);
  assert.equal(shopUser.scope, "shop");
  assert.equal(shopUser.customerId, shopSession.user.customerId);

  // authenticate() never throws, and returns the user regardless of scope.
  assert.equal(authenticate(request)?.scope, "shop");
});

test("account update patches only the allowed keys and leaves readOnly aggregates untouched", async (t) => {
  setupAuthTest(t);

  const session = await signUp({ name: "Account Holder", email: "account@example.com", password: "account-password" });

  await updateAccount(session.user, { phone: "+27 82 555 0100", city: "Cape Town" });
  const { customer: afterFirstUpdate } = await getAccount(session.user);
  assert.equal(afterFirstUpdate.phone, "+27 82 555 0100");
  assert.equal(afterFirstUpdate.city, "Cape Town");
  assert.equal(afterFirstUpdate.totalOrders, 0);
  assert.equal(afterFirstUpdate.email, "account@example.com");

  // A patch that (outside the UpdateAccountRequest type, as a raw client
  // payload could) includes readOnly/unlisted keys must not touch them —
  // updateAccount only ever forwards ALLOWED_ACCOUNT_KEYS.
  const craftedPatch = { name: "Renamed Holder", totalOrders: 999, email: "hijacked@example.com" } as unknown as Parameters<typeof updateAccount>[1];
  await updateAccount(session.user, craftedPatch);

  const { customer } = await getAccount(session.user);
  assert.equal(customer.name, "Renamed Holder");
  assert.equal(customer.totalOrders, 0);
  assert.equal(customer.email, "account@example.com");
});
