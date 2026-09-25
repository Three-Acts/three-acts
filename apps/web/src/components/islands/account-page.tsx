import { useEffect, useState } from "react";
import { useAuth } from "@three-acts/auth/react";
import { authApiPaths } from "@three-acts/auth";
import { shopApiPaths, type Customer, type Order } from "@three-acts/ecommerce";
import { ApiRequestError, cn } from "@three-acts/utils";
import { apiFetch } from "../../lib/api-client";
import { AppProviders } from "../../lib/providers";
import { OrdersPanel } from "../account/orders-panel";
import { ProfilePanel } from "../account/profile-panel";
import { Button } from "../ui/button";
import { Notice } from "../ui/notice";

type Tab = "profile" | "orders";

function describeError(error: unknown): string {
  if (error instanceof ApiRequestError || error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function tabClass(active: boolean) {
  return cn(
    "focus-ring -mb-px border-b px-4 py-3 text-body transition-colors duration-150",
    active
      ? "border-ink font-medium text-ink"
      : "border-transparent text-ink underline decoration-1 underline-offset-4 hover:no-underline"
  );
}

/** A handful of pulsing bars standing in for the profile/orders chrome while the initial session restore is in flight. */
function AccountSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-8">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-6">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 bg-ink/10" />
          <div className="h-5 w-40 bg-ink/10" />
        </div>
        <div className="h-9 w-24 bg-ink/10" />
      </div>
      <div className="flex gap-6 border-b border-line pb-3">
        <div className="h-4 w-16 bg-ink/10" />
        <div className="h-4 w-16 bg-ink/10" />
      </div>
      <div className="flex max-w-xl flex-col gap-4">
        <div className="h-10 w-full bg-ink/10" />
        <div className="h-10 w-full bg-ink/10" />
        <div className="h-10 w-full bg-ink/10" />
      </div>
    </div>
  );
}

function AccountPageInner() {
  const { status, user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Unauthenticated: bounce to sign-in, preserving the way back.
  useEffect(() => {
    if (status === "anonymous") {
      window.location.replace("/sign-in?next=/account");
    }
  }, [status]);

  // Authenticated: load the full customer record + order history once.
  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    apiFetch<{ customer: Customer }>(authApiPaths.account())
      .then((response) => {
        if (!cancelled) setCustomer(response.customer);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(describeError(error));
      });

    // `shopApiPaths.orders()` isn't typed as a template-literal path (unlike
    // `authApiPaths`'s builders) — see the same cast needed elsewhere
    // (`checkout/product-catalogue.ts`, `islands/product-reviews.tsx`).
    apiFetch<{ orders: Order[] }>(shopApiPaths.orders() as `/${string}`)
      .then((response) => {
        if (!cancelled) setOrders(response.orders);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(describeError(error));
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    window.location.assign("/");
  }

  // "initializing" (restore in flight) and "anonymous" (redirect effect above
  // is about to fire) both show the skeleton rather than a flash of content.
  if (status !== "authenticated" || !user) {
    return <AccountSkeleton />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-small text-ink">Signed in as</p>
          <p className="text-h3 font-medium text-ink">{user.name}</p>
        </div>
        <Button.Root variant="secondary" size="sm" onClick={handleSignOut} loading={signingOut}>
          Sign out
        </Button.Root>
      </div>

      {loadError && <Notice.Root tone="error">{loadError}</Notice.Root>}

      <div role="tablist" aria-label="Account sections" className="flex gap-2 border-b border-line">
        <button type="button" role="tab" id="account-tab-profile" aria-selected={tab === "profile"} aria-controls="account-panel-profile" onClick={() => setTab("profile")} className={tabClass(tab === "profile")}>
          Profile
        </button>
        <button type="button" role="tab" id="account-tab-orders" aria-selected={tab === "orders"} aria-controls="account-panel-orders" onClick={() => setTab("orders")} className={tabClass(tab === "orders")}>
          Orders
        </button>
      </div>

      <div id="account-panel-profile" role="tabpanel" aria-labelledby="account-tab-profile" hidden={tab !== "profile"}>
        {tab === "profile" && (
          <ProfilePanel key={customer?.id ?? "pending"} email={user.email} customer={customer} onSaved={setCustomer} />
        )}
      </div>
      <div id="account-panel-orders" role="tabpanel" aria-labelledby="account-tab-orders" hidden={tab !== "orders"}>
        {tab === "orders" && <OrdersPanel orders={orders} />}
      </div>
    </div>
  );
}

/**
 * `/account` client route's one island. Wrapped in `AppProviders` so it
 * shares `authClient`/`sessionStore` with every other island — signing out
 * here updates the header's `AccountLink` before the redirect to `/` fires.
 */
export function AccountPage() {
  return (
    <AppProviders>
      <AccountPageInner />
    </AppProviders>
  );
}

export default AccountPage;
