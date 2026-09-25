import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ApiError, withApi } from "../_lib/http";
import { resolveDataDir } from "../_lib/cms/file-store";

/** Content types guessed from the file extension; anything else falls back to `application/octet-stream`. */
const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".css": "text/css",
  ".js": "text/javascript"
};

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

/** Vercel gives a catch-all segment as an array; the local dev server (see `compileRoute` in scripts/dev-server.ts) normalizes it the same way, but accept a bare string too for safety. */
function segmentsFrom(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((segment): segment is string => typeof segment === "string" && segment.length > 0);
  }
  if (typeof raw === "string" && raw) {
    return raw.split("/").filter(Boolean);
  }
  return [];
}

/**
 * GET /api/uploads/:bucket/:...rest -> the raw file bytes.
 *
 * Serves whatever `FileBlobStore` wrote under `CMS_DATA_DIR/uploads/...`
 * (dev/file-backend only — Supabase Storage serves its own public URLs
 * directly and never reaches this route). Path-traversal safe: every
 * candidate path is resolved and checked to still be inside the uploads
 * root before it's read.
 */
export default withApi(["GET"], async (request, response) => {
  const segments = segmentsFrom(request.query.path);
  if (segments.length === 0) {
    throw new ApiError(400, "invalid_query", "path is required.");
  }

  const uploadsRoot = path.resolve(resolveDataDir(), "uploads");
  const target = path.resolve(uploadsRoot, ...segments);

  if (target !== uploadsRoot && !target.startsWith(uploadsRoot + path.sep)) {
    throw new ApiError(404, "not_found", "File not found.");
  }

  let size: number;
  try {
    const stats = await stat(target);
    if (!stats.isFile()) {
      throw new ApiError(404, "not_found", "File not found.");
    }
    size = stats.size;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(404, "not_found", "File not found.");
  }

  const data = await readFile(target);
  response.status(200);
  response.setHeader("Content-Type", contentTypeFor(target));
  response.setHeader("Content-Length", String(size));
  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=31536000, immutable");
  response.end(data as unknown as string);
});
