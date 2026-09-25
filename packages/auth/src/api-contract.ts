import type { AuthScope, AuthUser, Session, SignInCredentials, SignUpInput } from "./models";

/**
 * The API's auth routes, relative to the shared `apiFetch` base URL (see
 * `@three-acts/utils`'s `createApiClient`, which defaults that base to
 * `/api`). Shared so the client and any server-side route registration
 * agree on the same paths.
 */
export const authApiPaths = {
  signUp: (): `/${string}` => "/auth/sign-up",
  signIn: (): `/${string}` => "/auth/sign-in",
  signOut: (): `/${string}` => "/auth/sign-out",
  session: (): `/${string}` => "/auth/session",
  account: (): `/${string}` => "/auth/account"
} as const;

export type SignInRequest = SignInCredentials & {
  /** Which realm to authenticate against; the API defaults this to "shop". */
  scope?: AuthScope;
};
export type SignInResponse = Session;

export type SignUpRequest = SignUpInput;
export type SignUpResponse = Session;

export type SessionResponse = { user: AuthUser | null };

export type UpdateAccountRequest = Partial<{
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  marketingOptIn: boolean;
}>;
