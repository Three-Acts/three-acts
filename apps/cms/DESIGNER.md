# CMS Designer

Designer is the first CMS workspace tab and opens by default. It brings the static-page content canvas into the existing CMS and uses the same CMS login, UI atoms, and theme. Use the settings icon beside a page to open its existing SEO fields and settings in a floating panel next to the Pages list. The canvas and Content inspector stay in place; closing or switching a page with unsaved details requires confirmation. The canvas supports responsive preview, click-to-select copy, local drafts, and review before sending content to GitHub. It supports registered content, Tailwind utilities, component properties, and named component-part styling. Layout, routes, and component structure remain developer-owned.

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

The left panel opens to **Navigator**; switch to **Pages** to browse routes and templates. Navigator shows the current preview's element hierarchy, including hidden content, with icons and names for text, links, images, containers, components, and CMS bindings. Hidden layers have a small crossed-eye icon; temporarily revealed layers have an eye icon. The inspector explains their visibility. Selecting a closed native menu or accordion's content temporarily opens its disclosures, preserving any previously open item in a named accordion. Selecting elsewhere, clearing selection, or entering Preview restores the interaction state. CMS source editing retains the temporary reveal while returning to the same canvas context. These states never enter source drafts or undo history. CSS/viewport-hidden layers can be inspected without forcing their layout; use the responsive widths or source Tailwind controls to make them visible.

Deep branches start collapsed. CMS layer labels include their own record title, so you can search for a product, author, or FAQ question. Search loaded layers by label, tag, or category; expand/collapse individual branches or use the header's expand/collapse-all buttons. The outline starts with 400 layers and shows its completeness when more exist. **Load more elements** adds another page, up to a bounded outline limit of 5,000. A direct canvas selection pins its ancestry even outside that limit. The preview tracks real DOM identities across insertion/reordering and clears removed selections. Canvas selection reveals its layer and scrolls visible content into view. Selection breadcrumbs beneath the canvas keep the current element and nearest parents visible; the overflow button opens the full parent chain. Canvas overlays distinguish elements (blue), components (green), and CMS fields (purple).

The canvas toolbar groups Design/Preview mode, responsive viewport sizes, and **Discard drafts**, separated by dividers. Undo and Redo are separate compact icons with a bounded history across pages, content, Tailwind utilities, component properties, resets, and CSS. Consecutive typing in one field groups into an edit; blur, another field, or page selection ends that group. Command/Ctrl+Z and Shift+Command/Ctrl+Z (or Ctrl+Y) work in the editor and focused canvas. Inputs keep native text undo. Source reload, successful push, and Discard drafts start a fresh history; failed writes preserve it. Recovered browser drafts start without an old undo stack. The top workspace toolbar contains **View site** and **Publish**. Publish opens a panel with the GitHub repository and branch, **Connection details**, **Reload from source**, **Review & push**, and the CMS site deployment action. Opening this panel does not publish anything. Connection details show the source, branch snapshot, last check, and registered file paths. Reload reads the latest branch content while preserving drafts and the current page; it does not create a pull request. Discard drafts confirms and restores all changed documents to the latest loaded source, matching the scope of Review & push. There is no instruction/status strip below the canvas.

The canvas toolbar shows **Saved in this browser · Awaiting push**, **Committed to GitHub**, or **Source loaded**, separately from hosting deployment. Storage failures show **Not saved in this browser** and keep edits in memory; keep the tab open until you push. The Content inspector labels page, shared-site, and template scope, and an editable leaf selection opens Content automatically. Components keep their Properties inspector, while explicit tab choices remain available.

The canvas starts in **Fit** zoom, showing the selected page width within the workspace. Presets use the iframe's true width: Desktop 1280px, Tablet 1024px, Landscape 768px, and Mobile 390px. Enter a whole width from 320 to 3840px, or drag the grip on the right edge. Focus the grip to resize with arrow keys (10px, or 50px with Shift); Escape cancels a drag. Invalid input keeps the last valid width; Escape restores the field. Resizing from Fit holds its current visual scale during the drag. The zoom dropdown also offers manual percentages, with horizontal scrolling when needed. Zoom keeps the page width and width-based Tailwind breakpoints unchanged; changing width selects the corresponding Style breakpoint. Width and zoom stay in place through page/template changes and CMS source editing, and never enter drafts, Undo, or Review & push. Narrow canvas toolbars wrap onto two compact rows.

Use **Design mode** to select elements. Double-click a registered plain-text leaf to edit directly: Enter or blur saves to its content draft, and Escape cancels the edit. The **Content** panel shows only the selected element's own saved text and attributes. It has no page-wide field list or search. Containers and structured text show metadata without flattening their descendants into an editor. Only existing, unambiguous content bindings can be changed; unbound attributes and CMS data remain read-only. Bound URLs commit on blur or Enter after validation, and Escape cancels. Shared navigation fields are selected on the canvas without changing the preview route; they no longer appear as a separate page. **Preview mode** hides the editing overlay and lets you interact with the page; return to Design mode to continue selecting.

The right panel shows **Properties** when a component is selected. Button links/buttons expose their shared `variant` and `size` definitions; grids expose `cols`. Registered copy and links remain connected to their existing content documents. Changed field labels turn blue. Use the small reset icon at the right of a label, or Alt-click that label, to restore only that field to its source value. A source instance in a CMS template configures that instance on every generated page. Components without exposed variants or bindings explain that state instead of showing style controls.

