import { ArrowUpRight, FileCode2, GitBranch, RefreshCw } from "lucide-react";
import { contentPath, type EditorWorkspace } from "@three-acts/static-content";
import { Button, Modal } from "../atoms";

export function GitHubConnection({ workspace, loading, error, lastSynced, lastCommit, onReload, onClose }: {
  workspace: EditorWorkspace | null;
  loading: boolean;
  error: string;
  lastSynced: Date | null;
  lastCommit: string | null;
  onReload: () => void;
  onClose: () => void;
}) {
  const connected = Boolean(workspace?.connected);
  const repositoryUrl = workspace?.repository && /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(workspace.repository)
    ? `https://github.com/${workspace.repository}` : null;
  const branchUrl = repositoryUrl && workspace?.branch ? `${repositoryUrl}/tree/${encodeURIComponent(workspace.branch)}` : null;
  return <Modal open title="GitHub connection" onClose={onClose} className="w-160 [&>div]:overflow-hidden [&>footer]:bg-cms-bg" footer={<>
    <Button onClick={onClose}>Done</Button>
    <Button disabled={loading} onClick={onReload}><RefreshCw size={13} className={loading ? "animate-spin" : undefined}/>{loading ? "Checking…" : "Reload from source"}</Button>
  </>}>
    <section className="grid gap-3" aria-label="Connection details">
      <div className="flex items-start gap-2 rounded-cms border border-cms-line bg-cms-surface p-3">
        <GitBranch aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-cms-muted"/>
        <div>
          <h2 className="m-0 text-ui font-semibold">{loading ? "Checking connection…" : error ? "Connection check failed" : connected ? "Connected to GitHub" : workspace ? "GitHub not connected" : "Connection unavailable"}</h2>
          <p className="mb-0 mt-1 leading-5 text-cms-muted">{error && workspace ? "Showing the last loaded source. Your drafts are preserved. Reload to check the connection again." : connected ? "Content is read from this repository. Reviewed drafts are pushed together as one commit." : workspace ? "You are using bundled demo content. Drafts stay in this browser; pushing requires a connected repository." : "The workspace could not be loaded. Check the connection and try again."}</p>
        </div>
      </div>
      {error && <p role="alert" className="m-0 rounded-cms border border-cms-danger-line bg-cms-danger-surface p-2 text-cms-danger">{error}</p>}
      <dl className="m-0 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-ui">
        <dt className="text-cms-subtle">Content source</dt><dd className="m-0">{workspace ? connected ? "GitHub repository" : "Bundled demo content" : "Unavailable"}</dd>
        <dt className="text-cms-subtle">Repository</dt><dd className="m-0 break-words">{repositoryUrl ? <a href={repositoryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cms-accent hover:underline">{workspace?.repository}<ArrowUpRight size={12}/></a> : "Not connected"}</dd>
        <dt className="text-cms-subtle">Branch</dt><dd className="m-0">{branchUrl ? <a href={branchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-cms-accent hover:underline"><GitBranch size={12}/>{workspace?.branch}</a> : "—"}</dd>
        <dt className="text-cms-subtle">Snapshot</dt><dd className="m-0 font-mono text-[11px] break-all">{workspace?.headSha ?? "—"}</dd>
        <dt className="text-cms-subtle">Last checked</dt><dd className="m-0">{lastSynced ? lastSynced.toLocaleString() : "Not checked"}</dd>
        <dt className="text-cms-subtle">Managed by</dt><dd className="m-0">{connected ? "Workspace administrator" : "—"}</dd>
        {lastCommit && <><dt className="text-cms-subtle">Latest push</dt><dd className="m-0"><a href={lastCommit} target="_blank" rel="noopener noreferrer" className="text-cms-accent hover:underline">View commit ↗</a></dd></>}
      </dl>
      <p className="m-0 leading-5 text-cms-muted">{connected ? "All authorized editors of this workspace use the same repository connection. Reload checks the latest source and preserves your drafts. Push updates the branch; your hosting deployment runs separately." : "Ask your workspace administrator to configure the repository, branch, and server credentials. A hosted workspace must have a GitHub connection before it can open."}</p>
      {workspace && <details className="overflow-hidden rounded-cms border border-cms-line">
        <summary className="cursor-pointer bg-cms-surface px-3 py-2 text-ui font-medium">Registered content files · {workspace.documents.length}</summary>
        <ul className="m-0 list-none divide-y divide-cms-line p-0" aria-label="Registered content files">
          {workspace.documents.map((document) => <li key={document.id} className="flex items-start gap-2 px-3 py-2">
            <FileCode2 aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-cms-subtle"/>
            <div className="min-w-0 flex-1"><p className="m-0 flex justify-between gap-2"><span>{document.label}</span><span className="truncate text-cms-subtle">{document.id === "shared" ? "Shared across pages" : document.route}</span></p><p className="mb-0 mt-0.5 break-all font-mono text-[10px] text-cms-subtle">{document.sourcePath ?? contentPath(document.id)}</p></div>
          </li>)}
        </ul>
      </details>}
    </section>
  </Modal>;
}
