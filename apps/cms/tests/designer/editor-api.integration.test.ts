import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import test, { type TestContext } from "node:test";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { signSessionToken } from "@three-acts/auth/server";
import { contentDefinitions, contentPath, serializeContent, defaultLayout, duplicateSection, type ContentObject, type EditorPushResult, type EditorWorkspace } from "@three-acts/static-content";
import homeSource from "@three-acts/static-content/documents/home.json";
import contentRoute from "../../../api/api/editor/content";
import pushRoute from "../../../api/api/editor/push";

const AUTH_SECRET = "editor-api-integration-secret";
const ENV_KEYS = [
  "AUTH_SECRET",
  "EDITOR_GITHUB_REPOSITORY",
  "EDITOR_GITHUB_BRANCH",
  "EDITOR_GITHUB_TOKEN",
  "EDITOR_GITHUB_API_BASE",
  "PUBLISH_TOKEN",
  "VERCEL_ENV"
] as const;

type GitFile = { content: string; sha: string };
type StubCall = { method: string; path: string; body?: unknown };

const gitBlobSha = (content: string) =>
  createHash("sha1").update(`blob ${Buffer.byteLength(content)}\0${content}`).digest("hex");

/** Small in-memory GitHub REST stub with Git ref/tree/commit and Contents semantics. */
class GithubStub {
  readonly calls: StubCall[] = [];
  readonly snapshots = new Map<string, Map<string, GitFile>>();
  readonly trees = new Map<string, Map<string, GitFile>>();
  readonly commits = new Map<string, { tree: string; parent: string | null }>();
  head = "1111111111111111111111111111111111111111";
  rejectRefUpdate = false;
  private server?: Server;
  private counter = 1;
  baseUrl = "";

  async start(): Promise<void> {
    const files = new Map<string, GitFile>();
    for (const definition of contentDefinitions) {
      const content = serializeContent(definition.content);
      files.set(contentPath(definition.id), { content, sha: gitBlobSha(content) });
    }
    this.snapshots.set(this.head, files);
    const tree = "2222222222222222222222222222222222222222";
    this.trees.set(tree, new Map(files));
    this.commits.set(this.head, { tree, parent: null });

    this.server = createServer((request, response) => {
      void this.handle(request, response);
    });
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    const address = this.server.address();
    if (!address || typeof address === "string") throw new Error("GitHub stub did not bind a TCP port.");
    this.baseUrl = `http://127.0.0.1:${address.port}`;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => this.server!.close((error) => (error ? reject(error) : resolve())));
    this.server = undefined;
  }

  private async handle(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) {
    const url = new URL(request.url ?? "/", this.baseUrl);
    const path = decodeURIComponent(url.pathname.replace(/^\/repos\/test\/site/, ""));
    let body: unknown;
    if (request.method === "POST" || request.method === "PATCH") {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined;
    }
    this.calls.push({ method: request.method ?? "GET", path: `${path}${url.search}`, body });
    response.setHeader("Content-Type", "application/json; charset=utf-8");

    const send = (status: number, data: unknown) => {
      response.statusCode = status;
      response.end(JSON.stringify(data));
    };

    if (request.method === "GET" && path === "/git/ref/heads/content") {
      send(200, { object: { sha: this.head } });
      return;
    }
    const commitMatch = path.match(/^\/git\/commits\/([a-f0-9]{40})$/);
    if (request.method === "GET" && commitMatch) {
      const commit = this.commits.get(commitMatch[1]);
      if (!commit) return send(404, { message: "commit not found" });
      send(200, { tree: { sha: commit.tree } });
      return;
    }
    const contentMatch = path.match(/^\/contents\/(.+)$/);
    if (request.method === "GET" && contentMatch) {
      const ref = url.searchParams.get("ref") ?? this.head;
      const file = this.snapshots.get(ref)?.get(contentMatch[1]);
      if (!file) return send(404, { message: "content not found" });
      send(200, { type: "file", sha: file.sha, encoding: "base64", content: Buffer.from(file.content).toString("base64") });
      return;
    }
    if (request.method === "POST" && path === "/git/trees") {
      const input = body as { base_tree?: string; tree?: Array<{ path: string; content: string }> };
      const source = this.trees.get(input.base_tree ?? "");
      if (!source) return send(422, { message: "base tree not found" });
      const updated = new Map(source);
      for (const entry of input.tree ?? []) updated.set(entry.path, { content: entry.content, sha: gitBlobSha(entry.content) });
      const sha = this.nextSha();
      this.trees.set(sha, updated);
      send(201, { sha });
      return;
    }
    if (request.method === "POST" && path === "/git/commits") {
      const input = body as { tree?: string; parents?: string[] };
      const files = this.trees.get(input.tree ?? "");
      if (!files) return send(422, { message: "tree not found" });
      const sha = this.nextSha();
      this.commits.set(sha, { tree: input.tree!, parent: input.parents?.[0] ?? null });
      this.snapshots.set(sha, new Map(files));
      send(201, { sha, html_url: `https://github.com/test/site/commit/${sha}` });
      return;
    }
    if (request.method === "PATCH" && path === "/git/refs/heads/content") {
      if (this.rejectRefUpdate) return send(422, { message: "branch moved" });
      const input = body as { sha?: string; force?: boolean };
      if (input.force !== false || !input.sha || !this.commits.has(input.sha)) return send(422, { message: "invalid ref update" });
      this.head = input.sha;
      send(200, { object: { sha: this.head } });
      return;
    }
    send(404, { message: `unexpected route ${request.method} ${path}` });
  }

  private nextSha(): string {
    return (this.counter++).toString(16).padStart(40, "0");
  }
}

