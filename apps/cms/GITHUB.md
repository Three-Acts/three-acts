# GitHub content source

The Designer has one GitHub integration today: a server-configured repository and token used by the API for every authenticated CMS editor. There is no GitHub sign-in, user-owned connection, OAuth flow, or GitHub App installation flow. The API reports this as `connectionMode: "server"`; credentials stay in the API environment and are never returned to the browser. A hosted CMS can use this mode for a single configured website/repository.

## Hosted setup

1. Deploy this application, including the `packages/static-content` content definitions, to the repository you want to edit. The target branch must already contain every registered JSON file at the paths defined by `contentPath`.
2. Create a fine-grained personal access token for that repository owner and select only the target repository. Grant **Contents: read and write**. The API reads the branch ref and JSON files, creates Git objects and commits, and advances the branch ref. GitHub documents the fine-grained token permission requirements for its [REST API endpoints](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens).
3. Set these variables as server-side secrets/configuration for the API deployment:

   ```dotenv
   EDITOR_GITHUB_REPOSITORY=your-org/your-site
   EDITOR_GITHUB_BRANCH=content
   EDITOR_GITHUB_TOKEN=<fine-grained-token>
   ```

   Do not use a `VITE_` prefix or otherwise expose the token to the CMS bundle. `EDITOR_GITHUB_API_BASE` is an optional server-side override for GitHub Enterprise or a compatible API.

4. Build the CMS with the authenticated REST backend using `VITE_CMS_BACKEND=rest`. Production CMS bundles reject the mock content source. If it is hosted separately from the API, set `VITE_API_URL` to the API origin and configure the API's permitted CMS origin. Configure the API's production CMS authentication (`AUTH_SECRET`, `CMS_AUTH_MODE=env`, and `CMS_EDITORS`) independently; GitHub configuration does not authenticate CMS users. Set `VITE_SITE_URL` to the site's preview origin, and enable `PUBLIC_EDITOR_PREVIEW=true` with the exact `PUBLIC_EDITOR_ORIGIN` on that site as described in [DESIGNER.md](./DESIGNER.md).
5. Deploy and verify that the Designer workspace reports source `github`, the expected repository and branch, and a `headSha`. The API returns each document's `sourcePath` so its provenance is visible to clients.

Production API requests fail with `503 github_unconfigured` if all three GitHub settings are absent. Partially configured or invalid settings also fail closed. Outside production, no GitHub settings selects the bundled local documents and reports `source: "local"`, `headSha: null`, and `connectionMode: "none"`; pushing still fails until GitHub is configured. This mode is useful for development and preview deployments and must not be treated as a hosted repository connection.

## Write behavior

The API reads all registered documents from one branch commit and returns that commit SHA as `headSha`. A push validates each document against the registered schema, checks each original file SHA against the current branch, creates a Git tree and commit, then updates the branch with `force: false`. A stale document or a branch update rejected by a concurrent change returns a conflict. GitHub branch protection continues to apply, so configure any required checks or reviews on the content branch before enabling writes.

The configured token is shared by all CMS users and gives the API one repository identity. Editors with CMS access can push to the configured branch; this integration does not select repositories per account or isolate GitHub permissions by editor.

## Per-user GitHub connections

Supporting each client or editor's own GitHub account requires a future GitHub App installation flow: app registration, authorization/callback handling, installation selection, secure installation-token creation and storage, repository ownership checks, and runtime token resolution for each workspace. Those pieces do not exist in this codebase. Do not represent the server-configured token as a per-user GitHub connection.
