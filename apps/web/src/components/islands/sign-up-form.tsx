import { useEffect, useState, type SubmitEvent } from "react";
import { useAuth } from "@three-acts/auth/react";
import { AppProviders } from "../../lib/providers";
import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { Notice } from "../ui/notice";

/** The exact message `@three-acts/auth`'s client produces for a 409 (see `packages/auth/src/client.ts`'s `friendlyMessage`) — used to add a "sign in instead" link on top of the generic error notice. */
const EMAIL_TAKEN_MESSAGE = "An account with this email already exists.";

function SignUpFormInner() {
  const { status, user, isLoading, error, signUp, clearError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && user) {
      window.location.assign("/account");
    }
  }, [status, user]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setFormError(null);

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    await signUp({ name, email, password, marketingOptIn });
  }

  if (status !== "anonymous") {
    return null;
  }

  const displayError = formError ?? error;
  const emailTaken = !formError && error === EMAIL_TAKEN_MESSAGE;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Field.Root label="Full name" required>
        <Field.Input
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field.Root>
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
      <Field.Root label="Password" required hint="At least 8 characters.">
        <Field.Input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field.Root>
      <Field.Root label="Confirm password" required>
        <Field.Input
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </Field.Root>
      <Field.Checkbox
        label="Send me occasional emails about new releases and product updates."
        checked={marketingOptIn}
        onChange={(event) => setMarketingOptIn(event.target.checked)}
      />

      {displayError && (
        <Notice.Root tone="error">
          {displayError}
          {emailTaken && (
            <>
              {" "}
              <a href="/sign-in" className="focus-ring text-ink underline decoration-1 underline-offset-2 hover:no-underline">
                Sign in instead
              </a>
              .
            </>
          )}
        </Notice.Root>
      )}

      <Button.Root type="submit" loading={isLoading} className="w-full">
        Create account
      </Button.Root>

      <p className="text-center text-small text-ink">
        Already have an account?{" "}
        <a href="/sign-in" className="focus-ring text-ink underline decoration-1 underline-offset-2 hover:no-underline">
          Sign in
        </a>
      </p>
    </form>
  );
}

/**
 * `/sign-up` client route's one island. Wrapped in `AppProviders` so it
 * shares `authClient`/`sessionStore` with every other island; a successful
 * sign-up updates the header's `AccountLink` before the redirect to
 * `/account` fires.
 */
export function SignUpForm() {
  return (
    <AppProviders>
      <SignUpFormInner />
    </AppProviders>
  );
}

export default SignUpForm;
