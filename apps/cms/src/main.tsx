import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "@three-acts/auth/react";
import { App } from "./app";
import { CmsBackendProvider } from "./cms/backend-context";
import { resolveCmsBackend } from "./cms/resolve-backend";
import "./styles.css";

const { authClient, backend } = resolveCmsBackend();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AuthProvider client={authClient}>
      <CmsBackendProvider backend={backend}>
        <App />
      </CmsBackendProvider>
    </AuthProvider>
  </StrictMode>
);
