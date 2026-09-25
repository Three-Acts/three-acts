import { ok, withApi } from "../_lib/http";
import { findRecords } from "../_lib/cms/service";

type RedirectStatusCode = 301 | 302 | 307 | 308;

type RedirectRule = {
  sourcePath: string;
  targetUrl: string;
  statusCode: RedirectStatusCode;
  permanent: boolean;
};

function statusCodeFrom(value: unknown): RedirectStatusCode {
  const parsed = Number(value);
  return parsed === 301 || parsed === 302 || parsed === 307 || parsed === 308 ? parsed : 301;
}

/**
 * GET /api/content/redirects -> { redirects: RedirectRule[] }
 *
 * Public (no bearer token): the web build loads this into Astro's redirect
 * config. `redirect-rules` is a `data`-mode collection (no publish workflow),
 * so every record is live the moment an editor saves it — this returns all
 * of them, not just "published" ones (that status doesn't apply here).
 */
export default withApi(["GET"], async (_request, response) => {
  const records = await findRecords("redirect-rules", () => true);

  const redirects: RedirectRule[] = records.map((record) => {
    const statusCode = statusCodeFrom(record.values.statusCode);
    return {
      sourcePath: String(record.values.sourcePath ?? ""),
      targetUrl: String(record.values.targetUrl ?? ""),
      statusCode,
      permanent: Boolean(record.values.permanent)
    };
  });

  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  ok(response, { redirects });
});
