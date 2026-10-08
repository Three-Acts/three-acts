export type PublicationIdentity = { publicationId: string; revision: string };
export type PublicationConfiguration = { configured: boolean; repository: string | null; branch: string | null; projectId?: string; liveUrl?: string; message?: string };
export type PublicationDeployment = PublicationIdentity & { state: "unconfigured" | "pending" | "QUEUED" | "INITIALIZING" | "BUILDING" | "READY" | "ERROR" | "CANCELED" | "unknown" | "verifying" | "live"; id?: string; url?: string; liveUrl?: string; message?: string };

export function readPublicationIdentity(input: unknown): PublicationIdentity {
  const value = input as Partial<PublicationIdentity> | null;
  if (!value || typeof value !== "object" || typeof value.revision !== "string" || !/^[a-f0-9]{40}$/.test(value.revision) || typeof value.publicationId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.publicationId)) throw new Error("Choose the exact source revision and reviewed publication identity.");
  return { publicationId: value.publicationId, revision: value.revision };
}
