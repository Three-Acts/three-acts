import { CmsError } from "./errors";
import type { CmsRecordValue } from "./types";

export const publicationLimits = { records: 1000 } as const;
export type ReviewedCmsRecord = { collectionId: string; id: string; modifiedAt: string; valuesHash: string };
export type CmsPromotionResult = { published: number; complete: boolean; records: Array<{ collectionId: string; id: string; state: "pending" | "published" | "already-published" | "conflict" | "not-found"; modifiedAt?: string }> };

export function readReviewedCmsRecords(input: unknown): ReviewedCmsRecord[] {
  if (!Array.isArray(input) || input.length > publicationLimits.records) throw new CmsError("validation", `Review at most ${publicationLimits.records} CMS records in one publication.`);
  const ids = new Set<string>();
  return input.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some(key => !["collectionId", "id", "modifiedAt", "valuesHash"].includes(key))) throw new CmsError("validation", "Invalid reviewed CMS record.");
    const { collectionId, id, modifiedAt, valuesHash } = item as ReviewedCmsRecord;
    if (typeof collectionId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(collectionId) || typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(id) || typeof modifiedAt !== "string" || modifiedAt.length > 40 || !Number.isFinite(Date.parse(modifiedAt)) || typeof valuesHash !== "string" || !/^[a-f0-9]{64}$/.test(valuesHash)) throw new CmsError("validation", "Review an exact CMS record identity, version and values fingerprint.");
    const identity = `${collectionId}:${id}`;
    if (ids.has(identity)) throw new CmsError("validation", "A reviewed CMS record cannot appear twice.");
    ids.add(identity);
    return { collectionId, id, modifiedAt, valuesHash };
  });
}

export function readCmsPromotionResult(input: unknown, reviewed: ReviewedCmsRecord[]): CmsPromotionResult {
  const value = input as CmsPromotionResult | null;
  if (!value || typeof value !== "object" || typeof value.complete !== "boolean" || !Number.isInteger(value.published) || value.published < 0 || !Array.isArray(value.records) || value.records.length !== reviewed.length) throw new CmsError("validation", "Invalid reviewed CMS promotion result.");
  const records = value.records.map((record, index) => {
    if (!record || record.collectionId !== reviewed[index].collectionId || record.id !== reviewed[index].id || !["pending", "published", "already-published", "conflict", "not-found"].includes(record.state) || record.modifiedAt !== undefined && (typeof record.modifiedAt !== "string" || !Number.isFinite(Date.parse(record.modifiedAt)))) throw new CmsError("validation", "CMS promotion result differs from the captured review.");
    return { collectionId: record.collectionId, id: record.id, state: record.state, ...(record.modifiedAt ? { modifiedAt: record.modifiedAt } : {}) };
  });
  if (value.published !== records.filter(record => record.state === "published").length || value.complete !== records.every(record => record.state === "published" || record.state === "already-published")) throw new CmsError("validation", "CMS promotion completion does not match its record results.");
  return { published: value.published, complete: value.complete, records };
}

/** Stable across JSON transport and property order. Values stay in the
 * authenticated CMS; a receipt only needs this non-reversible identity. */
export async function cmsValuesHash(values: Record<string, CmsRecordValue>): Promise<string> {
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

/** Two writes in the same millisecond still need distinct optimistic versions. */
export function nextModifiedAt(previous: string): string {
  return new Date(Math.max(Date.now(), (Date.parse(previous) || 0) + 1)).toISOString();
}
