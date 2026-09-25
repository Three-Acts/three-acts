import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthScope, AuthUser } from "../models";

/** 14 days, in seconds — the default session lifetime when the caller
 *  doesn't pass `ttlSeconds`. */
export const DEFAULT_TOKEN_TTL_SECONDS = 14 * 24 * 3600;

export type SignSessionTokenPayload = {
  /** Subject: the user id. */
  sub: string;
  email: string;
  name: string;
  scope: AuthScope;
  customerId?: string;
  role?: "admin" | "editor";
  /** Overrides `DEFAULT_TOKEN_TTL_SECONDS`. */
  ttlSeconds?: number;
};

type SessionTokenClaims = {
  sub: string;
  email: string;
  name: string;
  scope: AuthScope;
  customerId?: string;
  role?: "admin" | "editor";
  /** Issued-at, Unix seconds. */
  iat: number;
  /** Expiry, Unix seconds. */
  exp: number;
};

const HEADER = { alg: "HS256", typ: "JWT" } as const;

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer.toString("base64url");
}

function base64UrlDecodeToUtf8(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function computeSignature(signingInput: string, secret: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(signingInput).digest());
}

/**
 * Signs a compact, JWT-like session token: `base64url(header).base64url(
 * payload).base64url(HMAC-SHA256(header + "." + payload, secret))`. Not a
 * full JWT implementation — just this one fixed shape (`alg: "HS256"`),
 * which is all this monorepo's session tokens need.
 */
export function signSessionToken(payload: SignSessionTokenPayload, secret: string): { token: string; expiresAt: string } {
  const ttlSeconds = payload.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + ttlSeconds;

  const claims: SessionTokenClaims = {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    scope: payload.scope,
    ...(payload.customerId !== undefined ? { customerId: payload.customerId } : {}),
    ...(payload.role !== undefined ? { role: payload.role } : {}),
    iat: nowSeconds,
    exp
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(HEADER));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const signature = computeSignature(`${encodedHeader}.${encodedPayload}`, secret);

  return {
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
    expiresAt: new Date(exp * 1000).toISOString()
  };
}

function isAuthScope(value: unknown): value is AuthScope {
  return value === "shop" || value === "cms";
}

function isRole(value: unknown): value is "admin" | "editor" {
  return value === "admin" || value === "editor";
}

/**
 * Verifies a token produced by `signSessionToken`: checks the HMAC
 * signature in constant time, then the expiry claim. Never throws — any
 * malformed input (wrong shape, bad base64, unparsable JSON, wrong number
 * of segments) yields `null`, same as a bad signature or an expired token.
 */
export function verifySessionToken(token: string, secret: string): AuthUser | null {
  if (typeof token !== "string" || token.length === 0) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  if (!encodedHeader || !encodedPayload || !signature) return null;

  try {
    const expectedSignature = computeSignature(`${encodedHeader}.${encodedPayload}`, secret);
    const expectedBuffer = Buffer.from(expectedSignature);
    const actualBuffer = Buffer.from(signature);

    // Length check first: `timingSafeEqual` throws on mismatched lengths,
    // and a length mismatch means "not equal" anyway (no timing signal is
    // lost by short-circuiting on this public property of the input).
    if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
      return null;
    }

    const claims = JSON.parse(base64UrlDecodeToUtf8(encodedPayload)) as Partial<SessionTokenClaims> | null;

    if (
      !claims ||
      typeof claims.sub !== "string" ||
      typeof claims.email !== "string" ||
      typeof claims.name !== "string" ||
      !isAuthScope(claims.scope) ||
      typeof claims.exp !== "number"
    ) {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (claims.exp <= nowSeconds) return null;

    const user: AuthUser = {
      id: claims.sub,
      email: claims.email,
      name: claims.name,
      scope: claims.scope
    };

    if (typeof claims.customerId === "string") user.customerId = claims.customerId;
    if (isRole(claims.role)) user.role = claims.role;

    return user;
  } catch {
    return null;
  }
}
