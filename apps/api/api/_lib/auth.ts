/**
 * Backwards-compatible re-export: every existing `/api/cms/*` and
 * `/api/deploy*` route imports `requireAuth` from here. The real
 * implementation now lives at `./auth/sessions` as `requireCmsAuth` (it
 * accepts a `cms`-scoped session token in addition to the legacy
 * `PUBLISH_TOKEN` bearer this used to be the only check for) — see that
 * module for the full auth surface (`requireShopAuth`, `authenticate`,
 * `issueSession`, ...).
 */
export { requireCmsAuth as requireAuth } from "./auth/sessions";
