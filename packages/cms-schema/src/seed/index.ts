import type { SeedCollections } from "./types";

export * from "./types";
export * from "./keys";

/**
 * Every seed collection, merged. Filled in once the domain seed files
 * (content.ts, shop.ts, site.ts) exist.
 */
export const seedCollections: SeedCollections = {};
