import { contentSeed } from "./content";
import { shopSeed } from "./shop";
import { siteSeed } from "./site";
import type { SeedCollections } from "./types";

export * from "./types";
export * from "./keys";
export { contentSeed } from "./content";
export { shopSeed } from "./shop";
export { siteSeed } from "./site";

/**
 * Every seed collection, merged (content + shop + site). Treat as read-only —
 * backends that mutate records must start from `cloneSeedCollections()`.
 */
export const seedCollections: SeedCollections = { ...contentSeed, ...shopSeed, ...siteSeed };

/** A fresh deep copy of every seed collection, safe to mutate (mock backends, memory stores, tests). */
export function cloneSeedCollections(): SeedCollections {
  return structuredClone(seedCollections);
}
