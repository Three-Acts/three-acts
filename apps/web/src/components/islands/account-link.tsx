import { useAuth } from "@three-acts/auth/react";
import { AppProviders } from "../../lib/providers";

const LINK_CLASS = "focus-ring text-body text-ink hover:underline";

function AccountLinkInner() {
  const { user, status } = useAuth();

  if (status === "authenticated" && user) {
    const firstName = user.name.trim().split(/\s+/)[0] || user.name;
    return (
      <a href="/account" className={LINK_CLASS}>
        {firstName}
      </a>
    );
  }

  return (
    <a href="/sign-in" className={LINK_CLASS}>
      Sign in
    </a>
  );
}

/**
 * Header account link: the signed-in customer's first name (linking to
 * `/account`) or "Sign in". Wrapped in `AppProviders` (see
 * `src/lib/providers.tsx`) so it shares `authClient`/`sessionStore` with
 * every other island. `status` starts `"initializing"` during SSR and before
 * the client-side session restore resolves, which this treats the same as
 * `"anonymous"` — so the zero-JS/pre-hydration fallback is "Sign in".
 */
export function AccountLink() {
  return (
    <AppProviders>
      <AccountLinkInner />
    </AppProviders>
  );
}

export default AccountLink;
