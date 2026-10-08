import test from "node:test";
import assert from "node:assert/strict";
import { triggerPublicationDeployment, getPublicationDeployment, publicationConfiguration } from "./deployment";
import { ApiError } from "../http";
import { serializeContent } from "@three-acts/static-content";

const revision = "a".repeat(40);
const publicationId = "d280d96c-5b8f-4d43-8b9b-e5dce7f2ce31";
const identity = { revision, publicationId };
const projectId = "prj_testweb";
const env = { VERCEL_TOKEN: "provider-test-token", VERCEL_PROJECT_ID: projectId, VERCEL_TEAM_ID: "team_test", VERCEL_API_BASE: "http://provider.test", VERCEL_ENV: "preview", EDITOR_PUBLIC_SITE_URL: "http://localhost:6100", EDITOR_GITHUB_REPOSITORY: "test/site", EDITOR_GITHUB_BRANCH: "content", EDITOR_GITHUB_TOKEN: "github-test-token", EDITOR_GITHUB_API_BASE: "http://github.test" };
type Deployment = { id: string; projectId: string; target: string; url: string; readyState: string; gitSource: { sha: string }; meta: Record<string, string> };
function deployment(): Deployment { return { id: "dpl_reviewed", projectId, target: "production", url: "reviewed.vercel.app", readyState: "BUILDING", gitSource: { sha: revision }, meta: { editorPublicationId: publicationId, editorRevision: revision } }; }

