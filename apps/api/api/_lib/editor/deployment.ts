import { readPublicationIdentity, type PublicationIdentity, type PublicationDeployment, type PublicationConfiguration } from "@three-acts/static-content";
import { ApiError } from "../http";
import { verifyEditorPublicationRevision } from "./github";

type Settings = { token: string; projectId: string; teamId?: string; liveUrl: string; base: string };
type Project = { id: string; name: string; accountId?: string; rootDirectory?: string; link?: { type?: string; org?: string; repo?: string; productionBranch?: string } };
type Deployment = { id?: string; uid?: string; projectId?: string; target?: string; url?: string; readyState?: string; state?: string; gitSource?: { sha?: string }; meta?: Record<string, string> };

function settings(): Settings | null {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const site = process.env.EDITOR_PUBLIC_SITE_URL;
  if (!token || !projectId || !site || !process.env.EDITOR_GITHUB_REPOSITORY || !process.env.EDITOR_GITHUB_BRANCH || !process.env.EDITOR_GITHUB_TOKEN) return null;
  let live: URL;
  try { live = new URL(site); } catch { throw new ApiError(503, "publication_unconfigured", "Set the production site's origin for revision verification."); }
  const local = ["localhost", "127.0.0.1"].includes(live.hostname) && process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production";
  if (live.username || live.password || live.pathname !== "/" || live.search || live.hash || live.protocol !== "https:" && !(local && live.protocol === "http:")) throw new ApiError(503, "publication_unconfigured", "Revision verification requires a configured HTTPS production origin.");
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID, liveUrl: live.origin, base: (process.env.VERCEL_API_BASE || "https://api.vercel.com").replace(/\/+$/, "") };
}

