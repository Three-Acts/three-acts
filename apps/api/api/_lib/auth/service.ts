import { timingSafeEqual } from "node:crypto";
import { CmsError, type CmsRecordValue } from "@three-acts/cms-schema";
import type { AuthScope, AuthUser, Session, SignInRequest, SignUpInput, UpdateAccountRequest } from "@three-acts/auth";
import { hashPassword, verifyPassword } from "@three-acts/auth/server";
import { toCustomer, type Customer } from "@three-acts/ecommerce";
import { createSystemRecord, findRecords, getRecord, updateSystemRecord } from "../cms/service";
import { getCmsAuthMode, getCmsEditors, shopOpenPasswords } from "./config";
import { getIdentityStore } from "./identity-store";
import { issueSession } from "./sessions";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function unauthorized(): CmsError {
  return new CmsError("unauthorized", "Incorrect email or password.");
}

type ValidatedSignUp = { name: string; email: string; password: string; marketingOptIn: boolean };

function validateSignUpInput(input: SignUpInput): ValidatedSignUp {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 200) {
    throw new CmsError("validation", "name must be between 1 and 200 characters.");
  }

  const email = normalizeEmail(input?.email);
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new CmsError("validation", "email must be a valid email address.");
  }

  const password = typeof input?.password === "string" ? input.password : "";
  if (password.length < 8) {
    throw new CmsError("validation", "password must be at least 8 characters.");
  }

  return { name, email, password, marketingOptIn: input?.marketingOptIn === true };
}

/**
 * Creates a shop account: an `IdentityStore` credential plus (usually) a new
 * `customers` record, written through the system path so `readOnly`
 * fields like `email` are settable. If a `customers` record with this email
 * already exists (typically seeded data, or one the CMS created before this
 * shopper ever signed up) and has no identity yet, this attaches the new
 * identity to it instead of creating a duplicate customer.
 *
 * 409 `conflict` when an identity for this email already exists — that's
 * the actual "already signed up" case, regardless of whether a customer
 * record for the email exists (an identity's email and its customer's email
 * are kept in lockstep by this function, so checking the identity alone is
 * sufficient).
 */
export async function signUp(input: SignUpInput): Promise<Session> {
  const { name, email, password, marketingOptIn } = validateSignUpInput(input);

  const identityStore = getIdentityStore();
  const existingIdentity = await identityStore.findByEmail(email);
  if (existingIdentity) {
    throw new CmsError("conflict", "An account with this email already exists.");
  }

  const matchingCustomers = await findRecords("customers", (record) => normalizeEmail(record.values.email) === email);
  const existingCustomer = matchingCustomers[0];

  const passwordHash = await hashPassword(password);

  let customerId: string;
  if (existingCustomer) {
    customerId = existingCustomer.id;
    await updateSystemRecord("customers", existingCustomer.id, { name, marketingOptIn });
  } else {
    const created = await createSystemRecord("customers", { name, email, marketingOptIn });
    customerId = created.id;
  }

  await identityStore.create({ email, passwordHash, customerId });

  const user: AuthUser = { id: `customer:${customerId}`, email, name, scope: "shop", customerId };
  return issueSession(user);
}

function timingSafeStringEqual(expectedValue: string, actualValue: string): boolean {
  const expected = Buffer.from(expectedValue);
  const actual = Buffer.from(actualValue);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function signInCms(email: string, password: string): Promise<Session> {
  const mode = getCmsAuthMode();

  if (mode === "open") {
    const user: AuthUser = { id: `cms:${email}`, email, name: email, scope: "cms", role: "editor" };
    return issueSession(user);
  }

  const editors = getCmsEditors();
  const matched = editors.find((editor) => editor.email === email);
  const isMatch = matched !== undefined && timingSafeStringEqual(matched.password, password);
  if (!isMatch) {
    throw unauthorized();
  }

  const user: AuthUser = { id: `cms:${email}`, email, name: email, scope: "cms", role: "editor" };
  return issueSession(user);
}

async function signInShop(email: string, password: string): Promise<Session> {
  const identityStore = getIdentityStore();
  let identity = await identityStore.findByEmail(email);

  if (!identity) {
    const matchingCustomers = await findRecords("customers", (record) => normalizeEmail(record.values.email) === email);
    const customer = matchingCustomers[0];
    if (!customer || !shopOpenPasswords()) {
      throw unauthorized();
    }

    // Dev convenience (SHOP_OPEN_PASSWORDS): a seeded/site-created customer
    // with no identity yet accepts any password on first sign-in, and that
    // password becomes its identity going forward.
    const passwordHash = await hashPassword(password);
    console.warn(`[auth] SHOP_OPEN_PASSWORDS: creating an identity for "${email}" on first sign-in.`);
    identity = await identityStore.create({ email, passwordHash, customerId: customer.id });
  } else if (identity.passwordHash) {
    const isValid = await verifyPassword(password, identity.passwordHash);
    if (!isValid) {
      throw unauthorized();
    }
  } else {
    if (!shopOpenPasswords()) {
      throw unauthorized();
    }
    const passwordHash = await hashPassword(password);
    await identityStore.setPassword(email, passwordHash);
    identity = { ...identity, passwordHash };
  }

  const customerRecord = await getRecord("customers", identity.customerId);
  const customer = toCustomer(customerRecord);

  const user: AuthUser = { id: `customer:${identity.customerId}`, email, name: customer.name || email, scope: "shop", customerId: identity.customerId };
  return issueSession(user);
}

/** `signIn({ email, password, scope })` -> `Session`. `scope` defaults to `"shop"`. */
export async function signIn(input: SignInRequest): Promise<Session> {
  const scope: AuthScope = input?.scope === "cms" ? "cms" : "shop";
  const email = normalizeEmail(input?.email);
  const password = typeof input?.password === "string" ? input.password : "";

  if (!email || !password) {
    throw unauthorized();
  }

  return scope === "cms" ? signInCms(email, password) : signInShop(email, password);
}

export async function getAccount(user: AuthUser): Promise<{ customer: Customer }> {
  if (!user.customerId) {
    throw new CmsError("not_found", "No customer record for this session.");
  }
  const record = await getRecord("customers", user.customerId);
  return { customer: toCustomer(record) };
}

const ALLOWED_ACCOUNT_KEYS = ["name", "phone", "address", "city", "postalCode", "country", "marketingOptIn"] as const;

/**
 * Applies `patch` to the signed-in shopper's `customers` record, ignoring
 * any key outside `ALLOWED_ACCOUNT_KEYS` even if the caller's JSON body
 * includes one (e.g. a crafted `totalOrders`/`email` — those stay
 * `readOnly` and untouched, same as `updateSystemRecord`'s own guarantee for
 * fields this function never forwards).
 */
export async function updateAccount(user: AuthUser, patch: UpdateAccountRequest): Promise<{ customer: Customer }> {
  if (!user.customerId) {
    throw new CmsError("not_found", "No customer record for this session.");
  }

  const values: Partial<Record<string, CmsRecordValue>> = {};
  const source = patch as Record<string, unknown> | null | undefined;

  for (const key of ALLOWED_ACCOUNT_KEYS) {
    if (!source || !Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }
    const raw = source[key];
    values[key] = key === "marketingOptIn" ? raw === true : typeof raw === "string" ? raw : "";
  }

  const record = await updateSystemRecord("customers", user.customerId, values);
  return { customer: toCustomer(record) };
}