type ApiBody = { ok: true; data?: unknown } | { ok: false; error?: { code: string; message: string } };
type ApiResult = { status: number; body: ApiBody; headers: Record<string, string> };

function resultData<T>(result: ApiResult): T {
  assert.equal(result.body.ok, true);
  assert.ok(result.body.data);
  return result.body.data as T;
}

function errorCode(result: ApiResult): string | undefined {
  assert.equal(result.body.ok, false);
  return result.body.error?.code;
}

async function invoke(handler: (request: VercelRequest, response: VercelResponse) => unknown, options: {
  method: string;
  token?: string;
  body?: unknown;
}): Promise<ApiResult> {
  const headers: Record<string, string> = {};
  let status = 200;
  let result: ApiBody = { ok: false };
  const response = {
    status(code: number) { status = code; return this; },
    setHeader(name: string, value: string | number | readonly string[]) { headers[name.toLowerCase()] = String(value); return this; },
    json(value: ApiBody) { result = value; return this; },
    get headersSent() { return false; }
  } as unknown as VercelResponse;
  const request = {
    method: options.method,
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    body: options.body ?? {},
    query: {}
  } as unknown as VercelRequest;
  await handler(request, response);
  return { status, body: result, headers };
}

async function setup(t: TestContext) {
  const original = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.AUTH_SECRET = AUTH_SECRET;
  process.env.EDITOR_GITHUB_REPOSITORY = "test/site";
  process.env.EDITOR_GITHUB_BRANCH = "content";
  process.env.EDITOR_GITHUB_TOKEN = "test-token";
  process.env.VERCEL_ENV = "preview";
  delete process.env.PUBLISH_TOKEN;

  const github = new GithubStub();
  await github.start();
  process.env.EDITOR_GITHUB_API_BASE = github.baseUrl;
  const token = signSessionToken({ sub: "editor-1", email: "editor@example.com", name: "Editor", scope: "cms", role: "editor" }, AUTH_SECRET).token;

  t.after(async () => {
    await github.stop();
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  return { github, token };
}

function copyDocument(id: string): ContentObject {
  const definition = contentDefinitions.find((item) => item.id === id);
  assert.ok(definition, `expected the ${id} document in the static content registry`);
  return structuredClone(definition.content) as ContentObject;
}

test("content and push routes require a CMS session before contacting GitHub", async (t) => {
  const { github } = await setup(t);

  const content = await invoke(contentRoute, { method: "GET" });
  const push = await invoke(pushRoute, { method: "POST", body: { message: "update", changes: [] } });
  const shopToken = signSessionToken({ sub: "shop-1", email: "customer@example.com", name: "Customer", scope: "shop" }, AUTH_SECRET).token;
  const shopSession = await invoke(contentRoute, { method: "GET", token: shopToken });

  assert.equal(content.status, 401);
  assert.equal(errorCode(content), "unauthorized");
  assert.equal(push.status, 401);
  assert.equal(errorCode(push), "unauthorized");
  assert.equal(shopSession.status, 401);
  assert.equal(errorCode(shopSession), "unauthorized");
  assert.equal(github.calls.length, 0);
});

test("content route reads all documents from the configured branch without caching", async (t) => {
  const { github, token } = await setup(t);

  const response = await invoke(contentRoute, { method: "GET", token });

  assert.equal(response.status, 200);
  const data = resultData<EditorWorkspace>(response);
  assert.equal(data.connected, true);
  assert.equal(data.repository, "test/site");
  assert.equal(data.branch, "content");
  assert.equal(data.source, "github");
  assert.equal(data.headSha, github.head);
  assert.equal(data.connectionMode, "server");
  assert.equal(data.documents[0].sourcePath, contentPath(data.documents[0].id));
  assert.equal(JSON.stringify(data).includes("test-token"), false, "server credentials must never be returned to the CMS");
  assert.deepEqual(data.documents.map(({ id }) => id), contentDefinitions.map(({ id }) => id));
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(github.calls.filter(({ method }) => method === "GET").length, contentDefinitions.length + 1);
});

test("push creates one commit for multiple documents, preserves untouched files, and reads committed content back", async (t) => {
  const { github, token } = await setup(t);
  const initial = await invoke(contentRoute, { method: "GET", token });
  const home = copyDocument("home");
  const faq = copyDocument("faq");
  (home.hero_section as Record<string, unknown>).display_1 = "A locally pushed headline";
  (faq.faq as Record<string, unknown>).title_2 = "An updated FAQ title";
  const initialData = resultData<EditorWorkspace>(initial);
  const homeSha = initialData.documents.find(({ id }) => id === "home")!.sha;
  const faqSha = initialData.documents.find(({ id }) => id === "faq")!.sha;
  const response = await invoke(pushRoute, {
    method: "POST",
    token,
    body: { message: "Refresh two pages", changes: [{ id: "home", sha: homeSha, content: home }, { id: "faq", sha: faqSha, content: faq }] }
  });

  assert.equal(response.status, 200);
  const result = resultData<EditorPushResult>(response);
  assert.match(result.sha, /^[a-f0-9]{40}$/);
  assert.equal(result.url, `https://github.com/test/site/commit/${result.sha}`);
  assert.deepEqual(result.documents.map(({ id }) => id), ["home", "faq"]);
  assert.deepEqual(result.documents.map(({ content }) => content), [home, faq]);
  assert.equal(github.head, result.sha);

  const resultingTree = github.commits.get(github.head)?.tree;
  const resultingFiles = resultingTree && github.trees.get(resultingTree);
  assert.ok(resultingFiles);
  assert.equal(JSON.parse(resultingFiles.get(contentPath("home"))!.content).hero_section.display_1, "A locally pushed headline");
  assert.equal(JSON.parse(resultingFiles.get(contentPath("faq"))!.content).faq.title_2, "An updated FAQ title");
  assert.equal(resultingFiles.get(contentPath("about"))!.content, serializeContent(contentDefinitions.find(({ id }) => id === "about")!.content));
  const refUpdate = github.calls.find(({ method }) => method === "PATCH");
  assert.deepEqual(refUpdate?.body, { sha: github.head, force: false });
  assert.equal(github.calls.filter(({ method, path }) => method === "POST" && path === "/git/commits").length, 1);
});

test("stale document SHA returns a conflict and never attempts a branch update", async (t) => {
  const { github, token } = await setup(t);
  const document = copyDocument("home");
  const response = await invoke(pushRoute, {
    method: "POST",
    token,
    body: { message: "Stale edit", changes: [{ id: "home", sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", content: document }] }
  });

  assert.equal(response.status, 409);
  assert.equal(errorCode(response), "content_conflict");
  assert.equal(github.calls.some(({ method }) => method === "PATCH"), false);
  assert.equal(github.calls.some(({ method, path }) => method === "POST" && path.startsWith("/git/")), false);
});

test("content schema, unsafe URLs, duplicate documents, unknown IDs, and rejected ref updates cannot publish", async (t) => {
  const { github, token } = await setup(t);
  const workspace = await invoke(contentRoute, { method: "GET", token });
  const documents = resultData<EditorWorkspace>(workspace).documents;
  const homeSha = documents.find(({ id }) => id === "home")!.sha;
  const faqSha = documents.find(({ id }) => id === "faq")!.sha;
  const beforeWrites = () => github.calls.filter(({ method }) => method === "POST" || method === "PATCH").length;

  const unsafe = copyDocument("faq");
  ((unsafe.faq as Record<string, unknown>).href_6) = "javascript:alert(1)";
  const invalidSchema = copyDocument("home");
  invalidSchema.unexpected = "extra";
  const badRequests: Array<{ changes: Array<{ id: string; sha: string; content: ContentObject }>; code: string }> = [
    { changes: [{ id: "faq", sha: faqSha, content: unsafe }], code: "invalid_content" },
    { changes: [{ id: "home", sha: homeSha, content: invalidSchema }], code: "invalid_content" },
    { changes: [{ id: "home", sha: homeSha, content: copyDocument("home") }, { id: "home", sha: homeSha, content: copyDocument("home") }], code: "invalid_request" },
    { changes: [{ id: "missing", sha: homeSha, content: copyDocument("home") }], code: "invalid_content" }
  ];

  for (const { changes, code } of badRequests) {
    const writes = beforeWrites();
    const response = await invoke(pushRoute, { method: "POST", token, body: { message: "Invalid content", changes } });
    assert.equal(response.status, 400);
    assert.equal(errorCode(response), code);
    assert.equal(beforeWrites(), writes, "validation errors must not create trees, commits, or refs");
  }

  github.rejectRefUpdate = true;
  const changed = copyDocument("home");
  (changed.hero_section as Record<string, unknown>).display_1 = "Another process changed the branch";
  const failedRace = await invoke(pushRoute, {
    method: "POST",
    token,
    body: { message: "Concurrent push", changes: [{ id: "home", sha: homeSha, content: changed }] }
  });
  assert.equal(failedRace.status, 409);
  assert.equal(errorCode(failedRace), "content_conflict");
  const attemptedRefUpdate = github.calls.find(({ method }) => method === "PATCH");
  assert.equal(attemptedRefUpdate?.method, "PATCH");
  assert.equal((attemptedRefUpdate?.body as { force?: boolean } | undefined)?.force, false);
  assert.notEqual(github.head, (attemptedRefUpdate?.body as { sha?: string } | undefined)?.sha);
});

test("local preview source is explicit when GitHub is unconfigured; pushes stay disabled and malformed config is rejected", async (t) => {
  const { token } = await setup(t);
  delete process.env.EDITOR_GITHUB_REPOSITORY;
  delete process.env.EDITOR_GITHUB_BRANCH;
  delete process.env.EDITOR_GITHUB_TOKEN;
  const disconnected = await invoke(contentRoute, { method: "GET", token });
  const disabledPush = await invoke(pushRoute, { method: "POST", token, body: { message: "Update", changes: [{ id: "home", sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", content: copyDocument("home") }] } });
  assert.equal(disconnected.status, 200);
  const local = resultData<EditorWorkspace>(disconnected);
  assert.equal(local.connected, false);
  assert.equal(local.source, "local");
  assert.equal(local.headSha, null);
  assert.equal(local.connectionMode, "none");
  assert.equal(local.documents[0].sourcePath, contentPath(local.documents[0].id));
  assert.equal(disabledPush.status, 503);
  assert.equal(errorCode(disabledPush), "github_unconfigured");

  process.env.EDITOR_GITHUB_BRANCH = "content";
  process.env.EDITOR_GITHUB_TOKEN = "test-token";
  const repository = process.env.EDITOR_GITHUB_REPOSITORY;
  process.env.EDITOR_GITHUB_REPOSITORY = "not-a-repository-name";

  const response = await invoke(contentRoute, { method: "GET", token });

  assert.equal(response.status, 503);
  assert.equal(errorCode(response), "github_unconfigured");
  if (repository === undefined) delete process.env.EDITOR_GITHUB_REPOSITORY;
  else process.env.EDITOR_GITHUB_REPOSITORY = repository;
});

test("production fails closed when GitHub is not configured", async (t) => {
  const { token } = await setup(t);
  delete process.env.EDITOR_GITHUB_REPOSITORY;
  delete process.env.EDITOR_GITHUB_BRANCH;
  delete process.env.EDITOR_GITHUB_TOKEN;
  process.env.VERCEL_ENV = "production";

  const response = await invoke(contentRoute, { method: "GET", token });

  assert.equal(response.status, 503);
  assert.equal(errorCode(response), "github_unconfigured");
});

test("partial GitHub configuration fails closed outside production too", async (t) => {
  const { token } = await setup(t);
  delete process.env.EDITOR_GITHUB_REPOSITORY;
  process.env.EDITOR_GITHUB_BRANCH = "content";
  process.env.EDITOR_GITHUB_TOKEN = "test-token";

  const response = await invoke(contentRoute, { method: "GET", token });

  assert.equal(response.status, 503);
  assert.equal(errorCode(response), "github_unconfigured");
});

test("validated design changes publish atomically and stale or unsafe design writes fail closed", async (t) => {
  const { github, token } = await setup(t);
  const workspace = resultData<EditorWorkspace>(await invoke(contentRoute, { method: "GET", token }));
  const design = workspace.documents.find(document => document.id === "design")!;
  const changed = structuredClone(design.content);
  changed.elements = { "home.title": { utilities: ["pb-12", "tablet:pb-24"], customClasses: ["callout"] } };
  changed.customCss = { ".callout": { "padding-bottom": "24px" } };
  const pushed = await invoke(pushRoute, { method: "POST", token, body: { changes: [{ id: "design", sha: design.sha, content: changed }], message: "Save design" } });
  assert.equal(pushed.status, 200);
  const result = resultData<EditorPushResult>(pushed);
  assert.deepEqual(result.documents[0].content, changed);
  const refCalls = github.calls.filter(call => call.method === "PATCH");
  assert.equal(refCalls.length, 1);
  assert.equal((refCalls[0].body as { force: boolean }).force, false);
  const stale = await invoke(pushRoute, { method: "POST", token, body: { changes: [{ id: "design", sha: design.sha, content: changed }], message: "Stale design" } });
  assert.equal(stale.status, 409);
  const unsafe = structuredClone(changed);
  unsafe.customCss = { ".callout": { "background-color": "url(https://example.com)" } };
  const rejected = await invoke(pushRoute, { method: "POST", token, body: { changes: [{ id: "design", sha: result.documents[0].sha, content: unsafe }], message: "Unsafe CSS" } });
  assert.equal(rejected.status, 400);
  assert.equal(github.calls.filter(call => call.method === "PATCH").length, 1);
});

test("composition and scoped design changes commit atomically, with layout validation and SHA protection", async (t) => {
  const { github, token } = await setup(t);
  const workspace = resultData<EditorWorkspace>(await invoke(contentRoute, { method: "GET", token }));
  const layout = workspace.documents.find(document => document.id === "layout")!;
  const design = workspace.documents.find(document => document.id === "design")!;
  const composed = duplicateSection(defaultLayout(), "home-cta", "section-copy", homeSource);
  composed.pages.home.sections["section-copy"].content!.p_1 = "A persisted independent CTA";
  const styled = structuredClone(design.content);
  styled.elements = { "composition.section-copy.source.cta-section.1": { utilities: ["pt-4"], customClasses: [] } };
  const pushed = await invoke(pushRoute, { method: "POST", token, body: { message: "Compose Home", changes: [{ id: "layout", sha: layout.sha, content: composed }, { id: "design", sha: design.sha, content: styled }] } });
  assert.equal(pushed.status, 200);
  const result = resultData<EditorPushResult>(pushed);
  assert.deepEqual(result.documents.find(document => document.id === "layout")?.content, composed);
  assert.equal(github.calls.filter(call => call.method === "PATCH").length, 1);
  const readback = resultData<EditorWorkspace>(await invoke(contentRoute, { method: "GET", token }));
  assert.deepEqual(readback.documents.find(document => document.id === "layout")?.content, composed);
  assert.deepEqual(readback.documents.find(document => document.id === "design")?.content, styled);
  const stale = await invoke(pushRoute, { method: "POST", token, body: { message: "Stale layout", changes: [{ id: "layout", sha: layout.sha, content: composed }] } });
  assert.equal(stale.status, 409);
  const invalid = structuredClone(composed);
  Object.assign(invalid.pages.home.sections["section-copy"], { children: [{ type: "script" }] });
  const rejected = await invoke(pushRoute, { method: "POST", token, body: { message: "Invalid nesting", changes: [{ id: "layout", sha: result.documents.find(document => document.id === "layout")!.sha, content: invalid }] } });
  assert.equal(rejected.status, 400);
  assert.equal(github.calls.filter(call => call.method === "PATCH").length, 1);
});
