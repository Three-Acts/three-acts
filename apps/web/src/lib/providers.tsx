import type { ReactNode } from "react";
import { AuthProvider } from "@three-acts/auth/react";
import { CartProvider } from "@three-acts/ecommerce/react";
import { authClient } from "./session";
import { cartStore } from "./cart";

/**
 * Every island that reads or writes auth/cart state wraps itself in this —
 * Astro hydrates each island as its own, isolated React root, so React
 * context can't cross islands directly. What DOES cross islands is the
 * shared `authClient`/`cartStore` singletons (`./session`, `./cart`): each
 * island gets its own `AuthProvider`/`CartProvider`, but every one of those
 * providers wraps the same underlying store, so `useAuth()`/`useCart()` stay
 * in sync everywhere through the stores' own subscribe/notify (backed by
 * `localStorage` + the `storage` event), not through React context.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider client={authClient}>
      <CartProvider store={cartStore}>{children}</CartProvider>
    </AuthProvider>
  );
}

export default AppProviders;
