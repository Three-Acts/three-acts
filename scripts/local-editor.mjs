import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const ports = ["CMS", "WEB", "API"].map((name, i) => Number(process.env[`LOCAL_EDITOR_${name}_PORT`] ?? [5184, 5183, 5185][i]));
if (new Set(ports).size !== 3 || ports.some(port => !Number.isInteger(port) || port < 1024 || port > 65535)) throw new Error("Choose three distinct local editor ports between 1024 and 65535.");
const [cmsPort, webPort, apiPort] = ports;
const cmsOrigin = `http://localhost:${cmsPort}`, webOrigin = `http://localhost:${webPort}`, apiOrigin = `http://localhost:${apiPort}`;
for (const port of ports) {
  await new Promise((resolve, reject) => {
    const probe = createTcpServer();
    probe.once("error", () => reject(new Error(`Local editor port ${port} is already in use. Stop that editor or choose LOCAL_EDITOR_CMS/WEB/API_PORT overrides.`)));
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
}
const env = {
  ...process.env, NODE_ENV: "development", VERCEL: "", VERCEL_ENV: "",
  AUTH_SECRET: "three-acts-local-editor-development", CMS_AUTH_MODE: "open",
  CMS_DATA_BACKEND: "file", CMS_STORAGE_BACKEND: "file",
  SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "",
  CMS_DATA_DIR: resolve(process.env.LOCAL_EDITOR_DATA_DIR ?? resolve(root, "apps/api/data")),
  EDITOR_GITHUB_REPOSITORY: "", EDITOR_GITHUB_BRANCH: "", EDITOR_GITHUB_TOKEN: "",
  VERCEL_TOKEN: "", VERCEL_PROJECT_ID: "", VERCEL_TEAM_ID: "", VERCEL_DEPLOY_HOOK_URL: "", PUBLISH_TOKEN: "",
  EDITOR_PUBLIC_SITE_URL: "", EDITOR_SOURCE_REVISION: "", EDITOR_PUBLICATION_ID: "", VERCEL_GIT_COMMIT_SHA: "",
  VITE_API_URL: "", API_ORIGIN: apiOrigin, VITE_CMS_BACKEND: "rest", VITE_PUBLISH_TOKEN: "",
  VITE_SITE_URL: webOrigin, CONTENT_SOURCE: "mock", PUBLIC_EDITOR_PREVIEW: "true", PUBLIC_EDITOR_ORIGIN: cmsOrigin
};
const children = new Set();
let closing = false, server;
function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  server?.close();
  for (const child of children) {
    try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
  }
  process.exitCode = code;
}
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => shutdown());
function run(args, extra = {}) {
  const child = spawn("npm", args, { cwd: root, env: { ...env, ...extra }, stdio: "inherit", detached: true });
  children.add(child);
  child.once("error", error => { console.error(error.message); shutdown(1); });
  child.once("exit", code => {
    // npm can exit before its nested runtime. Clean the owned process group
    // even when that parent has already disappeared during Ctrl+C.
    try { process.kill(-child.pid, "SIGTERM"); } catch { /* The group already exited. */ }
    children.delete(child);
    if (!closing && args[1] !== "build:web") shutdown(code ?? 1);
  });
  return child;
}
const build = run(["run", "build:web"], { NODE_ENV: "production" });
const code = await new Promise(resolve => build.once("exit", resolve));
if (code !== 0 || closing) { shutdown(1); process.exitCode = 1; }
else {
  run(["run", "dev:api"], { PORT: String(apiPort), HOST: "127.0.0.1" });
  run(["run", "dev", "-w", "@three-acts/cms", "--", "--port", String(cmsPort), "--strictPort", "--host", "127.0.0.1"]);
  const dist = resolve(root, "apps/web/dist");
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".avif": "image/avif", ".webp": "image/webp", ".woff2": "font/woff2" };
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", webOrigin);
      if (url.pathname.startsWith("/api/")) {
        const chunks = []; for await (const chunk of request) chunks.push(chunk);
        const body = Buffer.concat(chunks);
        const headers = { ...request.headers }; delete headers.host; delete headers.connection;
        const upstream = await fetch(new URL(url.pathname + url.search, apiOrigin), { method: request.method, headers, body: body.length ? body : undefined, signal: AbortSignal.timeout(30_000), redirect: "manual" });
        response.writeHead(upstream.status, Object.fromEntries([...upstream.headers].filter(([key]) => !["content-encoding", "content-length", "transfer-encoding", "connection"].includes(key))));
        response.end(Buffer.from(await upstream.arrayBuffer())); return;
      }
      let path = resolve(dist, "." + decodeURIComponent(url.pathname));
      if (path !== dist && !path.startsWith(dist + sep)) { response.writeHead(403).end(); return; }
      if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
      response.writeHead(200, { "Content-Type": mime[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" });
      response.end(request.method === "HEAD" ? undefined : await readFile(path));
    } catch { response.writeHead(404).end("Not found"); }
  });
  server.once("error", error => { console.error(error.message); shutdown(1); });
  server.listen(webPort, "127.0.0.1", () => console.log(`Local editor: ${cmsOrigin}\nCanvas: ${webOrigin}\nAPI: ${apiOrigin}\nSign in with any email and non-empty password. Changes stay local; publishing is unconfigured.`));
}
