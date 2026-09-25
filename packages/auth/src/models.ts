/**
 * The two independent auth realms this monorepo issues sessions for: the
 * public storefront ("shop", customers) and the private editorial workspace
 * ("cms", editors). A single `AuthUser`/`Session` shape carries either.
 */
export type AuthScope = "shop" | "cms";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  scope: AuthScope;
  /** Set only for `scope: "shop"` users: the linked `customers` record id. */
  customerId?: string;
  /** Set only for `scope: "cms"` users. */
  role?: "admin" | "editor";
};

export type Session = {
  token: string;
  user: AuthUser;
  /** ISO-8601 timestamp; the session is invalid at or after this instant. */
  expiresAt: string;
};

export type SignInCredentials = {
  email: string;
  password: string;
};

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  marketingOptIn?: boolean;
};
