import { useState, type FormEvent } from "react";
import type { SignInCredentials } from "@three-acts/auth";
import { Button, FormField, Input, Logo } from "../components/atoms";

export function LoginScreen({
  error,
  isLoading,
  onSignIn
}: {
  error?: string | null;
  isLoading: boolean;
  onSignIn: (credentials: SignInCredentials) => void | Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.reportValidity()) {
      return;
    }

    onSignIn({ email, password });
  }

  return (
    <main className="flex min-h-screen flex-col bg-cms-bg text-cms-text">
      <header className="flex shrink-0 items-center px-6 py-4">
        <Logo />
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-10 px-6 pb-12 lg:grid-cols-2 lg:gap-16 lg:px-16">
        <section className="order-2 mx-auto w-full max-w-95 lg:order-2 lg:ml-auto lg:mr-0">
          <h2 className="m-0 text-ui-lg font-semibold">Welcome back</h2>
          <p className="mb-6 mt-1.5 text-ui text-cms-muted">
            Sign in with your editor account.
            {import.meta.env.DEV ? " In local development the API accepts any email and password." : null}
          </p>
          <form className="grid" onSubmit={handleSubmit} noValidate>
            <FormField label="Email" required>
              <Input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </FormField>
            <FormField label="Password" required>
              <Input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </FormField>
            <Button className="mt-2 w-full" disabled={isLoading} size="md" type="submit" variant="primary">
              {isLoading ? "Signing in…" : "Log in"}
            </Button>
          </form>
          {error ? (
            <p className="mb-0 mt-3 text-ui text-cms-danger" role="alert">
              {error}
            </p>
          ) : null}
        </section>
        <section className="order-1 lg:order-1">
          {/* The display face gets room here and nowhere else in the workspace. */}
          <h1 className="m-0 font-serif text-display font-semibold tracking-tight">Back of house.</h1>
          <p className="mb-2 mt-3 text-field leading-6 text-cms-muted">
            Sign in to edit the site&rsquo;s collections. This workspace is private and never indexed.
          </p>
          <p className="m-0 text-ui text-cms-subtle">Every collection, asset, and draft lives behind this one login.</p>
        </section>
      </div>
    </main>
  );
}
