import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384; // cost factor (2^14) — Node's scrypt default, ~16MB/hash
const SCRYPT_R = 8; // block size
const SCRYPT_P = 1; // parallelization
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

const HASH_PREFIX = "scrypt";

// `util.promisify(scrypt)` resolves to the 3-arg (no-options) overload's
// types, so the cost-parameter overload used below is wrapped by hand.
function scryptAsync(password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/**
 * Hashes a password with `node:crypto`'s scrypt, using a fresh random
 * 16-byte salt each time. Encodes the cost parameters alongside the salt
 * and derived key so `verifyPassword` can re-derive with the exact
 * parameters this hash was created with, even if the defaults above change
 * later: `scrypt$N$r$p$saltBase64$hashBase64`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  });

  return [HASH_PREFIX, SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64"), derivedKey.toString("base64")].join("$");
}

/**
 * Verifies a password against a hash produced by `hashPassword`. Never
 * throws: a malformed hash (wrong prefix, wrong segment count, unparsable
 * numbers/base64) is treated as "does not match" and returns `false`, same
 * as a genuinely wrong password.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (typeof hash !== "string") return false;

    const parts = hash.split("$");
    if (parts.length !== 6) return false;

    const [prefix, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
    if (prefix !== HASH_PREFIX) return false;

    const N = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N <= 0 || r <= 0 || p <= 0) {
      return false;
    }

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = await scryptAsync(password, salt, expected.length, { N, r, p });

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
