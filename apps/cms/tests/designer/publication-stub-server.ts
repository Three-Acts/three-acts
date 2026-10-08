import { createServer } from "node:http";

type Deployment = { id: string; projectId: string; target: string; url: string; readyState: string; gitSource: { sha: string }; meta: Record<string, string> };
const projectId = "prj_editorweb";
const deployments: Deployment[] = [];
let nextState = "BUILDING", markerMatches = false, creates = 0;
createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const send = (status: number, value: unknown) => { response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(value)); };
  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    const chunks = []; for await (const chunk of request) chunks.push(Buffer.from(chunk));
    body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  }
  if (url.pathname === "/__e2e/status") return send(200, { creates, deployments, markerMatches });
  if (url.pathname === "/__e2e/control" && request.method === "POST") {
    if (typeof body.futureState === "string") nextState = body.futureState;
    if (typeof body.state === "string") { nextState = body.state; for (const deployment of deployments) deployment.readyState = nextState; }
    if (typeof body.markerMatches === "boolean") markerMatches = body.markerMatches;
    return send(200, { ok: true });
  }
  if (url.pathname === "/editor-revision.json") {
    const deployment = deployments[0];
    return send(200, { version: 1, revision: markerMatches ? deployment?.gitSource.sha : "0".repeat(40), publicationId: deployment?.meta.editorPublicationId ?? null });
  }
  if (request.headers.authorization !== "Bearer provider-browser-test") return send(401, { error: "unauthorized" });
  if (url.pathname === `/v9/projects/${projectId}`) return send(200, { id: projectId, name: "editor-web", accountId: "team_editor", rootDirectory: "apps/web", link: { type: "github", org: "test", repo: "site", productionBranch: "content" } });
  if (url.pathname === `/v9/projects/${projectId}/domains/localhost`) return send(200, { name: "localhost", projectId, verified: true });
  if (url.pathname === "/v6/deployments") return send(200, { deployments: deployments.filter(item => item.gitSource.sha === url.searchParams.get("sha")).map(item => ({ uid: item.id, meta: item.meta })) });
  if (url.pathname.startsWith("/v13/deployments/")) return send(200, deployments.find(item => item.id === url.pathname.split("/").at(-1)));
  if (url.pathname === "/v13/deployments" && request.method === "POST") {
    const input = body as { target?: string; project?: string; gitSource?: { sha: string }; meta?: Record<string, string> };
    if (input.target !== "production" || input.project !== projectId || !input.gitSource || !input.meta || input.meta.editorRevision !== input.gitSource.sha) return send(400, { error: "wrong source target" });
    const deployment: Deployment = { id: `dpl_local${++creates}`, projectId, target: "production", url: `local${creates}.vercel.app`, readyState: nextState, gitSource: input.gitSource, meta: input.meta };
    deployments.unshift(deployment); return send(200, deployment);
  }
  send(404, { error: "not_found" });
}).listen(Number(process.env.PORT ?? 5381), "127.0.0.1");
