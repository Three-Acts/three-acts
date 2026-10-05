import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const ports = { github: "5380", api: "5375", web: "5341", cms: "5274" };

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./playwright-results",
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: `http://localhost:${ports.cms}`,
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "npx tsx apps/cms/tests/designer/github-stub-server.ts",
      cwd: root,
      url: `http://127.0.0.1:${ports.github}/repos/test/site/git/ref/heads/content`,
      timeout: 30_000,
      reuseExistingServer: false,
      env: { ...process.env, PORT: ports.github }
    },
    {
      command: "npm run dev -w @three-acts/api",
      cwd: root,
      url: `http://localhost:${ports.api}/api/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: ports.api,
        CMS_DATA_BACKEND: "memory",
        AUTH_SECRET: "designer-browser-e2e-secret",
        CMS_AUTH_MODE: "open",
        VERCEL_ENV: "preview",
        EDITOR_GITHUB_REPOSITORY: "test/site",
        EDITOR_GITHUB_BRANCH: "content",
        EDITOR_GITHUB_TOKEN: "browser-test-token",
        EDITOR_GITHUB_API_BASE: `http://127.0.0.1:${ports.github}`
      }
    },
    {
      command: "npm run build:web && npx tsx apps/cms/tests/designer/static-preview-server.ts",
      cwd: root,
      url: `http://localhost:${ports.web}`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_ORIGIN: `http://localhost:${ports.api}`,
        CONTENT_SOURCE: "mock",
        PORT: ports.web,
        PUBLIC_EDITOR_PREVIEW: "true",
        PUBLIC_EDITOR_ORIGIN: `http://localhost:${ports.cms}`
      }
    },
    {
      command: "npm run dev -w @three-acts/cms -- --port 5274 --strictPort",
      cwd: root,
      url: `http://localhost:${ports.cms}`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        API_ORIGIN: `http://localhost:${ports.api}`,
        VITE_API_URL: "",
        VITE_CMS_BACKEND: "rest",
        VITE_SITE_URL: `http://localhost:${ports.web}`
      }
    }
  ]
});
