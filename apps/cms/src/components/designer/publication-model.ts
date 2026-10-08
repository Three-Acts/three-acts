import { contentDefinitions, contentPath, readPublicationIdentity, validateContent, type EditorChange, type EditorPushResult, type EditorWorkspace, type PublicationConfiguration, type PublicationDeployment, type PublicationIdentity } from "@three-acts/static-content";
import { readReviewedCmsRecords, readCmsPromotionResult, type ReviewedCmsRecord, type CmsPromotionResult } from "@three-acts/cms-schema";

export type PublicationReceipt = {
  version: 1; scope: string; repository: string; branch: string; publicationId: string; startedAt: string; message: string;
  changes: EditorChange[]; cms: ReviewedCmsRecord[];
  step: "source" | "cms" | "deploy" | "verify" | "done";
  state: "reviewed" | "committed" | "promoting" | "deploying" | "verifying" | "live" | "failed" | "unconfigured";
  revision: string | null; baseRevision: string;
  commit?: { sha: string; url: string; documents: Array<{ id: string; sha: string }> };
  deployment?: PublicationDeployment;
  promotion?: CmsPromotionResult;
  error?: string;
};
export type PublicationDependencies = {
  configuration: () => Promise<PublicationConfiguration>;
  push: (changes: EditorChange[], message: string, requestId: string, expectedHead: string) => Promise<EditorPushResult>;
  onCommitted: (result: EditorPushResult, reviewed: EditorChange[]) => void;
  promote: (records: ReviewedCmsRecord[]) => Promise<CmsPromotionResult>;
  deploy: (identity: PublicationIdentity, retry: boolean) => Promise<PublicationDeployment>;
  check: (identity: PublicationIdentity, deploymentId?: string) => Promise<PublicationDeployment>;
  save: (receipt: PublicationReceipt) => void;
};

export function preparePublication(scope: string, workspace: EditorWorkspace, changes: EditorChange[], cms: ReviewedCmsRecord[], message: string, publicationId: string = crypto.randomUUID()): PublicationReceipt {
  if (!workspace.connected || !workspace.repository || !workspace.branch) throw new Error("Connect GitHub before publishing source changes.");
  const receipt = workspace.documents.find(doc => doc.id === "publication");
  if (!receipt) throw new Error("The source publication contract is unavailable. Reload the workspace.");
  return readPublicationReceipt({ version: 1, scope, repository: workspace.repository, branch: workspace.branch, publicationId, startedAt: new Date().toISOString(), message, changes: [...changes.filter(change => change.id !== "publication"), { id: "publication", sha: receipt.sha, content: { version: 1, publicationId } }], cms, step: "source", state: "reviewed", revision: null, baseRevision: workspace.headSha });
}

export function publicationStorageKey(scope: string, repository: string, branch: string): string {
  return `three-acts:publication:v1:${[scope, repository, branch].map(encodeURIComponent).join(":")}`;
}

export function readScopedPublicationReceipt(input: unknown, scope: string, repository: string, branch: string): PublicationReceipt {
  const receipt = readPublicationReceipt(input);
  if (receipt.scope !== scope || receipt.repository !== repository || receipt.branch !== branch) throw new Error("This publication recovery receipt belongs to a different editor or source connection.");
  return receipt;
}

