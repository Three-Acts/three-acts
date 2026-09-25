import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveDataDir } from "../cms/file-store";

/**
 * A shop credential, linking a login email to a password hash and the
 * `customers` record it authenticates as. Never a CMS collection — this is
 * deliberately outside the Data Store/`/api/cms/*` surface so password
 * hashes are never reachable through the CMS.
 */
export type Identity = {
  id: string;
  /** Always lowercase — see `findByEmail`/`create`. */
  email: string;
  /** `null` for an identity that hasn't set a password yet (not currently produced by any caller, but part of the shape). */
  passwordHash: string | null;
  /** The `customers` record this identity signs in as. */
  customerId: string;
  createdAt: string;
};

export type NewIdentity = {
  email: string;
  passwordHash: string | null;
  customerId: string;
};

export interface IdentityStore {
  findByEmail(email: string): Promise<Identity | null>;
  create(identity: NewIdentity): Promise<Identity>;
  setPassword(email: string, passwordHash: string): Promise<void>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEnoent(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as NodeJS.ErrnoException).code === "ENOENT");
}

type StoredFile = { identities: Identity[] };

/**
 * `IdentityStore` backed by `<CMS_DATA_DIR>/identities.json`, written
 * atomically (write `.tmp`, then rename) the same way `FileDataStore` writes
 * each collection file. Mutations are serialized through a single write
 * queue (there's only ever one file here, unlike the per-collection queues
 * in `FileDataStore`) so concurrent sign-ups/sign-ins never race on disk.
 */
export class FileIdentityStore implements IdentityStore {
  private readonly filePath: string;
  private state: Promise<Identity[]> | undefined;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options?: { dir?: string }) {
    const dir = options?.dir ?? resolveDataDir();
    this.filePath = path.join(dir, "identities.json");
  }

  private load(): Promise<Identity[]> {
    if (!this.state) {
      this.state = this.readFromDisk();
    }
    return this.state;
  }

  private async readFromDisk(): Promise<Identity[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<StoredFile>;
      return Array.isArray(parsed.identities) ? parsed.identities : [];
    } catch (error) {
      if (!isEnoent(error)) {
        throw error;
      }
      return [];
    }
  }

  private persist(identities: Identity[]): Promise<void> {
    const next = this.writeQueue.catch(() => {}).then(async () => {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const tmpPath = `${this.filePath}.tmp`;
      const payload: StoredFile = { identities };
      await writeFile(tmpPath, JSON.stringify(payload, null, 2), "utf8");
      await rename(tmpPath, this.filePath);
    });
    this.writeQueue = next;
    return next;
  }

  async findByEmail(email: string): Promise<Identity | null> {
    const identities = await this.load();
    const normalized = normalizeEmail(email);
    return identities.find((identity) => identity.email === normalized) ?? null;
  }

  async create(identity: NewIdentity): Promise<Identity> {
    const identities = await this.load();
    const normalized = normalizeEmail(identity.email);

    // Defense in depth: callers (auth/service.ts) already check
    // `findByEmail` before creating, but a stale in-flight duplicate should
    // never silently overwrite an existing identity.
    if (identities.some((existing) => existing.email === normalized)) {
      throw new Error(`An identity for "${normalized}" already exists.`);
    }

    const created: Identity = {
      id: randomUUID(),
      email: normalized,
      passwordHash: identity.passwordHash,
      customerId: identity.customerId,
      createdAt: new Date().toISOString()
    };

    const next = [created, ...identities];
    this.state = Promise.resolve(next);
    await this.persist(next);
    return { ...created };
  }

  async setPassword(email: string, passwordHash: string): Promise<void> {
    const identities = await this.load();
    const normalized = normalizeEmail(email);
    const index = identities.findIndex((identity) => identity.email === normalized);
    if (index < 0) {
      throw new Error(`No identity for "${normalized}".`);
    }

    const next = [...identities];
    next[index] = { ...next[index], passwordHash };
    this.state = Promise.resolve(next);
    await this.persist(next);
  }
}

/** In-process `IdentityStore` for local dev without a file backend, and for tests. State lives for the lifetime of this process only. */
export class MemoryIdentityStore implements IdentityStore {
  private identities: Identity[] = [];

  async findByEmail(email: string): Promise<Identity | null> {
    const normalized = normalizeEmail(email);
    return this.identities.find((identity) => identity.email === normalized) ?? null;
  }

  async create(identity: NewIdentity): Promise<Identity> {
    const normalized = normalizeEmail(identity.email);
    if (this.identities.some((existing) => existing.email === normalized)) {
      throw new Error(`An identity for "${normalized}" already exists.`);
    }

    const created: Identity = {
      id: randomUUID(),
      email: normalized,
      passwordHash: identity.passwordHash,
      customerId: identity.customerId,
      createdAt: new Date().toISOString()
    };
    this.identities = [created, ...this.identities];
    return { ...created };
  }

  async setPassword(email: string, passwordHash: string): Promise<void> {
    const normalized = normalizeEmail(email);
    const index = this.identities.findIndex((identity) => identity.email === normalized);
    if (index < 0) {
      throw new Error(`No identity for "${normalized}".`);
    }
    this.identities[index] = { ...this.identities[index], passwordHash };
  }
}

function isVercelEnvironment(): boolean {
  return Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
}

function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

let cachedIdentityStore: IdentityStore | undefined;

/**
 * Picks the `IdentityStore` implementation the same way `resolve-store.ts`
 * picks the file/memory CMS data store: `FileIdentityStore` outside
 * Vercel/production (persists `identities.json` across local dev restarts),
 * `MemoryIdentityStore` on Vercel or in production (the file store's
 * directory isn't durable there).
 */
export function getIdentityStore(): IdentityStore {
  if (!cachedIdentityStore) {
    cachedIdentityStore = isVercelEnvironment() || isProduction() ? new MemoryIdentityStore() : new FileIdentityStore();
  }
  return cachedIdentityStore;
}

/** Test seam: pins the store `getIdentityStore()` returns. Pass `undefined` to clear the override. */
export function setIdentityStoreForTests(store: IdentityStore | undefined): void {
  cachedIdentityStore = store;
}