async function provider<T>(config: Settings, path: string, method = "GET", body?: unknown): Promise<T> {
  const url = new URL(`${config.base}${path}`);
  if (config.teamId) url.searchParams.set("teamId", config.teamId);
  let response: Response;
  try {
    response = await fetch(url, { method, headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  } catch { throw new ApiError(502, "publication_provider_unavailable", "Deployment status could not be reached. Keep this publication and check again."); }
  if (!response.ok) throw new ApiError(502, "publication_provider_error", "The deployment provider rejected this request. Keep the committed revision and retry this step.");
  return response.json() as Promise<T>;
}

async function projectFor(config: Settings): Promise<Project> {
  const project = await provider<Project>(config, `/v9/projects/${encodeURIComponent(config.projectId)}`);
  const [org, repo] = process.env.EDITOR_GITHUB_REPOSITORY!.split("/");
  if (project.id !== config.projectId || config.teamId && project.accountId !== config.teamId || project.link?.type !== "github" || project.link.org?.toLowerCase() !== org.toLowerCase() || project.link.repo?.toLowerCase() !== repo.toLowerCase() || project.rootDirectory !== (process.env.EDITOR_VERCEL_ROOT_DIRECTORY || "apps/web") || project.link.productionBranch !== process.env.EDITOR_GITHUB_BRANCH) throw new ApiError(409, "publication_target_mismatch", "The deployment project, repository, web root or production branch does not match the editor's source. Correct the connection before publishing.");
  const hostname = new URL(config.liveUrl).hostname;
  const domain = await provider<{ name: string; projectId: string; verified: boolean; redirect?: string | null; gitBranch?: string | null; customEnvironmentId?: string | null }>(config, `/v9/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(hostname)}`);
  if (domain.name !== hostname || domain.projectId !== config.projectId || !domain.verified || domain.redirect || domain.gitBranch || domain.customEnvironmentId) throw new ApiError(409, "publication_target_mismatch", "The verification origin must be a verified production domain of this deployment project.");
  return project;
}

export async function publicationConfiguration(): Promise<PublicationConfiguration> {
  const config = settings();
  const source = { repository: process.env.EDITOR_GITHUB_REPOSITORY ?? null, branch: process.env.EDITOR_GITHUB_BRANCH ?? null };
  if (!config) return { ...source, configured: false, message: "Exact publication is not configured. Source drafts remain available; connect GitHub, a Vercel web project and the production verification origin before publishing." };
  await projectFor(config);
  return { ...source, configured: true, projectId: config.projectId, liveUrl: config.liveUrl };
}

function identity(input: unknown): PublicationIdentity {
  try { return readPublicationIdentity(input); }
  catch (error) { throw new ApiError(400, "invalid_publication", (error as Error).message); }
}
function matches(deployment: Deployment, expected: PublicationIdentity, config: Settings): boolean {
  return /^dpl_[a-zA-Z0-9]+$/.test(deployment.id || deployment.uid || "") && deployment.projectId === config.projectId && deployment.target === "production" && deployment.meta?.editorPublicationId === expected.publicationId && (deployment.gitSource?.sha || deployment.meta?.githubCommitSha) === expected.revision && deployment.meta?.editorRevision === expected.revision;
}
async function lookup(config: Settings, expected: PublicationIdentity, id?: string): Promise<Deployment | null> {
  if (id) {
    if (!/^dpl_[a-zA-Z0-9]+$/.test(id)) throw new ApiError(400, "invalid_publication", "Choose a valid deployment identity.");
    const deployment = await provider<Deployment>(config, `/v13/deployments/${encodeURIComponent(id)}`);
    if (!matches(deployment, expected, config)) throw new ApiError(409, "publication_deployment_mismatch", "This deployment does not belong to the reviewed revision and production project.");
    return deployment;
  }
  const query = new URLSearchParams({ projectId: config.projectId, target: "production", sha: expected.revision, limit: "100" });
  const list = await provider<{ deployments: Deployment[] }>(config, `/v6/deployments?${query}`);
  // List responses may omit gitSource/projectId; verify each matching candidate
  // through the detailed deployment rather than trusting a timestamp.
  for (const item of list.deployments ?? []) {
    if (item.meta?.editorPublicationId !== expected.publicationId) continue;
    const deploymentId = item.uid || item.id;
    if (!deploymentId || !/^dpl_[a-zA-Z0-9]+$/.test(deploymentId)) continue;
    const deployment = await provider<Deployment>(config, `/v13/deployments/${encodeURIComponent(deploymentId)}`);
    if (matches(deployment, expected, config)) return deployment;
  }
  return null;
}
async function status(config: Settings, expected: PublicationIdentity, deployment: Deployment | null): Promise<PublicationDeployment> {
  if (!deployment) return { ...expected, state: "pending", message: "Waiting for this exact publication to register." };
  const raw = (deployment.readyState || deployment.state || "unknown").toUpperCase();
  const state = ["QUEUED", "INITIALIZING", "BUILDING", "READY", "ERROR", "CANCELED"].includes(raw) ? raw as PublicationDeployment["state"] : "unknown";
  const result: PublicationDeployment = { ...expected, state, id: deployment.id || deployment.uid, liveUrl: config.liveUrl };
  if (deployment.url && /^[a-zA-Z0-9.-]+$/.test(deployment.url)) result.url = `https://${deployment.url}`;
  if (state !== "READY") return result;
  // READY is provider evidence. Live additionally requires the production
  // origin to serve this exact source receipt, with no redirect inference.
  try {
    const url = new URL("/editor-revision.json", config.liveUrl);
    url.searchParams.set("publication", expected.publicationId);
    url.searchParams.set("revision", expected.revision);
    const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
    const marker = response.ok ? await response.json() as { version?: unknown; revision?: unknown; publicationId?: unknown } : null;
    if (marker?.version === 1 && marker.revision === expected.revision && marker.publicationId === expected.publicationId) return { ...result, state: "live" };
  } catch { /* Production may still be assigning the domain; keep checking. */ }
  return { ...result, state: "verifying", message: "The build is ready. The production origin has not yet verified this publication." };
}

export async function getPublicationDeployment(input: unknown, id?: string): Promise<PublicationDeployment> {
  const expected = identity(input);
  const config = settings();
  if (!config) return { ...expected, state: "unconfigured", message: "Exact deployment and production revision verification are not configured." };
  await projectFor(config);
  await verifyEditorPublicationRevision(expected.revision, expected.publicationId);
  return status(config, expected, await lookup(config, expected, id));
}

export async function triggerPublicationDeployment(input: unknown, retry = false): Promise<PublicationDeployment> {
  const expected = identity(input);
  const config = settings();
  if (!config) return { ...expected, state: "unconfigured", message: "Exact deployment and production revision verification are not configured." };
  const project = await projectFor(config);
  const source = await verifyEditorPublicationRevision(expected.revision, expected.publicationId);
  const previous = await lookup(config, expected);
  if (previous && (!retry || !["ERROR", "CANCELED"].includes((previous.readyState || previous.state || "").toUpperCase()))) return status(config, expected, previous);
  const [org, repo] = source.repository.split("/");
  const deployment = await provider<Deployment>(config, "/v13/deployments", "POST", { project: project.id, name: project.name, target: "production", gitSource: { type: "github", org, repo, ref: source.branch, sha: expected.revision }, meta: { editorPublicationId: expected.publicationId, editorRevision: expected.revision } });
  if (!matches(deployment, expected, config)) throw new ApiError(502, "publication_deployment_mismatch", "The provider response does not identify the requested source publication. Check status before retrying.");
  return status(config, expected, deployment);
}
