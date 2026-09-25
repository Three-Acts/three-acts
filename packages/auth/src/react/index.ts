import { createElement, createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { AuthClient } from "../client";
import type { AuthUser, Session, SignInCredentials, SignUpInput } from "../models";

export type AuthStatus = "initializing" | "anonymous" | "authenticated";

export type AuthContextValue = {
  user: AuthUser | null;
  session: Session | null;
  status: AuthStatus;
  /** True only while the initial session restore (on mount) is in flight. */
  isLoading: boolean;
  /** Message from the most recent failed signIn/signUp, if any. */
  error: string | null;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * A drop-in superset of the CMS's current hand-rolled `auth-context`
 * (`user`, `isLoading`, `error`, `signIn`, `signOut`, `isInitializing` ->
 * folded into `status`) plus the fields the storefront needs (`session`,
 * `signUp`, `clearError`, an `"anonymous"` vs `"authenticated"` status
 * instead of a bare `user: null` check).
 *
 * Like the existing CMS provider, `signIn`/`signUp`/`signOut` never reject —
 * failures are reported through `error` so callers can pass them straight
 * through as an `onSignIn` prop without a try/catch.
 */
export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  const session = useSyncExternalStore(client.subscribe, client.getSession, client.getSession);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore an existing session on mount instead of always starting signed out.
  useEffect(() => {
    let cancelled = false;

    client.restore().finally(() => {
      if (!cancelled) {
        setIsInitializing(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [client]);

  const signIn = useCallback(
    async (credentials: SignInCredentials) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.signIn(credentials);
      } catch (signInError) {
        setError(signInError instanceof Error ? signInError.message : "Sign-in failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      setIsLoading(true);
      setError(null);
      try {
        await client.signUp(input);
      } catch (signUpError) {
        setError(signUpError instanceof Error ? signUpError.message : "Sign-up failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await client.signOut();
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const clearError = useCallback(() => setError(null), []);

  const status: AuthStatus = isInitializing ? "initializing" : session ? "authenticated" : "anonymous";

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      status,
      isLoading,
      error,
      signIn,
      signUp,
      signOut,
      clearError
    }),
    [session, status, isLoading, error, signIn, signUp, signOut, clearError]
  );

  // Plain `createElement` (no JSX) so this stays a valid `.ts` module, as
  // the package's exports map (`"./react": "./src/react/index.ts"`) requires.
  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

/** Shorthand for `useAuth().session?.token ?? null`, for call sites that
 *  only need the bearer token (most should prefer `apiFetch`, which
 *  attaches it automatically — see `createAuthClient`'s docs). */
export function useSessionToken(): string | null {
  return useAuth().session?.token ?? null;
}
