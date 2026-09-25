import { useAuth } from "@three-acts/auth/react";
import { ToastProvider, TooltipProvider } from "./components/atoms";
import { CmsWorkspace } from "./screens/cms-workspace";
import { LoginScreen } from "./screens/login-screen";

export function App() {
  const { error, isLoading, signIn, signOut, status, user } = useAuth();

  return (
    <ToastProvider>
      <TooltipProvider>
        {status === "initializing" ? (
          <div className="grid min-h-screen place-items-center bg-cms-bg text-cms-muted" role="status">
            Loading…
          </div>
        ) : user ? (
          <CmsWorkspace onSignOut={signOut} user={user} />
        ) : (
          <LoginScreen error={error} isLoading={isLoading} onSignIn={signIn} />
        )}
      </TooltipProvider>
    </ToastProvider>
  );
}
