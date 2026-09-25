import type { Session } from "./models";

/**
 * The minimal `localStorage`-shaped surface this store needs, so tests (and
 * non-browser hosts) can inject an in-memory or custom implementation
 * instead of the real Web Storage API.
 */
export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type SessionStore = {
  /** Returns a stable reference when nothing has changed (safe for
   *  `useSyncExternalStore`). Drops (and evicts) an expired session. */
  getState(): Session | null;
  subscribe(listener: () => void): () => void;
  set(session: Session | null): void;
  /** Shorthand for `getState()?.token ?? null`. */
  getToken(): string | null;
};

type PersistedSession = { version: 1; session: Session };

const DEFAULT_KEY = "three-acts:session:v1";

function isExpired(session: Session): boolean {
  const expiresAt = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function parsePersisted(raw: string | null): Session | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedSession> | null;

    if (!parsed || parsed.version !== 1 || !parsed.session) return null;

    return parsed.session;
  } catch {
    return null;
  }
}

/**
 * `localStorage` throws in some hosts (private browsing with storage
 * disabled, certain SSR shims) even when it exists on `globalThis`, so this
 * probes a write/remove before trusting it and falls back to `null`
 * (in-memory mode) otherwise.
 */
function resolveDefaultStorage(): KeyValueStorage | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }

  try {
    const storage = (globalThis as { localStorage?: KeyValueStorage }).localStorage;
    if (!storage) return null;

    const probeKey = "__three_acts_auth_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

/**
 * Storage-agnostic client-side session store, mirroring the cart store's
 * pattern (`@three-acts/ecommerce`'s `createCartStore`): persists to
 * `localStorage` under `three-acts:session:v1` when available, otherwise
 * keeps state in memory for the life of the store. Listens for the
 * `storage` event so every tab/island sharing the same storage backend
 * observes sign-in/sign-out immediately.
 */
export function createSessionStore(options: { storage?: KeyValueStorage; key?: string } = {}): SessionStore {
  const key = options.key ?? DEFAULT_KEY;
  const storage = options.storage ?? resolveDefaultStorage();

  let memoryState: Session | null = null;
  let cachedRaw: string | null | undefined; // undefined = not yet read
  let cachedState: Session | null = null;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  function readFromStorage(): Session | null {
    if (!storage) return null;

    const raw = storage.getItem(key);

    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedState = parsePersisted(raw);
    }

    if (cachedState && isExpired(cachedState)) {
      storage.removeItem(key);
      cachedRaw = null;
      cachedState = null;
    }

    return cachedState;
  }

  function getState(): Session | null {
    if (!storage) {
      if (memoryState && isExpired(memoryState)) {
        memoryState = null;
      }
      return memoryState;
    }

    return readFromStorage();
  }

  function set(session: Session | null): void {
    if (!storage) {
      memoryState = session;
      notify();
      return;
    }

    if (session) {
      const raw = JSON.stringify({ version: 1, session } satisfies PersistedSession);
      storage.setItem(key, raw);
      cachedRaw = raw;
      cachedState = session;
    } else {
      storage.removeItem(key);
      cachedRaw = null;
      cachedState = null;
    }

    notify();
  }

  function getToken(): string | null {
    return getState()?.token ?? null;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  // Cross-tab/cross-island sync: another consumer of the same storage
  // backend (e.g. another browser tab) changed the session. Node (tests,
  // SSR) has no `addEventListener` global, so this is a no-op there.
  type GlobalWithEvents = typeof globalThis & {
    addEventListener?: (type: "storage", listener: (event: StorageEvent) => void) => void;
  };
  const globalWithEvents = globalThis as GlobalWithEvents;

  if (typeof globalWithEvents.addEventListener === "function") {
    globalWithEvents.addEventListener("storage", (event) => {
      if (event.key !== key) return;
      cachedRaw = undefined;
      notify();
    });
  }

  return { getState, subscribe, set, getToken };
}