export function readPublicationReceipt(input: unknown): PublicationReceipt {
  if (!input || typeof input !== "object" || Array.isArray(input) || new TextEncoder().encode(JSON.stringify(input)).length > 1024 * 1024) throw new Error("Invalid or oversized publication recovery receipt.");
  const value = input as PublicationReceipt;
  if (Object.keys(value).some(key => !["version", "scope", "repository", "branch", "publicationId", "startedAt", "message", "changes", "cms", "step", "state", "revision", "baseRevision", "commit", "deployment", "promotion", "error"].includes(key))) throw new Error("Unsupported publication recovery fields.");
  if (typeof value.baseRevision !== "string" || !/^[a-f0-9]{40}$/.test(value.baseRevision)) throw new Error("Publication review requires an exact source baseline revision.");
  readPublicationIdentity({ revision: value.revision ?? "0".repeat(40), publicationId: value.publicationId });
  if (value.version !== 1 || typeof value.scope !== "string" || !value.scope || value.scope.length > 200 || typeof value.repository !== "string" || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(value.repository) || typeof value.branch !== "string" || !value.branch || value.branch.length > 255 || typeof value.message !== "string" || !value.message.trim() || value.message.length > 200 || value.message.includes("Editor-Request:") || typeof value.startedAt !== "string" || !Number.isFinite(Date.parse(value.startedAt)) || !["source", "cms", "deploy", "verify", "done"].includes(value.step) || !["reviewed", "committed", "promoting", "deploying", "verifying", "live", "failed", "unconfigured"].includes(value.state)) throw new Error("Invalid publication recovery scope or state.");
  if (!Array.isArray(value.changes) || value.changes.length < 1 || value.changes.length > contentDefinitions.length + 200) throw new Error("Invalid publication source changes.");
  const ids = new Set<string>();
  const changes = value.changes.map(change => {
    if (!change || typeof change.id !== "string" || typeof change.sha !== "string" || !/^[a-f0-9]{40}$/.test(change.sha) || ids.has(change.id)) throw new Error("Invalid or duplicate publication source document.");
    ids.add(change.id);
    return { id: change.id, sha: change.sha, content: validateContent(change.id, change.content) };
  });
  if (changes.find(change => change.id === "publication")?.content.publicationId !== value.publicationId) throw new Error("The source receipt must identify this publication.");
  if (value.step !== "source" && !value.commit || value.commit && (value.commit.sha !== value.revision || !Array.isArray(value.commit.documents) || value.commit.documents.length !== changes.length || value.commit.url !== `https://github.com/${value.repository}/commit/${value.revision}` || value.commit.documents.some((document, index) => document.id !== changes[index].id || !/^[a-f0-9]{40}$/.test(document.sha)))) throw new Error("Invalid committed publication recovery revision.");
  if (value.deployment) {
    const identity = readPublicationIdentity(value.deployment);
    if (identity.revision !== value.revision || identity.publicationId !== value.publicationId || value.deployment.id !== undefined && !/^dpl_[a-zA-Z0-9]+$/.test(value.deployment.id) || !["unconfigured", "pending", "QUEUED", "INITIALIZING", "BUILDING", "READY", "ERROR", "CANCELED", "unknown", "verifying", "live"].includes(value.deployment.state)) throw new Error("The deployment receipt belongs to another publication.");
  }
  if (value.step === "done" && value.deployment?.state !== "live") throw new Error("A completed publication requires verified live evidence.");
  const cms = readReviewedCmsRecords(value.cms);
  const promotion = value.promotion ? readCmsPromotionResult(value.promotion, cms) : undefined;
  if (["deploy", "verify", "done"].includes(value.step) && !promotion?.complete || value.state === "live" && value.step !== "done" || value.error !== undefined && (typeof value.error !== "string" || value.error.length > 2000)) throw new Error("Publication recovery cannot skip source or CMS acceptance.");
  return structuredClone({ ...value, changes, cms, ...(promotion ? { promotion } : {}) });
}

export function publicationCommitResult(receipt: PublicationReceipt): EditorPushResult {
  if (!receipt.commit) throw new Error("This publication has no source commit.");
  return { sha: receipt.commit.sha, url: receipt.commit.url, documents: receipt.changes.map((change, index) => ({ ...(change.id.startsWith("source:") ? {id:change.id,label:change.id.split("/").at(-1)!,route:"/",kind:"source" as const} : contentDefinitions.find(doc => doc.id === change.id)!), content: change.content, sha: receipt.commit!.documents[index].sha, sourcePath: contentPath(change.id) })) };
}

