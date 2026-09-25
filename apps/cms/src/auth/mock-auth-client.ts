import type { AuthClient, AuthUser, Session, SignInCredentials, SignUpInput } from "@three-acts/auth";

// "craig.c" -> "Craig C": each dot/dash/underscore-separated chunk of the
// local part becomes a capitalized word, standing in for a real display name.
function nameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? email;

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

// Far enough out that the shared `SessionStore.isExpired` logic (mirrored
// here only conceptually — this client never persists to that store) would
// never trip during a dev session.
const FAR_FUTURE_EXPIRY = "2999-01-01T00:00:00.000Z";

function buildSession(email: string): Session {
  const trimmedEmail = email.trim();
  const user: AuthUser = {
    id: "local-editor",
    email: trimmedEmail,
    name: nameFromEmail(trimmedEmail),
    scope: "cms",
    role: "editor"
  };

  return { token: "mock-cms-session", user, expiresAt: FAR_FUTURE_EXPIRY };
}

/**
 * Zero-backend `AuthClient` for `VITE_CMS_BACKEND=mock`: accepts any
 * non-empty email/password, never touches the network, and — like the
 * bespoke client this replaces — never persists across a reload. Signing in
 * is a fresh in-memory session for the life of the tab; `restore()` always
 * starts the workspace signed out.
 */
export function createMockAuthClient(): AuthClient {
  let session: Session | null = null;
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  async function signIn({ email, password }: SignInCredentials): Promise<AuthUser> {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      throw new Error("Enter your email and password.");
    }

    session = buildSession(trimmedEmail);
    notify();
    return session.user;
  }

  async function signUp(input: SignUpInput): Promise<AuthUser> {
    return signIn({ email: input.email, password: input.password });
  }

  async function signOut(): Promise<void> {
    session = null;
    notify();
  }

  async function restore(): Promise<AuthUser | null> {
    return session?.user ?? null;
  }

  function getAccessToken(): string | null {
    return session?.token ?? null;
  }

  function getUser(): AuthUser | null {
    return session?.user ?? null;
  }

  function getSession(): Session | null {
    return session;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { signIn, signUp, signOut, restore, getAccessToken, getUser, getSession, subscribe };
}

export const mockAuthClient: AuthClient = createMockAuthClient();
