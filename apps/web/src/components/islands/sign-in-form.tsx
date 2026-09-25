import { useEffect, useState, type SubmitEvent } from "react";
import { useAuth } from "@three-acts/auth/react";
import { AppProviders } from "../../lib/providers";
import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";

/**
 * Only ever redirects to a same-origin path: guards against `?next=` being
 * used as an open-redirect vector (`//evil.com`, `/\evil.com`, an absolute
 * URL, ...). Anything that doesn't look like a safe local path falls back to
 * `/account`.
 */
function resolveNextPath(raw: string | null): string {
  if (!raw) return "/account";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/account";
  return raw;
}

function readNextPath(): string {
  if (typeof window === "undefined") return "/account";
  return resolveNextPath(new URLSearchParams(window.location.search).get("next"));
}

function SignInFormInner() {
  const { status, user, isLoading, error, signIn, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Already signed in (session restored, or a fresh sign-in just succeeded):
  // leave immediately rather than showing the form.
  useEffect(() => {
    if (status === "authenticated" && user) {
      window.location.assign(readNextPath());
    }
  }, [status, user]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    await signIn({ email, password });
  }

  // "initializing": the session restore is still in flight — wait rather
  // than flash the form. "authenticated": the redirect effect above is
  // about to navigate away.
  if (status !== "anonymous") {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Field.Root label="Email" required>
        <Field.Input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field.Root>
      <Field.Root label="Password" required>
        <Field.Input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field.Root>

      {import.meta.env.DEV && (
        <Notice.Root tone="info">Seeded customers can sign in with any password locally.</Notice.Root>
      )}

      {error && <Notice.Root tone="error">{error}</Notice.Root>}

      <Button.Root type="submit" loading={isLoading} className="w-full">
        Sign in
      </Button.Root>

      <p className="text-center text-small text-ink">
        New to Three Acts?{" "}
        <a href="/sign-up" className="focus-ring text-ink underline decoration-1 underline-offset-2 hover:no-underline">
          Create an account
        </a>
      </p>
    </form>
  );
}

/**
 * `/sign-in` client route's one island. Wrapped in `AppProviders` (see
 * `src/lib/providers.tsx`) so it shares `authClient`/`sessionStore` with
 * every other island — signing in here updates the header's `AccountLink`
 * immediately.
 */
export function SignInForm() {
  return (
    <AppProviders>
      <SignInFormInner />
    </AppProviders>
  );
}

export default SignInForm;