function fixture(t: import("node:test").TestContext) {
  const saved = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const originalFetch = globalThis.fetch;
  const state = { project: { id: projectId, name: "test-web", accountId: "team_test", rootDirectory: "apps/web", link: { type: "github", org: "test", repo: "site", productionBranch: "content" } }, domain: { name: "localhost", projectId, verified: true, gitBranch: null as string | null }, deployments: [] as Deployment[], marker: { version: 1, ...identity }, receiptId: publicationId, loseCreateResponse: false, calls: [] as Array<{ origin: string; path: string; method: string; body?: unknown; authorization?: string }> };
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    const method = options?.method ?? "GET";
    const headers = new Headers(options?.headers);
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    state.calls.push({ origin: url.origin, path: url.pathname, method, body, authorization: headers.get("authorization") ?? undefined });
    const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
    if (url.origin === "http://github.test") {
      assert.equal(headers.get("authorization"), "Bearer github-test-token");
      if (url.pathname.includes("/git/ref/heads/")) return json({ object: { sha: revision } });
      if (url.pathname.includes("/contents/")) return json({ type: "file", encoding: "base64", sha: "b".repeat(40), content: Buffer.from(serializeContent({ version: 1, publicationId: state.receiptId })).toString("base64") });
    }
    if (url.origin === "http://provider.test") {
      assert.equal(headers.get("authorization"), "Bearer provider-test-token");
      assert.equal(url.searchParams.get("teamId"), "team_test");
      if (url.pathname.includes("/domains/")) return json(state.domain);
      if (url.pathname.startsWith("/v9/projects/")) return json(state.project);
      if (url.pathname === "/v6/deployments") { assert.equal(url.searchParams.get("target"), "production"); assert.equal(url.searchParams.get("sha"), revision); return json({ deployments: state.deployments.map(item => ({ uid: item.id, meta: item.meta })) }); }
      if (url.pathname === "/v13/deployments" && method === "POST") {
        const created = deployment(); created.id = `dpl_created${state.deployments.length + 1}`;
        state.deployments.unshift(created);
        if (state.loseCreateResponse) { state.loseCreateResponse = false; throw new Error("Simulated response loss after creation"); }
        return json(created);
      }
      if (url.pathname.startsWith("/v13/deployments/")) return json(state.deployments.find(item => item.id === url.pathname.split("/").at(-1)));
    }
    if (url.origin === "http://localhost:6100" && url.pathname === "/editor-revision.json") {
      assert.equal(headers.has("authorization"), false, "Provider credentials must not reach the public verification origin");
      assert.equal(options?.redirect, "error");
      assert.equal(url.searchParams.get("publication"), publicationId);
      return json(state.marker);
    }
    throw new Error(`Unexpected local fixture request: ${method} ${url.origin}${url.pathname}`);
  };
  t.after(() => { globalThis.fetch = originalFetch; for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  return state;
}

test("exact deployment pins Git source and release metadata; a lost response is reconciled without another create", async t => {
  const state = fixture(t);
  assert.equal((await publicationConfiguration()).configured, true);
  state.loseCreateResponse = true;
  await assert.rejects(() => triggerPublicationDeployment(identity), (error: unknown) => error instanceof ApiError && error.code === "publication_provider_unavailable");
  const resumed = await triggerPublicationDeployment(identity);
  assert.equal(resumed.state, "BUILDING");
  assert.equal(state.calls.filter(call => call.method === "POST").length, 1);
  const created = state.calls.find(call => call.method === "POST")!.body as { project: string; gitSource: { sha: string; ref: string }; target: string; meta: Record<string, string> };
  assert.equal(created.gitSource.sha, revision); assert.equal(created.gitSource.ref, "content");
  assert.equal(created.project, projectId); assert.equal(created.target, "production");
  assert.equal(created.meta.editorPublicationId, publicationId);
});

test("READY only becomes live when the configured production origin serves the same revision and receipt", async t => {
  const state = fixture(t); const item = deployment(); item.readyState = "READY"; state.deployments.push(item);
  state.marker.revision = "c".repeat(40);
  assert.equal((await getPublicationDeployment(identity, item.id)).state, "verifying");
  state.marker.revision = revision; state.marker.publicationId = "d280d96c-5b8f-4d43-8b9b-e5dce7f2ce32";
  assert.equal((await getPublicationDeployment(identity, item.id)).state, "verifying");
  state.marker.publicationId = publicationId;
  const live = await getPublicationDeployment(identity, item.id);
  assert.equal(live.state, "live"); assert.equal(live.revision, revision); assert.equal(live.liveUrl, "http://localhost:6100");
});

test("wrong project, target, revision, publication and source receipt cannot pass deployment verification", async t => {
  const state = fixture(t);
  for (const wrong of [{ projectId: "prj_other" }, { target: "preview" }, { gitSource: { sha: "c".repeat(40) } }, { meta: { editorPublicationId: "other", editorRevision: revision } }]) {
    state.deployments = [{ ...deployment(), ...wrong, readyState: "READY" }];
    await assert.rejects(() => getPublicationDeployment(identity, "dpl_reviewed"), (error: unknown) => error instanceof ApiError && error.code === "publication_deployment_mismatch");
    assert.equal((await getPublicationDeployment(identity)).state, "pending");
  }
  state.deployments = [];
  state.receiptId = "d280d96c-5b8f-4d43-8b9b-e5dce7f2ce32";
  await assert.rejects(() => triggerPublicationDeployment(identity), (error: unknown) => error instanceof ApiError && error.code === "publication_revision_conflict");
  assert.equal(state.calls.filter(call => call.method === "POST").length, 0);
  state.project.link.repo = "another-site";
  await assert.rejects(() => publicationConfiguration(), (error: unknown) => error instanceof ApiError && error.code === "publication_target_mismatch");
  state.project.link.repo = "site";
  for (const domain of [{ ...state.domain, projectId: "prj_other" }, { ...state.domain, verified: false }, { ...state.domain, gitBranch: "preview" }]) {
    state.domain = domain;
    await assert.rejects(() => publicationConfiguration(), (error: unknown) => error instanceof ApiError && error.code === "publication_target_mismatch");
  }
});

test("failed deployments only create a replacement on explicit retry; unconfigured publication never triggers a hook", async t => {
  const state = fixture(t); const item = deployment(); item.readyState = "ERROR"; state.deployments.push(item);
  assert.equal((await triggerPublicationDeployment(identity)).state, "ERROR");
  assert.equal(state.calls.filter(call => call.method === "POST").length, 0);
  assert.equal((await triggerPublicationDeployment(identity, true)).state, "BUILDING");
  assert.equal(state.calls.filter(call => call.method === "POST").length, 1);
  delete process.env.VERCEL_TOKEN;
  assert.equal((await triggerPublicationDeployment(identity)).state, "unconfigured");
  assert.equal((await publicationConfiguration()).configured, false);
  assert.equal(state.calls.filter(call => call.method === "POST").length, 1);
});
