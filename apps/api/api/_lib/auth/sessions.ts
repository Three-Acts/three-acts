import type { VercelRequest } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import type { AuthUser, Session } from "@three-acts/auth";
import { signSessionToken, verifySessionToken } from "@three-acts/auth/server";
import { ApiError } from "../http";
import { getAuthSecret, getTokenTtlSeconds } from "./config";

/** Signs a `Session` for `user`, using the configured secret and TTL (see `config.ts`). */
export function issueSession(user: AuthUser): Session {
  const secret = getAuthSecret();
  const ttlSeconds = getTokenTtlSeconds();

  const signed = signSessionToken(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      scope: user.scope,
      customerId: user.customerId,
      role: user.role,
      ttlSeconds
    },
    secret
  );

  return { token: signed.token, user, expiresAt: signed.expiresAt };
}

/** `Authorization: Bearer <token>` -> `<token>`, or `null` when absent/malformed. */
export function readBearer(request: VercelRequest): string | null {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token ? token : null;
}

/**
 * Verifies the request's bearer token, if any. Never throws — a missing,
 * malformed, expired, or (in production) unverifiable-because-unconfigured
 * token all yield `null`, same as an absent header. Used by routes that
 * behave differently for a signed-in caller but never require one (session
 * check, checkout's optional customer attribution).
 */
export function authenticate(request: VercelRequest): AuthUser | null {
  const token = readBearer(request);
  if (!token) {
    return null;
  }
  try {
    return verifySessionToken(token, getAuthSecret());
  } catch {
    return null;
  }
}

/** Requires a valid `scope: "shop"` session. Throws 401 `unauthorized` otherwise. */
export function requireShopAuth(request: VercelRequest): AuthUser {
  const user = authenticate(request);
  if (!user || user.scope !== "shop") {
    throw new ApiError(401, "unauthorized", "Sign in required.");
  }
  return user;
}

const PUBLISH_TOKEN_USER: AuthUser = {
  id: "cms:publish-token",
  email: "publish-token@local",
  name: "Publish token",
  scope: "cms",
  role: "editor"
};

const DEV_STOPGAP_USER: AuthUser = {
  id: "cms:dev-stopgap",
  email: "dev@local",
  name: "Dev (no auth configured)",
  scope: "cms",
  role: "editor"
};

/**
 * Requires CMS access: accepts either a valid `scope: "cms"` session token,
 * or — for backwards compatibility with deploy scripts/CI that predate
 * login — the legacy `PUBLISH_TOKEN` bearer, compared in constant time.
 *
 * A bearer that verifies as a *valid* session for a different scope (e.g. a
 * signed-in shopper's `scope: "shop"` token) is rejected outright rather
 * than falling through to the `PUBLISH_TOKEN` comparison: it's a real,
 * authenticated caller who simply isn't a CMS editor, not "no token sent".
 *
 * When no bearer is sent at all (or it's garbage that doesn't verify as any
 * session), this falls back to the original `requireAuth`'s exact rule: an
 * unconfigured `PUBLISH_TOKEN` allows the request outside production (the
 * long-standing local-dev stopgap) and returns 503 in production; a
 * configured `PUBLISH_TOKEN` requires the bearer to match it.
 */
export function requireCmsAuth(request: VercelRequest): AuthUser {
  const bearer = readBearer(request);

  if (bearer) {
    let sessionUser: AuthUser | null = null;
    try {
      sessionUser = verifySessionToken(bearer, getAuthSecret());
    } catch {
      sessionUser = null;
    }

    if (sessionUser) {
      if (sessionUser.scope === "cms") {
        return sessionUser;
      }
      throw new ApiError(401, "unauthorized", "Unauthorized.");
    }
  }

  const publishToken = process.env.PUBLISH_TOKEN;

  if (!publishToken) {
    if (process.env.VERCEL_ENV !== "production") {
      return DEV_STOPGAP_USER;
    }
    throw new ApiError(503, "publishing_unconfigured", "Set PUBLISH_TOKEN to enable publishing.");
  }

  const provided = bearer ?? "";
  const expected = Buffer.from(publishToken);
  const actual = Buffer.from(provided);
  const isAuthorized = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!isAuthorized) {
    throw new ApiError(401, "unauthorized", "Unauthorized.");
  }

  return PUBLISH_TOKEN_USER;
}
