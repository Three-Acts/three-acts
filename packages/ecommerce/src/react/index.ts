/**
 * React bindings for the cart store, kept out of the package's core (`.`)
 * entry point so `@three-acts/ecommerce` stays usable from non-React code
 * (the API app, node scripts, tests). No JSX here on purpose: this file
 * ships as `.ts`, not `.tsx` (see `package.json`'s "./react" export), so
 * components are built with `createElement` instead.
 */
import { createContext, createElement, useContext, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createCartStore } from "../cart-store";
import type { CartStore } from "../cart-store";
import type { Cart } from "../models";

const CartStoreContext = createContext<CartStore | null>(null);

/** Snapshot handed to `useSyncExternalStore` during SSR / the first static render (Astro islands render this before hydration). */
const serverCart: Cart = { lines: [], updatedAt: new Date(0).toISOString() };

export type CartProviderProps = {
  /** Supply an existing store to share one cart across providers (e.g. tests); omit to create one lazily. */
  store?: CartStore;
  children?: ReactNode;
};

export function CartProvider(props: CartProviderProps) {
  const [store] = useState<CartStore>(() => props.store ?? createCartStore());
  return createElement(CartStoreContext.Provider, { value: store }, props.children);
}

/** The raw store from context. Throws outside a `CartProvider` — use `useCart()` for the ergonomic read/write API. */
export function useCartStore(): CartStore {
  const store = useContext(CartStoreContext);
  if (!store) {
    throw new Error("useCartStore must be used within a CartProvider.");
  }
  return store;
}

export function useCart() {
  const store = useCartStore();
  const cart = useSyncExternalStore(store.subscribe, store.getState, () => serverCart);
  return {
    cart,
    lines: cart.lines,
    itemCount: cart.lines.reduce((sum, line) => sum + line.quantity, 0),
    add: store.add,
    setQuantity: store.setQuantity,
    remove: store.remove,
    clear: store.clear,
    setDiscountCode: store.setDiscountCode
  };
}