Use the tooltip edit icon beside the component name, or double-click its boundary, to enter shared editing. The inspector labels this scope **Changes apply to all instances**. Select the component root or a named part (button Label/Icon) to style every instance of that component type. Selecting a different component leaves the current scope. The close icon in the shared editing header returns to instance properties. Direct editing of registered plain-text leaves still works. Nested content cannot receive an independent style override outside main-component editing.

For a registered element, **Style** has two tabs:

- **Tailwind** selects complete utility classes from a project catalogue. Changing a utility merges it with the authored class list through the existing Tailwind conflict resolver: `pb-8` becomes `pb-12`, while unrelated classes remain. Use **source / inherit** to remove an override. Base styles are mobile-first; Landscape (768px), Tablet (1024px), and Desktop (1280px) use the actual public-site prefixes. Public-site `portrait` and `landscape` variants resolve from the project's width tokens, overriding Tailwind's built-in orientation meanings.
- **Custom CSS** defines a reusable class selector and CSS declarations. Save and apply attaches that class to the selected element or shared component part. Rules support `:hover`, `:focus`, `:focus-visible`, and `:active`. Declarations are validated; imports, remote resources, and unsupported syntax are rejected. Removing an attached class leaves the reusable rule available for other elements.

These edits are source-backed browser drafts. They persist across page changes and reloads, participate in Discard drafts and Review & push, and render in the public build. `packages/static-content/src/documents/design.json` stores element utilities/custom classes, instance properties, shared component parts, and custom CSS. It uses the same original file SHA checks and atomic GitHub commit as content documents; it is not a navigable page in the picker. Review includes added and removed design fields. Deployed editor repositories must contain this registered file before the updated editor connects.

The public component implementations and inspector share `packages/design` definitions. Button/Grid variants are declared once; other registered primitives include Section.Root/Container, Typography, and the home Hero. Adding another component requires its property schema, renderer integration, and stable named parts. Expose serializable, editable props explicitly; CMS bindings and unregistered component properties remain read-only. Stable element/instance IDs are authored in markup and should be preserved when source files are refactored. The preview reads original class/prop metadata so resetting a draft can restore the source even when the site was built with a saved design.

Utility choices live in `packages/design/src/utilities.json`. After changing them, run `npm run generate:utilities -w @three-acts/design` to update the complete candidate list explicitly scanned by Tailwind. This makes newly selected classes available in an already-built preview. The preview source is modular under `apps/web/src/scripts/editor-preview.js`; web dev/build generates the optional public bridge. Restart web dev after changing the bridge source. Normal public builds omit its script tag unless editor preview is enabled.

Adding/reordering sections still requires a validated layout model and source rendering support; the design document does not mutate arbitrary source code or component structure.

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

The Pages list includes templates for products, articles, authors, product categories, and article categories. The page dropdown in the canvas toolbar switches between static pages and CMS templates. For the current template, the **Items** tab lists its published previews; **Pages** returns to the page list. Search the dropdown to find a page or item, or hover its current-page row to reveal the details gear and open the floating details panel. The gear is also available on keyboard focus and touch devices. Home uses a house icon, other static pages use a blank page icon, and CMS pages and previews use one database icon throughout the Pages panel and picker. The icon and label are blue while browser content or page details have unsaved changes, orange for saved draft, queued, or unpublished CMS records, and white for published records. Unchanged CMS templates keep purple icons and labels in the left Pages panel. Browser changes take priority over the saved publication state; discarding them restores that state’s color. Preview routes use published collection snapshots, so unpublished slug changes do not navigate to a page that does not yet exist. A collection with no published items can still have its template copy edited.

The template's settings icon opens its unbound copy in the floating details panel. Bound leaf copy can also be selected on the canvas and edited through the selection-only Content inspector. Edits apply to every generated page using that template and follow the same browser-draft and GitHub review workflow as static pages. Collection-bound titles, descriptions, images, prices, and article bodies remain managed in CMS; template edits do not change collection records or generated SEO metadata.

Selecting CMS content shows its collection, item, and registered field in the inspector. The small **Edit CMS item** icon opens that exact record in the existing authenticated record editor and focuses the field, including the root field for nested assets. Related products/articles, categories, authors, FAQs, and testimonials carry their own record identities. The Designer stays mounted while the record is edited; **Back to canvas** restores the page, preview, selection, scroll, browser drafts, and history. Unsaved record or page-detail edits use the existing discard confirmation. Failed record loads offer Retry and a return to the canvas.

Saving the CMS record does not publish the page. The canvas still renders its published/static snapshot; authenticated draft previews are a separate integration. Missing or unregistered source identity never falls back to the current preview item.

## Extend the editing contract

Add or remove static fields in the JSON documents and wire them into the Astro/React view. Content editors can change registered content/design values; layout, source code, routes, and collection records are not writable through the Designer API. Use `data-static-field="document.path.to.field"` on text elements for precise canvas selection. The preview bridge also binds matching titles, navigation, and structured copy. Designer reuses CMS components and theme directly; there is no separate editor UI package.

CMS template definitions include a `collectionId` and a route such as `/shop/[slug]`. Use `cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "title")` from `@three-acts/cms-schema` on collection-bound elements. It emits the canonical collection, exact record identity, label, and field binding, keeping CMS content separate from static copy. A card/container can omit the field; annotate individual fields separately. A legacy `data-cms-bound` without record identity remains read-only and cannot open a source record.

## Tests

Run the Designer browser tests with:

```sh
npm run test:e2e:designer
```

This uses `apps/cms/tests/designer/playwright.config.ts`. The API's GitHub transport fixture tests use an isolated local HTTP fixture, never a real repository:

```sh
npx tsx --test apps/cms/tests/designer/editor-api.integration.test.ts
```
