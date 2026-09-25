import { FileBlobStore, FileDataStore, resolveDataDir } from "./file-store";
import { MemoryBlobStore, MemoryDataStore } from "./memory-store";
import { SupabaseBlobStore, SupabaseDataStore } from "./supabase-store";
import type { CmsBlobStore, CmsDataStore } from "./store";

type BackendName = "supabase" | "memory" | "file";

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/**
 * Vercel sets `VERCEL=1` in every deployment environment (production,
 * preview, and its own "development" runtime) and `VERCEL_ENV` to which one.
 * The file store writes to a local directory that doesn't persist reliably
 * (or at all) across serverless invocations, so it must never be picked while
 * running on Vercel, regardless of which `VERCEL_ENV`.
 */
function isVercelEnvironment(): boolean {
  return Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
}

/**
 * Picks the backend for `CMS_DATA_BACKEND` / `CMS_STORAGE_BACKEND`:
 * - "supabase" | "memory" | "file" picks that backend explicitly.
 * - unset defaults to "supabase" when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   are both configured; otherwise "file" outside production/Vercel (so local
 *   dev persists across restarts with zero external services), or "memory"
 *   when running in production or on Vercel (where the file store's directory
 *   isn't durable).
 */
function resolveBackendName(envValue: string | undefined): BackendName {
  if (envValue === "supabase" || envValue === "memory" || envValue === "file") {
    return envValue;
  }

  const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (supabaseConfigured) {
    return "supabase";
  }

  return isProduction() || isVercelEnvironment() ? "memory" : "file";
}

/**
 * Local dev only: the memory/file stores start from the shared "Fynbos &
 * Fire" seed so `npm run dev` serves the same realistic data as the CMS mock.
 * Loaded on demand so production bundles never evaluate it.
 */
async function loadDevSeed() {
  const { cloneSeedCollections } = await import("@three-acts/cms-schema/seed");
  return cloneSeedCollections();
}

let cachedDataStore: CmsDataStore | undefined;
let cachedBlobStore: CmsBlobStore | undefined;

export function getDataStore(): CmsDataStore {
  if (!cachedDataStore) {
    const backend = resolveBackendName(process.env.CMS_DATA_BACKEND);

    if (backend === "supabase") {
      cachedDataStore = new SupabaseDataStore();
      console.info(`[cms] data backend: ${cachedDataStore.name}`);
    } else if (backend === "file") {
      const dir = resolveDataDir();
      cachedDataStore = new FileDataStore({ dir, loadSeed: isProduction() ? undefined : loadDevSeed });
      console.info(`[cms] data backend: file (dir: ${dir})`);
    } else {
      cachedDataStore = new MemoryDataStore(isProduction() ? undefined : loadDevSeed);
      console.info(`[cms] data backend: ${cachedDataStore.name}`);
    }
  }

  return cachedDataStore;
}

export function getBlobStore(): CmsBlobStore {
  if (!cachedBlobStore) {
    const backend = resolveBackendName(process.env.CMS_STORAGE_BACKEND);

    if (backend === "supabase") {
      cachedBlobStore = new SupabaseBlobStore();
      console.info(`[cms] storage backend: ${cachedBlobStore.name}`);
    } else if (backend === "file") {
      const dir = resolveDataDir();
      cachedBlobStore = new FileBlobStore({ dir });
      console.info(`[cms] storage backend: file (dir: ${dir})`);
    } else {
      cachedBlobStore = new MemoryBlobStore();
      console.info(`[cms] storage backend: ${cachedBlobStore.name}`);
    }
  }

  return cachedBlobStore;
}

/**
 * Test seam: pins the data store `getDataStore()` returns, bypassing env
 * resolution entirely. Pass `undefined` to clear the override and force the
 * next `getDataStore()` call to re-resolve from env.
 */
export function setDataStoreForTests(store: CmsDataStore | undefined): void {
  cachedDataStore = store;
}

/** Test seam: same as `setDataStoreForTests`, for the blob store. */
export function setBlobStoreForTests(store: CmsBlobStore | undefined): void {
  cachedBlobStore = store;
}
