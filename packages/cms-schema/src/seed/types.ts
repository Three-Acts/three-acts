import type { CmsRecord, CmsRecordValue, PublishStatus } from "../types";

/** Seed records keyed by collection id. Values are keyed by field key, exactly like `CmsRecord.values`. */
export type SeedCollections = Record<string, CmsRecord[]>;

/** Fixed clock for every seed: all generated dates are relative to this so seeds are deterministic. */
export const seedNow = new Date("2026-09-01T09:00:00.000Z");

/** ISO timestamp `days` before `seedNow` (negative = in the future), optionally offset by hours. */
export function daysAgo(days: number, hours = 0): string {
  return new Date(seedNow.getTime() - days * 86_400_000 - hours * 3_600_000).toISOString();
}

/** Deterministic PRNG (mulberry32). Never use Math.random in seeds. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

type SeedRecordInput = {
  id: string;
  publishStatus?: PublishStatus;
  createdAt: string;
  modifiedAt?: string;
  values: Record<string, CmsRecordValue>;
  /**
   * Live snapshot. Defaults: `published` → same as values; `draft`/`queued_to_publish`
   * → null (never published) unless given; `not_published` → null.
   */
  liveValues?: Record<string, CmsRecordValue> | null;
};

/** Build a seed record, applying the publish-model defaults for `liveValues`. */
export function seedRecord(input: SeedRecordInput): CmsRecord {
  const publishStatus = input.publishStatus ?? "published";
  const liveValues =
    input.liveValues !== undefined ? input.liveValues : publishStatus === "published" ? { ...input.values } : null;
  return {
    id: input.id,
    publishStatus,
    createdAt: input.createdAt,
    modifiedAt: input.modifiedAt ?? input.createdAt,
    values: input.values,
    liveValues: publishStatus === "not_published" ? null : liveValues
  };
}
