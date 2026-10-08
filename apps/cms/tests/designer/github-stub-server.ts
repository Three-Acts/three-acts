import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { contentDefinitions, contentPath, serializeContent } from "@three-acts/static-content";

type File = { content: string; sha: string };
const blobSha = (content: string) => createHash("sha1").update(`blob ${Buffer.byteLength(content)}\0${content}`).digest("hex");
const initialHead = "1111111111111111111111111111111111111111";
const files = new Map<string, File>();
for (const definition of contentDefinitions) {
  const content = serializeContent(definition.content);
  files.set(contentPath(definition.id), { content, sha: blobSha(content) });
}
const snapshots = new Map([[initialHead, files]]);
const trees = new Map([["2222222222222222222222222222222222222222", new Map(files)]]);
const commits = new Map<string, { tree: string; parent?: string; message?: string }>([[initialHead, { tree: "2222222222222222222222222222222222222222" }]]);
let head = initialHead;
let nextId = 1;

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const path = decodeURIComponent(url.pathname.replace(/^\/repos\/test\/site/, ""));
  let body: unknown;
  if (request.method === "POST" || request.method === "PATCH") {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined;
  }
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  const send = (status: number, value: unknown) => {
    response.statusCode = status;
    response.end(JSON.stringify(value));
  };

  // The browser test uses this local-only hook to simulate a teammate pushing
  // a newer version after the CMS has loaded its original file SHA.
  if (request.method === "POST" && url.pathname === "/__e2e/external-change") {
    const input = body as { path?: string; content?: string } | undefined;
    const source = snapshots.get(head);
    if (!input?.path || typeof input.content !== "string" || !source) {
      send(400, { message: "path and content are required" });
      return;
    }
    const updated = new Map(source);
    updated.set(input.path, { content: input.content, sha: blobSha(input.content) });
    const tree = (nextId++).toString(16).padStart(40, "0");
    trees.set(tree, updated);
    const sha = (nextId++).toString(16).padStart(40, "0");
    commits.set(sha, { tree, parent: head });
    snapshots.set(sha, updated);
    head = sha;
    send(200, { sha });
    return;
  }

  if (request.method === "GET" && path === "/git/ref/heads/content") {
    send(200, { object: { sha: head } });
    return;
  }
  if (request.method === "GET" && path === "/commits") {
    const history = [];
    let sha: string | undefined = url.searchParams.get("sha") ?? head;
    while (sha && history.length < 100) {
      const commit = commits.get(sha); if (!commit) break;
      history.push({ sha, commit: { message: commit.message ?? "Initial content" } }); sha = commit.parent;
    }
    send(200, history); return;
  }
  const compare = path.match(/^\/compare\/([a-f0-9]{40})\.\.\.([a-f0-9]{40})$/);
  if (request.method === "GET" && compare) {
    let sha: string | undefined = compare[2];
    while (sha && sha !== compare[1]) sha = commits.get(sha)?.parent;
    send(200, { merge_base_commit: { sha: sha ?? initialHead } }); return;
  }
  const commitMatch = path.match(/^\/git\/commits\/([a-f0-9]{40})$/);
  if (request.method === "GET" && commitMatch) {
    const commit = commits.get(commitMatch[1]);
    if (!commit) return send(404, { message: "commit not found" });
    send(200, { tree: { sha: commit.tree } });
    return;
  }
  const contentMatch = path.match(/^\/contents\/(.+)$/);
  if (request.method === "GET" && contentMatch) {
    const file = snapshots.get(url.searchParams.get("ref") ?? head)?.get(contentMatch[1]);
    if (!file) return send(404, { message: "content not found" });
    send(200, { type: "file", sha: file.sha, encoding: "base64", content: Buffer.from(file.content).toString("base64") });
    return;
  }
  if (request.method === "POST" && path === "/git/trees") {
    const input = body as { base_tree?: string; tree?: Array<{ path: string; content: string }> };
    const source = trees.get(input.base_tree ?? "");
    if (!source) return send(422, { message: "base tree not found" });
    const updated = new Map(source);
    for (const entry of input.tree ?? []) updated.set(entry.path, { content: entry.content, sha: blobSha(entry.content) });
    const sha = (nextId++).toString(16).padStart(40, "0");
    trees.set(sha, updated);
    send(201, { sha });
    return;
  }
  if (request.method === "POST" && path === "/git/commits") {
    const input = body as { tree?: string; parents?: string[]; message?: string };
    const tree = input.tree ?? "";
    const snapshot = trees.get(tree);
    if (!snapshot) return send(422, { message: "tree not found" });
    const sha = (nextId++).toString(16).padStart(40, "0");
    commits.set(sha, { tree, parent: input.parents?.[0], message: input.message });
    snapshots.set(sha, new Map(snapshot));
    send(201, { sha, html_url: `https://github.com/test/site/commit/${sha}` });
    return;
  }
  if (request.method === "PATCH" && path === "/git/refs/heads/content") {
    const input = body as { sha?: string; force?: boolean };
    if (input.force !== false || !input.sha || commits.get(input.sha)?.parent !== head) return send(422, { message: "invalid or non-fast-forward ref update" });
    head = input.sha;
    send(200, { object: { sha: head } });
    return;
  }
  send(404, { message: `unexpected route ${request.method} ${path}` });
});

const port = Number(process.env.PORT ?? 5180);
server.listen(port, "127.0.0.1", () => process.stdout.write(`[github-stub] listening on 127.0.0.1:${port}\n`));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
