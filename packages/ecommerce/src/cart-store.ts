import type { Cart, CartLine } from "./models";

/** The minimal storage surface the cart store needs — satisfied by `window.localStorage` or a test double. */
export type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type CartStore = {
  getState(): Cart;
  /** Registers a change listener; returns an unsubscribe function. Compatible with `useSyncExternalStore`. */
  subscribe(listener: () => void): () => void;
  add(slug: string, quantity?: number): void;
  setQuantity(slug: string, quantity: number): void;
  remove(slug: string): void;
  clear(): void;
  setDiscountCode(code: string | undefined): void;
};

export type CreateCartStoreOptions = {
  storage?: KeyValueStorage;
  key?: string;
};

const DEFAULT_KEY = "three-acts:cart:v1";
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;
const PERSISTED_VERSION = 1;

type PersistedCart = {
  version: typeof PERSISTED_VERSION;
  lines: CartLine[];
  discountCode?: string;
  updatedAt: string;
};

function clampQuantity(quantity: number): number {
  const rounded = Math.round(quantity);
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, rounded));
}

function emptyCart(): Cart {
  return { lines: [], updatedAt: new Date(0).toISOString() };
}

function createMemoryStorage(): KeyValueStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    }
  };
}

/** `globalThis.localStorage` when available (browsers, and jsdom-style test environments); an in-memory Map otherwise (SSR, plain Node). */
function defaultStorage(): KeyValueStorage {
  try {
    const candidate = (globalThis as { localStorage?: KeyValueStorage }).localStorage;
    if (candidate) {
      return candidate;
    }
  } catch {
    // Accessing localStorage can throw (private browsing, disabled storage).
  }
  return createMemoryStorage();
}

function isCartLine(value: unknown): value is CartLine {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { slug?: unknown }).slug === "string" &&
    typeof (value as { quantity?: unknown }).quantity === "number"
  );
}

/** Parses a persisted payload, returning `null` for anything corrupt, non-JSON, or from a different `version`. */
function parsePersisted(raw: string | null): Cart | null {
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const candidate = parsed as Partial<PersistedCart>;
  if (candidate.version !== PERSISTED_VERSION || !Array.isArray(candidate.lines)) {
    return null;
  }
  const lines = candidate.lines.filter(isCartLine).map((line) => ({ slug: line.slug, quantity: clampQuantity(line.quantity) }));
  const cart: Cart = {
    lines,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date(0).toISOString()
  };
  if (typeof candidate.discountCode === "string" && candidate.discountCode) {
    cart.discountCode = candidate.discountCode;
  }
  return cart;
}

/**
 * A framework-agnostic, storage-agnostic cart store: plain get/subscribe/set
 * so it works from a React hook (`../react`), a vanilla script, or a test.
 * Persists to `storage` (default `localStorage`, falling back to an
 * in-memory `Map` when unavailable) as `{ version, lines, discountCode,
 * updatedAt }`, and — when `window` exists — listens for `storage` events on
 * the same key so every island on every page shares one cart.
 */
export function createCartStore(options: CreateCartStoreOptions = {}): CartStore {
  const storage = options.storage ?? defaultStorage();
  const key = options.key ?? DEFAULT_KEY;
  const listeners = new Set<() => void>();

  let state: Cart = parsePersisted(storage.getItem(key)) ?? emptyCart();

  function persist(): void {
    const payload: PersistedCart = { version: PERSISTED_VERSION, lines: state.lines, updatedAt: state.updatedAt };
    if (state.discountCode) {
      payload.discountCode = state.discountCode;
    }
    try {
      storage.setItem(key, JSON.stringify(payload));
    } catch {
      // Storage full or unavailable — in-memory state still updates; nothing to persist.
    }
  }

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function setState(next: Cart): void {
    state = next;
    persist();
    notify();
  }

  function setLines(lines: CartLine[]): void {
    const next: Cart = { lines, updatedAt: new Date().toISOString() };
    if (state.discountCode) {
      next.discountCode = state.discountCode;
    }
    setState(next);
  }

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }
      state = parsePersisted(event.newValue) ?? emptyCart();
      notify();
    });
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    add(slug, quantity = 1) {
      const lines = [...state.lines];
      const index = lines.findIndex((line) => line.slug === slug);
      if (index === -1) {
        lines.push({ slug, quantity: clampQuantity(quantity) });
      } else {
        lines[index] = { slug, quantity: clampQuantity(lines[index].quantity + quantity) };
      }
      setLines(lines);
    },

    setQuantity(slug, quantity) {
      if (quantity <= 0) {
        setLines(state.lines.filter((line) => line.slug !== slug));
        return;
      }
      const clamped = clampQuantity(quantity);
      const exists = state.lines.some((line) => line.slug === slug);
      const lines = exists
        ? state.lines.map((line) => (line.slug === slug ? { slug, quantity: clamped } : line))
        : [...state.lines, { slug, quantity: clamped }];
      setLines(lines);
    },

    remove(slug) {
      setLines(state.lines.filter((line) => line.slug !== slug));
    },

    clear() {
      setState(emptyCart());
    },

    setDiscountCode(code) {
      const next: Cart = { lines: state.lines, updatedAt: new Date().toISOString() };
      if (code) {
        next.discountCode = code;
      }
      setState(next);
    }
  };
}
