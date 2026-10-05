import { validateContent, type ContentObject, type EditorWorkspace } from "@three-acts/static-content";

export type Draft = { content: ContentObject; sha: string; original: ContentObject };
export type Drafts = Record<string, Draft>;
export function draftKey(workspace: EditorWorkspace, email: string): string {
  return `three-acts:editor:drafts:v1:${email}:${workspace.repository ?? "local"}:${workspace.branch ?? "local"}`;
}
export function readDrafts(key: string): { drafts: Drafts; recovery: string | null } {
  const drafts: Drafts = {};
  let recovery: string | null = null;
  let raw: string | null = null;
  try {
    recovery = localStorage.getItem(`${key}:recovery`);
    raw = localStorage.getItem(key);
    const parsed: unknown = JSON.parse(raw ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid draft storage.");
    for (const [id, draft] of Object.entries(parsed)) {
      try {
        const item = draft as Draft;
        if (!item || typeof item.sha !== "string" || !/^[a-f0-9]{40}$/.test(item.sha)) throw new Error("Invalid draft.");
        drafts[id] = { content: validateContent(id, item.content), sha: item.sha, original: validateContent(id, item.original) };
      } catch { recovery = raw; }
    }
  } catch { recovery = raw || recovery; }
  if (recovery) {
    try { localStorage.setItem(`${key}:recovery`, recovery); } catch { /* The caller can still download the in-memory recovery. */ }
  }
  return { drafts, recovery };
}
export function updateField(content: ContentObject, path: string[], value: string | number | boolean): ContentObject {
  const next = structuredClone(content);
  let target: Record<string, unknown> | unknown[] = next;
  for (const key of path.slice(0, -1)) target = (target as Record<string, unknown>)[key] as Record<string, unknown>;
  (target as Record<string, unknown>)[path.at(-1)!] = value;
  return next;
}
export const sameContent = (left: ContentObject, right: ContentObject) => JSON.stringify(left) === JSON.stringify(right);
export function fieldLabel(path: string[]): string {
  return path.map((part) => /^\d+$/.test(part) ? `Item ${Number(part) + 1}` : part.replace(/_\d+$/, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")).join(" / ");
}