/** Advances a single captured release. New drafts/queue entries are never read
 * here. Failures retain the step needed for an idempotent resume. */
export async function advancePublication(input: PublicationReceipt, deps: PublicationDependencies): Promise<PublicationReceipt> {
  let receipt = readPublicationReceipt(input);
  const save = (update: Partial<PublicationReceipt>) => {
    receipt = readPublicationReceipt({ ...receipt, ...update });
    deps.save(receipt); // A missing recovery checkpoint must remain visible.
  };
  try {
    // A persisted success describes a previous check. Recheck the production
    // origin when resumed so a superseding release cannot stay labelled live.
    save(receipt.step === "done" ? { step: "verify", state: "verifying", error: undefined } : { error: undefined });
    const configuration = await deps.configuration();
    if (!configuration.configured) { save({ state: "unconfigured", error: configuration.message ?? "Publication is not configured." }); return receipt; }
    if (configuration.repository !== receipt.repository || configuration.branch !== receipt.branch) throw new Error("The publication connection changed. Review the current source before starting another release.");
    if (receipt.step === "source") {
      const result = await deps.push(receipt.changes, receipt.message, receipt.publicationId, receipt.baseRevision);
      if (!/^[a-f0-9]{40}$/.test(result.sha) || result.url !== `https://github.com/${receipt.repository}/commit/${result.sha}` || result.documents.length !== receipt.changes.length) throw new Error("Source push did not return this publication's committed documents.");
      const documents = receipt.changes.map(change => {
        const document = result.documents.find(doc => doc.id === change.id);
        if (!document || !/^[a-f0-9]{40}$/.test(document.sha) || JSON.stringify(validateContent(change.id, document.content)) !== JSON.stringify(change.content)) throw new Error("Committed source readback differs from the reviewed publication.");
        return { id: document.id, sha: document.sha };
      });
      save({ revision: result.sha, commit: { sha: result.sha, url: result.url, documents }, step: "cms", state: "committed" });
    }
    // Restore source acknowledgement after reload without pushing again. The
    // caller clears only drafts that still match this captured review.
    deps.onCommitted(publicationCommitResult(receipt), receipt.changes);
    if (receipt.step === "cms") {
      save({ state: "promoting" });
      const promotion = readCmsPromotionResult(await deps.promote(receipt.cms), receipt.cms);
      if (!promotion.complete) { save({ promotion, state: "failed", error: "Some reviewed CMS records changed or disappeared. Their newer edits were not promoted; review the conflicting records before continuing." }); return receipt; }
      save({ promotion, step: "deploy", state: "committed" });
    }
    const expected = readPublicationIdentity(receipt);
    let deployment: PublicationDeployment;
    if (receipt.step === "deploy") {
      const retry = receipt.deployment?.state === "ERROR" || receipt.deployment?.state === "CANCELED";
      save({ state: "deploying" });
      deployment = await deps.deploy(expected, retry);
    } else deployment = await deps.check(expected, receipt.deployment?.id);
    if (deployment.revision !== expected.revision || deployment.publicationId !== expected.publicationId) throw new Error("Deployment status belongs to another publication.");
    if (deployment.state === "live") save({ deployment, step: "done", state: "live" });
    else if (deployment.state === "ERROR" || deployment.state === "CANCELED") save({ deployment, step: "deploy", state: "failed", error: "The committed publication's deployment failed. Retry deployment to rebuild the same revision." });
    else if (deployment.state === "unconfigured") save({ deployment, state: "unconfigured", error: deployment.message });
    else save({ deployment, step: "verify", state: deployment.state === "verifying" || deployment.state === "READY" ? "verifying" : "deploying" });
    return receipt;
  } catch (error) {
    save({ state: "failed", error: error instanceof Error ? error.message : "Publication failed. The captured review is retained." });
    return receipt;
  }
}
