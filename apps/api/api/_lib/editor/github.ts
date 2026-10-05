import { createHash } from "node:crypto";
import { contentDefinitions, contentPath, serializeContent, validateContent, type ContentObject, type EditorChange, type EditorDocument, type EditorPushResult, type EditorWorkspace } from "@three-acts/static-content";
import { ApiError } from "../http";

type GithubConfig = { repository: string; branch: string; token: string; base: string };
function config(): GithubConfig | null {
  const repository = process.env.EDITOR_GITHUB_REPOSITORY?.trim();
  const branch = process.env.EDITOR_GITHUB_BRANCH?.trim();
  const token = process.env.EDITOR_GITHUB_TOKEN?.trim();
  if (!repository && !branch && !token) return null;
  if (!repository || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository) || !branch || !token) {
    throw new ApiError(503, "github_unconfigured", "Set EDITOR_GITHUB_REPOSITORY, EDITOR_GITHUB_BRANCH and EDITOR_GITHUB_TOKEN in the API.");
  }
  return { repository, branch, token, base: (process.env.EDITOR_GITHUB_API_BASE || "https://api.github.com").replace(/\/+$/, "") };
}

async function github<T>(settings: GithubConfig, path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${settings.base}/repos/${settings.repository}${path}`, {
      method,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${settings.token}`, "X-GitHub-Api-Version": "2026-03-10", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    throw new ApiError(502, "github_unavailable", "GitHub could not be reached. Your drafts are still saved; try again.");
  }
  if (!response.ok) {
    if (response.status === 409 || response.status === 422) throw new ApiError(409, "content_conflict", "The branch changed or GitHub rejected this update. Reload and review your drafts before trying again.");
    if (response.status === 401 || response.status === 403) throw new ApiError(502, "github_access_denied", "GitHub denied access. Check the server token's Contents permission and branch protection.");
    if (response.status === 404) throw new ApiError(502, "github_not_found", "The configured repository, branch or content file was not found. Deploy the content files to that branch first.");
    throw new ApiError(502, "github_error", "GitHub could not complete this request. Your drafts are still saved.");
  }
  return await response.json() as T;
}

const branchPath = (branch: string) => branch.split("/").map(encodeURIComponent).join("/");
async function head(settings: GithubConfig) {
  const reference = await github<{ object: { sha: string } }>(settings, `/git/ref/heads/${branchPath(settings.branch)}`);
  return reference.object.sha;
}

async function readDocument(settings: GithubConfig, id: string, ref: string): Promise<EditorDocument> {
  const definition = contentDefinitions.find((item) => item.id === id)!;
  const file = await github<{ type: string; sha: string; encoding: string; content: string }>(settings, `/contents/${contentPath(id)}?ref=${encodeURIComponent(ref)}`);
  if (file.type !== "file" || file.encoding !== "base64" || !file.content) throw new ApiError(502, "invalid_content", "GitHub returned an unsupported content file.");
  let content: ContentObject;
  try { content = validateContent(id, JSON.parse(Buffer.from(file.content, "base64").toString("utf8"))); }
  catch { throw new ApiError(409, "content_schema_changed", `The fields for ${definition.label} changed. Redeploy the editor to match the repository.`); }
  return { ...definition, content, sha: file.sha };
}

export async function loadEditorWorkspace(): Promise<EditorWorkspace> {
  const settings = config();
  if (!settings) {
    const documents = contentDefinitions.map((definition) => {
      const raw = serializeContent(definition.content);
      const sha = createHash("sha1").update(`blob ${Buffer.byteLength(raw)}\0${raw}`).digest("hex");
      return { ...definition, sha };
    });
    return { connected: false, repository: null, branch: null, documents };
  }
  const ref = await head(settings);
  const documents = await Promise.all(contentDefinitions.map((definition) => readDocument(settings, definition.id, ref)));
  return { connected: true, repository: settings.repository, branch: settings.branch, documents };
}

export async function pushEditorContent(input: unknown): Promise<EditorPushResult> {
  const settings = config();
  if (!settings) throw new ApiError(503, "github_unconfigured", "Connect GitHub in the API's environment settings before pushing.");
  if (!input || typeof input !== "object") throw new ApiError(400, "invalid_request", "Invalid push request.");
  const { changes, message } = input as { changes?: unknown; message?: unknown };
  if (!Array.isArray(changes) || changes.length < 1 || changes.length > contentDefinitions.length || typeof message !== "string" || !message.trim() || message.length > 200) {
    throw new ApiError(400, "invalid_request", "Choose changed pages and enter a commit message under 200 characters.");
  }
  if (Buffer.byteLength(JSON.stringify(input)) > 512000) throw new ApiError(413, "content_too_large", "This update is too large. Push fewer pages at a time.");
  const ids = new Set<string>();
  const validated: EditorChange[] = changes.map((change) => {
    if (!change || typeof change !== "object" || typeof change.id !== "string" || typeof change.sha !== "string" || !/^[a-f0-9]{40}$/.test(change.sha) || ids.has(change.id)) throw new ApiError(400, "invalid_request", "Invalid or duplicate content document.");
    ids.add(change.id);
    try { return { id: change.id, sha: change.sha, content: validateContent(change.id, change.content) }; }
    catch (error) { throw new ApiError(400, "invalid_content", error instanceof Error ? error.message : "Invalid content."); }
  });
  const parent = await head(settings);
  const originals = await Promise.all(validated.map((change) => readDocument(settings, change.id, parent)));
  if (validated.some((change, index) => change.sha !== originals[index].sha)) throw new ApiError(409, "content_conflict", "A page changed on GitHub since you started editing. Reload and review your drafts.");
  const commit = await github<{ tree: { sha: string } }>(settings, `/git/commits/${parent}`);
  const tree = await github<{ sha: string }>(settings, "/git/trees", "POST", {
    base_tree: commit.tree.sha,
    tree: validated.map((change) => ({ path: contentPath(change.id), mode: "100644", type: "blob", content: serializeContent(change.content) }))
  });
  const next = await github<{ sha: string; html_url: string }>(settings, "/git/commits", "POST", { message: message.trim(), tree: tree.sha, parents: [parent] });
  // Never force: a concurrent change after our read must reject the update.
  await github(settings, `/git/refs/heads/${branchPath(settings.branch)}`, "PATCH", { sha: next.sha, force: false });
  const documents = await Promise.all(validated.map((change) => readDocument(settings, change.id, next.sha)));
  return { sha: next.sha, url: `https://github.com/${settings.repository}/commit/${next.sha}`, documents };
}
