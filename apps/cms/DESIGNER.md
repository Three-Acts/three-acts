# CMS Designer

Designer is the first CMS workspace tab and opens by default. It brings the static-page content canvas into the existing CMS and uses the same CMS login, UI atoms, and theme. Use the settings icon beside a page to open its existing SEO fields and settings in a floating panel next to the Pages list. The canvas and Content inspector stay in place; closing or switching a page with unsaved details requires confirmation. The canvas supports responsive preview, click-to-select copy, local drafts, and review before sending content to GitHub. It is a content-editing foundation: page layout, sections, routes, and source code remain developer-owned.

## Run locally

From the repository root:

```sh
npm install
npm run dev
```

Open http://localhost:5174 and sign in with a CMS editor account. `npm run dev` starts the CMS on port 5174, public Astro site on 4321, and API on 5175. To start only the CMS, run `npm run dev:cms`; the API must also be available for authenticated REST requests. Local development uses the existing open CMS auth mode. Deployed environments use the configured CMS editor credentials and `AUTH_SECRET`.

Build the CMS with:

```sh
npm run build:cms
```

The CMS needs `VITE_SITE_URL` set to the public website origin for Designer previews. The public website uses the content and preview bridge from `packages/static-content`; the package's document schema and draft behavior are unchanged.

## Content source and drafts

Set `VITE_CMS_BACKEND=rest` to use authenticated API routes under `/api/editor/*` for the static-content workflow. The default mock CMS uses bundled files locally and keeps GitHub disconnected; its local login requires no API. The REST API also serves bundled files when GitHub is disconnected. Drafts stay in the browser, scoped to the editor account, repository, and branch. Drafts are not shared between devices. A stale draft retains its original GitHub file SHA and cannot overwrite newer content. Reloading from source preserves drafts; discard an affected page draft and reapply the intended edits against the new content.

When GitHub is configured, the API reads a consistent branch snapshot and restricts writes to registered JSON content paths. It checks changed files against their original blob SHAs, creates one Git tree and commit, then updates the branch with `force: false`. A concurrent update rejects the push, and branch protection remains enforced by GitHub. Untouched files are preserved. Existing `packages/static-content` schema, draft, and atomic GitHub commit semantics remain in effect.

## Connect GitHub

Set these **server-only variables in apps/api**:

```dotenv
EDITOR_GITHUB_REPOSITORY=your-org/your-site
EDITOR_GITHUB_BRANCH=content
EDITOR_GITHUB_TOKEN=your-fine-grained-token
```

Use an existing branch. The token needs repository Contents read/write access. Never expose it through a `VITE_` variable. Push the app and `packages/static-content` implementation to the target repository before connecting; those files must already exist on the target branch. `EDITOR_GITHUB_API_BASE` is an optional server-side override for GitHub-compatible API fixtures or proxies.

A content commit can trigger the target repository's normal hosting deployment. The CMS Publish flow remains available for collection content and its configured site deploy flow.

## Preview on a deployed site

Set `VITE_SITE_URL` in the CMS to the public-site origin. On the public web app, set:

```dotenv
PUBLIC_EDITOR_PREVIEW=true
PUBLIC_EDITOR_ORIGIN=https://your-cms.example.com
```

`PUBLIC_EDITOR_ORIGIN` must be the exact CMS origin with no trailing slash. It defaults to `http://localhost:5174` during web development. The preview bridge accepts messages only from that origin and only from the parent window; it activates in an iframe after the authenticated CMS sends content. Normal static builds leave the bridge disabled unless `PUBLIC_EDITOR_PREVIEW=true`. Ensure the public site's hosting headers allow it to be framed by the CMS.

Content changes preview immediately. Other CMS data on the page stays sourced through the existing collection loaders. Static content lives in `packages/static-content/src/documents`, and source views import those files directly. Existing CMS page SEO overrides continue to apply. Placeholders `{{site.name}}` and `{{site.email}}` in legal/support copy resolve from shared brand content.

## CMS pages

The Pages list includes templates for products, articles, authors, product categories, and article categories. The page dropdown in the canvas toolbar switches between static pages and CMS templates. For the current template, **View items in this collection** opens its published items for preview; **Back to pages** returns to the page list. Search the dropdown to find a page or item, or use its current-page settings icon to open the floating details panel. Preview routes use published collection snapshots, so unpublished slug changes do not navigate to a page that does not yet exist. A collection with no published items can still have its template copy edited.

The template's settings icon opens its unbound copy in the floating details panel. These fields also appear in the Content inspector and can be selected on the canvas. Edits apply to every generated page using that template and follow the same browser-draft and GitHub review workflow as static pages. Collection-bound titles, descriptions, images, prices, and article bodies remain managed in CMS; template edits do not change collection records or generated SEO metadata.

## Extend the editing contract

Add or remove static fields in the JSON documents and wire them into the Astro/React view. Content editors can change registered values; layout, source code, routes, and collection records are not writable through the Designer API. Use `data-static-field="document.path.to.field"` on text elements for precise canvas selection. The preview bridge also binds matching titles, navigation, and structured copy. Designer reuses CMS components and theme directly; there is no separate editor UI package.

CMS template definitions include a `collectionId` and a route such as `/shop/[slug]`. Mark collection-bound elements with `data-cms-bound="products.title"` (or the corresponding collection field) so automatic preview matching cannot bind their text or attributes to editable copy.

## Tests

Run the Designer browser tests with:

```sh
npm run test:e2e:designer
```

This uses `apps/cms/tests/designer/playwright.config.ts`. The API's GitHub transport fixture tests use an isolated local HTTP fixture, never a real repository:

```sh
npx tsx --test apps/cms/tests/designer/editor-api.integration.test.ts
```
