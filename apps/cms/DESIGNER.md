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

## Canvas workspace

The left panel opens to **Navigator**; switch to **Pages** to browse routes and templates. Navigator shows the current preview's visible element hierarchy, with icons and names for text, links, images, containers, components, and CMS bindings. Deep branches start collapsed. Search by label, tag, or category; expand/collapse individual branches or use the header's expand/collapse-all buttons. Canvas selection reveals its layer and scrolls it into view. Selection breadcrumbs beneath the canvas keep the current element and nearest parents visible; the overflow button opens the full parent chain. Canvas overlays distinguish elements (blue), components (green), and CMS fields (purple).

The canvas toolbar groups Design/Preview mode, responsive viewport sizes, and **Discard drafts**, separated by dividers. The top workspace toolbar contains **View site** and **Publish**. Publish opens a panel with the GitHub repository and branch, **Connection details**, **Reload from source**, **Review & push**, and the CMS site deployment action. Opening this panel does not publish anything. Connection details show the source, branch snapshot, last check, and registered file paths. Reload reads the latest branch content while preserving drafts and the current page; it does not create a pull request. Discard drafts confirms and restores all changed documents to the latest loaded source, matching the scope of Review & push. There is no instruction/status strip below the canvas.

Use **Design mode** to select elements. Double-click a registered plain-text leaf to edit directly: Enter or blur saves to its content draft, and Escape cancels the edit. The **Content** panel shows only the selected element's own saved text and attributes. It has no page-wide field list or search. Containers and structured text show metadata without flattening their descendants into an editor. Only existing, unambiguous content bindings can be changed; unbound attributes and CMS data remain read-only. Bound URLs commit on blur or Enter after validation, and Escape cancels. Shared navigation fields are selected on the canvas without changing the preview route; they no longer appear as a separate page. **Preview mode** hides the editing overlay and lets you interact with the page; return to Design mode to continue selecting.

The right panel opens to **Style**. Style/Content tabs align with Pages/Navigator at the top, followed by the selected element header and a compact selector showing its tag and existing classes. Class chips are read-only. Property groups use compact label/value rows, paired size controls, and a flat margin/padding diagram. Display shortcuts show for common layout values; a dropdown handles other display types. Flex/grid alignment controls appear when relevant. Enter CSS values with units, such as `24px`, `2rem`, or `100%`; changes apply on Enter or blur. These are **temporary preview styles**: they apply across the responsive preview widths for the current frame and are not breakpoint rules, content drafts, or GitHub changes. Reset restores the original inline styles; switching pages or reloading clears the experiment. Review & push includes registered content changes only.

This creates the selection and inspection foundation for future visual design. Adding/reordering elements and publishing styles will require an explicit layout/style document model, validation, and source rendering support. The current API still writes only registered content documents.

## Content source and drafts

Set `VITE_CMS_BACKEND=rest` to use authenticated API routes under `/api/editor/*` for the static-content workflow. The mock CMS uses bundled files in development and keeps GitHub disconnected; its local login requires no API. Production CMS builds require the authenticated REST source. The REST API explicitly reports bundled local data when disconnected in development or preview, and rejects missing GitHub configuration in production. Drafts stay in the browser, scoped to the editor account, repository, and branch. Drafts are not shared between devices. A stale draft retains its original GitHub file SHA and cannot overwrite newer content. Reloading from source preserves drafts; use Review to inspect or copy stale edits before discarding and reapplying against the new content.

When GitHub is configured, the API reads a consistent branch snapshot and restricts writes to registered JSON content paths. It checks changed files against their original blob SHAs, creates one Git tree and commit, then updates the branch with `force: false`. A concurrent update rejects the push, and branch protection remains enforced by GitHub. Untouched files are preserved. Existing `packages/static-content` schema, draft, and atomic GitHub commit semantics remain in effect.

## Connect GitHub

See [GITHUB.md](./GITHUB.md) for hosted setup and the current integration boundary. The existing connection is managed by a workspace administrator and shared by authorized editors. Per-user GitHub App installations and repository selection still require a separate authorization and workspace-isolation flow.

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

The Pages list includes templates for products, articles, authors, product categories, and article categories. The page dropdown in the canvas toolbar switches between static pages and CMS templates. For the current template, the **Items** tab lists its published previews; **Pages** returns to the page list. Search the dropdown to find a page or item, or hover its current-page row to reveal the details gear and open the floating details panel. The gear is also available on keyboard focus and touch devices. Home uses a house icon, other static pages use a blank page icon, and CMS pages and previews share colored collection icons with the Pages panel. Preview routes use published collection snapshots, so unpublished slug changes do not navigate to a page that does not yet exist. A collection with no published items can still have its template copy edited.

The template's settings icon opens its unbound copy in the floating details panel. Bound leaf copy can also be selected on the canvas and edited through the selection-only Content inspector. Edits apply to every generated page using that template and follow the same browser-draft and GitHub review workflow as static pages. Collection-bound titles, descriptions, images, prices, and article bodies remain managed in CMS; template edits do not change collection records or generated SEO metadata.

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
