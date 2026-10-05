import { createApiClient } from "@three-acts/utils";
import { contentDefinitions, serializeContent } from "@three-acts/static-content";
import type { EditorChange, EditorPushResult, EditorWorkspace } from "@three-acts/static-content";
import { sessionStore } from "../../auth/session-store";

const { apiFetch } = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL,
  getAuthToken: () => sessionStore.getToken(),
  timeoutMs: 90000
});

export async function loadDesignerWorkspace(): Promise<EditorWorkspace> {
  if (import.meta.env.VITE_CMS_BACKEND === "rest") return apiFetch<EditorWorkspace>("/editor/content");
  // Mock CMS authentication is local-only. Use the bundled files without
  // sending its mock token to the authenticated GitHub API.
  const documents = await Promise.all(contentDefinitions.map(async (definition) => {
    const bytes = new TextEncoder().encode(serializeContent(definition.content));
    const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
    const blob = new Uint8Array(header.length + bytes.length);
    blob.set(header);
    blob.set(bytes, header.length);
    const digest = await crypto.subtle.digest("SHA-1", blob);
    const sha = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return { ...definition, content: structuredClone(definition.content), sha };
  }));
  return { repository: null, branch: null, connected: false, documents };
}

export function pushDesignerChanges(changes: EditorChange[], message: string): Promise<EditorPushResult> {
  return apiFetch<EditorPushResult>("/editor/push", {
    method: "POST",
    body: JSON.stringify({ changes, message })
  });
}
