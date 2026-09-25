import { DEFAULT_TOKEN_TTL_SECONDS } from "@three-acts/auth/server";
import { ApiError } from "../http";

const DEV_SECRET = "three-acts-dev-secret";
let warnedDevSecret = false;

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/**
 * The HMAC secret `@three-acts/auth/server`'s `signSessionToken`/
 * `verifySessionToken` sign and verify with. Outside production, an unset
 * `AUTH_SECRET` falls back to a fixed, well-known dev secret (logged once)
 * so local dev and tests need zero configuration; in production an unset
 * secret is a hard failure — sessions must never be signed with a value
 * every clone of this repo shares.
 */
export function getAuthSecret(): string {
  const configured = process.env.AUTH_SECRET;
  if (configured && configured.trim()) {
    return configured.trim();
  }

  if (isProduction()) {
    throw new ApiError(503, "auth_unconfigured", "Set AUTH_SECRET to enable authentication.");
  }

  if (!warnedDevSecret) {
    warnedDevSecret = true;
    console.warn("[auth] AUTH_SECRET is not set; signing sessions with an insecure dev fallback secret. Set AUTH_SECRET before deploying.");
  }
  return DEV_SECRET;
}

/** `AUTH_TOKEN_TTL_SECONDS`, falling back to the package default (14 days). */
export function getTokenTtlSeconds(): number {
  const raw = process.env.AUTH_TOKEN_TTL_SECONDS;
  if (!raw || !raw.trim()) {
    return DEFAULT_TOKEN_TTL_SECONDS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_TOKEN_TTL_SECONDS;
}

export type CmsAuthMode = "open" | "env";

/**
 * `CMS_AUTH_MODE`: "open" (any non-empty email/password signs in — the dev
 * default) or "env" (must match `CMS_EDITORS` — the production default).
 */
export function getCmsAuthMode(): CmsAuthMode {
  const raw = process.env.CMS_AUTH_MODE;
  if (raw === "open" || raw === "env") {
    return raw;
  }
  return isProduction() ? "env" : "open";
}

export type CmsEditor = { email: string; password: string };

/** Parses `CMS_EDITORS="email:password,email:password"`. Malformed entries (no `:`, empty email/password) are skipped. */
export function getCmsEditors(): CmsEditor[] {
  const raw = process.env.CMS_EDITORS;
  if (!raw) {
    return [];
  }

  const editors: CmsEditor[] = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex < 0) continue;

    const email = trimmed.slice(0, separatorIndex).trim().toLowerCase();
    const password = trimmed.slice(separatorIndex + 1);
    if (!email || !password) continue;

    editors.push({ email, password });
  }
  return editors;
}

/**
 * `SHOP_OPEN_PASSWORDS`: whether a seeded `customers` record with no
 * identity yet may sign in with any password (that password is then stored
 * as its identity). Defaults to `true` outside production, `false` in
 * production — this is a dev convenience, not something to leave open live.
 */
export function shopOpenPasswords(): boolean {
  const raw = process.env.SHOP_OPEN_PASSWORDS;
  if (raw !== undefined && raw.trim()) {
    const normalized = raw.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return !isProduction();
}
