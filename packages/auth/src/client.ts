import { ApiRequestError } from "@three-acts/utils";
import { authApiPaths, type SessionResponse, type SignInRequest, type SignInResponse, type SignUpRequest, type SignUpResponse } from "./api-contract";
import type { AuthScope, AuthUser, Session, SignInCredentials, SignUpInput } from "./models";
import type { SessionStore } from "./session-store";

/**
 * The shape every app's `apiFetch` already has (see
 * `@three-acts/utils`'s `createApiClient`). This client never attaches an
 * `Authorization` header itself — see `CreateAuthClientOptions.apiFetch`.
 */
export type ApiFetch = <TData>(path: `/${string}`, init?: RequestInit) => Promise<TData>;

export type AuthClient = {
  signIn(credentials: SignInCredentials): Promise<AuthUser>;
  signUp(input: SignUpInput): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Returns the cached user (if the stored session isn't expired) without
   *  waiting on the network, then revalidates against the API in the
   *  background and clears the store if the API no longer recognizes it. */
  restore(): Promise<AuthUser | null>;
  getAccessToken(): string | null;
  getUser(): AuthUser | null;
  /** The full stored session (token + user + expiry), for consumers (e.g.
   *  the React layer) that need more than just the user. */
  getSession(): Session | null;
  subscribe(listener: () => void): () => void;
};

export type CreateAuthClientOptions = {
  /**
   * The caller's shared `apiFetch` (from `@three-acts/utils`'s
   * `createApiClient`). It must already be configured to attach the bearer
   * token this client's session produces, i.e.
   * `createApiClient({ getAuthToken: () => store.getToken() })` — this
   * client relies entirely on that wiring for authenticated requests
   * (`session`, `signOut`) and never sets `Authorization` itself.
   */
  apiFetch: ApiFetch;
  store: SessionStore;
  scope: AuthScope;
};

function friendlyMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Incorrect email or password.";
    if (error.status === 409) return "An account with this email already exists.";
    return error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong.";
}

/**
 * Builds an `AuthClient` bound to one `AuthScope` ("shop" or "cms"). Shared
 * by the web app and the CMS so sign-in/sign-up/sign-out/session-restore
 * behave identically everywhere; only the `scope` and the injected
 * `apiFetch`/`store` differ.
 */
export function createAuthClient(options: CreateAuthClientOptions): AuthClient {
  const { apiFetch, store, scope } = options;

  async function signIn(credentials: SignInCredentials): Promise<AuthUser> {
    try {
      const body: SignInRequest = { ...credentials, scope };
      const session = await apiFetch<SignInResponse>(authApiPaths.signIn(), {
        method: "POST",
        body: JSON.stringify(body)
      });
      store.set(session);
      return session.user;
    } catch (error) {
      throw new Error(friendlyMessage(error));
    }
  }

  async function signUp(input: SignUpInput): Promise<AuthUser> {
    try {
      const body: SignUpRequest = input;
      const session = await apiFetch<SignUpResponse>(authApiPaths.signUp(), {
        method: "POST",
        body: JSON.stringify(body)
      });
      store.set(session);
      return session.user;
    } catch (error) {
      throw new Error(friendlyMessage(error));
    }
  }

  async function signOut(): Promise<void> {
    try {
      await apiFetch(authApiPaths.signOut(), { method: "POST" });
    } catch {
      // Best-effort: the client always drops its local session even if the
      // network call fails (offline, API down, already-expired token, ...).
    } finally {
      store.set(null);
    }
  }

  async function restore(): Promise<AuthUser | null> {
    const session = store.getState();
    if (!session) return null;

    // Revalidate in the background; callers get the cached user immediately
    // instead of waiting on this round trip.
    void apiFetch<SessionResponse>(authApiPaths.session(), { method: "GET" })
      .then((response) => {
        if (!response.user) {
          store.set(null);
        }
      })
      .catch(() => {
        // Transient network failure: keep the cached session rather than
        // signing the user out.
      });

    return session.user;
  }

  function getAccessToken(): string | null {
    return store.getToken();
  }

  function getUser(): AuthUser | null {
    return store.getState()?.user ?? null;
  }

  function getSession(): Session | null {
    return store.getState();
  }

  function subscribe(listener: () => void): () => void {
    return store.subscribe(listener);
  }

  return { signIn, signUp, signOut, restore, getAccessToken, getUser, getSession, subscribe };
}
