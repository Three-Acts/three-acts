# CMS Designer

Designer is the first CMS workspace tab and opens by default. It brings the static-page content canvas into the existing CMS and uses the same CMS login, UI atoms, and theme. Use the settings icon beside a page to open its existing SEO fields and settings in a floating panel next to the Pages list. The canvas and Content inspector stay in place; closing or switching a page with unsaved details requires confirmation. The canvas supports responsive preview, click-to-select copy, local drafts, and review before sending content to GitHub. It supports registered content, Tailwind utilities, component properties, and named component-part styling. Editors can add basic elements and registered components through Navigator. Routes and component definitions remain developer-owned.

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

The CMS needs `VITE_SITE_URL` set to the public website origin for Designer previews. The public website uses the content and preview bridge from `packages/static-content`; existing content documents and draft flows remain compatible.

## Canvas workspace

The left panel opens to **Navigator**; switch to **Pages** to browse routes and templates. Navigator shows the current preview's element hierarchy, including hidden content, with icons and names for text, links, images, containers, components, and CMS bindings. Hidden layers have a small crossed-eye icon; temporarily revealed layers have an eye icon. The inspector explains their visibility. Selecting a closed native menu or accordion's content temporarily opens its disclosures, preserving any previously open item in a named accordion. Selecting elsewhere, clearing selection, or entering Preview restores the interaction state. CMS source editing retains the temporary reveal while returning to the same canvas context. These states never enter source drafts or undo history. CSS/viewport-hidden layers can be inspected without forcing their layout; use the responsive widths or source Tailwind controls to make them visible.

Deep branches start collapsed. CMS layer labels include their own record title, so you can search for a product, author, or FAQ question. Search loaded layers by label, tag, or category; expand/collapse individual branches or use the header's expand/collapse-all buttons. The outline starts with 400 layers and shows its completeness when more exist. **Load more elements** adds another page, up to a bounded outline limit of 5,000. A direct canvas selection pins its ancestry even outside that limit. The preview tracks real DOM identities across insertion/reordering and clears removed selections. Canvas selection reveals its layer and scrolls visible content into view. Selection breadcrumbs beneath the canvas keep the current element and nearest parents visible; the overflow button opens the full parent chain. Canvas overlays distinguish elements (blue), components (green), and CMS fields (purple).

The canvas toolbar groups Design/Preview mode, responsive viewport sizes, and **Discard drafts**, separated by dividers. Undo and Redo are separate compact icons with a bounded history across pages, content, Tailwind utilities, component properties, resets, and CSS. Consecutive typing in one field groups into an edit; blur, another field, or page selection ends that group. Command/Ctrl+Z and Shift+Command/Ctrl+Z (or Ctrl+Y) work in the editor and focused canvas. Inputs keep native text undo. Source reload, successful push, and Discard drafts start a fresh history; failed writes preserve it. Recovered browser drafts start without an old undo stack. The top workspace toolbar contains **View site** and **Publish**. Publish opens a panel with the GitHub repository and branch, **Connection details**, **Reload from source**, **Review & push**, and the CMS site deployment action. Opening this panel does not publish anything. Connection details show the source, branch snapshot, last check, and registered file paths. Reload reads the latest branch content while preserving drafts and the current page; it does not create a pull request. Discard drafts confirms and restores all changed documents to the latest loaded source, matching the scope of Review & push. There is no instruction/status strip below the canvas.

The canvas toolbar shows **Saved in this browser · Awaiting push**, **Committed to GitHub**, or **Source loaded**, separately from hosting deployment. Storage failures show **Not saved in this browser** and keep edits in memory; keep the tab open until you push. The Content inspector labels page, shared-site, and template scope, and choosing Content or Style remains in place across ordinary selections. Components keep their Properties inspector, while explicit tab choices remain available.

The canvas starts in **Fit** zoom, showing the selected page width within the workspace. Presets use the iframe's true width: Desktop 1280px, Tablet 1024px, Landscape 768px, and Mobile 390px. Enter a whole width from 320 to 3840px, or drag the grip on the right edge. Focus the grip to resize with arrow keys (10px, or 50px with Shift); Escape cancels a drag. Invalid input keeps the last valid width; Escape restores the field. Resizing from Fit holds its current visual scale during the drag. The grip resizes from the center continuously, including while dragging. The zoom dropdown offers 25–200% manual zoom, with horizontal scrolling when needed. Zoom keeps the logical iframe height fixed as well as the page width and width-based Tailwind breakpoints unchanged; changing width selects the corresponding Style breakpoint. Width and zoom stay in place through page/template changes and CMS source editing, and never enter drafts, Undo, or Review & push. Narrow canvas toolbars wrap onto two compact rows.

Use **Design mode** to select elements. Double-click a registered plain-text leaf to edit directly: Enter or blur saves to its content draft, and Escape cancels the edit. The **Content** panel shows only the selected element's own saved text and attributes. It has no page-wide field list or search. Containers and structured text show metadata without flattening their descendants into an editor. Only existing, unambiguous content bindings can be changed; unbound attributes and CMS data remain read-only. Bound URLs commit on blur or Enter after validation, and Escape cancels. Shared navigation fields are selected on the canvas without changing the preview route; they no longer appear as a separate page. **Preview mode** hides the editing overlay and lets you interact with the page; return to Design mode to continue selecting.

An explicit formatted-body binding (`data-static-format="prose"` plus `data-static-field`) opens **Body source** in Content. Edit the original source text: blank lines separate paragraphs, `## ` starts a heading, `- ` starts a list item, and web/shop/blog URLs become links. Soft lines keep line breaks; HTML stays literal. The public renderer and preview share this parser. These containers never enter inline contenteditable; unmarked mixed markup stays metadata-only. CMS article bodies, product descriptions and FAQ answers declare `format: "prose"` in the registry and show the same format guidance in their source controls.

Selecting a registered static image exposes **src** and **alt** in Content. Empty alt marks a decorative image. Media sources accept site paths or HTTP(S) URLs, and changes update optimized picture sources too. An explicit `data-static-media="document.object.path"` marker binds both members of an existing `{ src, alt }` object, even when alt is empty. Every use of that field updates together; changes follow normal drafts/history/review/push. Home's product-derived hero and intro images instead carry their actual product/gallery identity, opening existing CMS gallery replacement and alt controls through the source icon. Unbound images remain read-only.

The right panel shows **Properties** when a component is selected. Button links/buttons expose their shared `variant` and `size` definitions; grids expose `cols`. Registered copy and links remain connected to their existing content documents. Changed field labels turn blue. Use the small reset icon at the right of a label, or Alt-click that label, to restore only that field to its source value. A source instance in a CMS template configures that instance on every generated page. Components without exposed variants or bindings explain that state instead of showing style controls.

Use the tooltip edit icon beside the component name, or double-click its boundary, to enter shared editing. The inspector labels this scope **Changes apply to all instances**. Select the component root or a named part (button Label/Icon) to style every instance of that component type. Selecting a different component leaves the current scope. The close icon in the shared editing header returns to instance properties. Direct editing of registered plain-text leaves still works. Ordinary nested source elements expose their authored classes directly; they do not require a separately registered design source. Styles follow their source identity, so reused template or component source elements update wherever they are rendered.

**Style** is one panel, and explicitly choosing Style or Content is remembered across ordinary selections, page changes and reloads. Component selections continue to show Properties.

The panel groups Layout, Spacing, Size, Position, Typography, Backgrounds, Borders, Effects and Custom properties. Display, alignment and similar choices use compact buttons. Spacing uses a margin/padding box diagram; the link icon applies a value to all four sides. Sections remember whether they are expanded. Enter or blur commits a value; Escape cancels it. Numeric spacing and size values mean pixels: bottom padding `24` becomes `pb-6`, while `25px` becomes `pb-[25px]`. CSS units, variables and calculations are accepted directly; `calc(3rem + 2px)` becomes `pb-[calc(3rem_+_2px)]`. Changed values turn blue; Alt-click restores the loaded source value. The real Tailwind compiler supplies preview CSS. All sizes is mobile-first; Landscape (768px), Tablet (1024px) and Desktop (1280px) use the project width prefixes.

Advanced custom properties become Tailwind arbitrary-property classes on the same element, rather than a separate CSS override view. Existing legacy reusable rules still render; new controls author classes directly.

Media management lives in **Resources**, separately from CMS collections and Site settings. Images are ordinary design elements in the Navigator. Their content provenance remains available: a product-derived image opens its actual product/gallery source controls, while a static image edits its bound source and alt fields.

Source-backed style drafts contain the actual changed Astro/TSX/JSX file plus bounded class-edit operations. Review shows a source code diff, and Review & push commits those files with content changes in one atomic Git commit. The API checks the exact source blob SHA shown in the canvas, recomputes every class change with the AST patcher and rejects arbitrary code changes. Rebuild the website before editing a source file again after its commit; stale canvas metadata cannot edit a newer source file.

Literal classes are updated in place. Dynamic expressions retain their behavior through the ordinary `cn`/`clsx` utility; conditional source classes preserve independent composed section instances. The first edit preserves all inferred IDs in the file as explicit attributes so source changes do not break inserted elements or selections. Duplicating a section copies its committed and pending source styles within the same history operation. Component instances continue to show Properties; entering a main component edits that component's source root or part.

`packages/static-content/src/documents/design.json` continues to store component instance properties, composition additions and legacy styles/rules. New source-backed styles are not stored there; their matching legacy style entries migrate into the source commit. Inserted nodes still use the existing validated composition document. Use `npm run dev:editor` for authenticated local source editing; its read-only local source resolver produces reviewable drafts without configuring GitHub or deploying anything. GitHub configuration enables committing the reviewed source files.

The public component implementations and inspector share `packages/design` definitions. Button/Grid variants are declared once; other registered primitives include Section.Root/Container, Typography, and the home Hero. Adding another component requires its property schema, renderer integration, and stable named parts. Expose serializable, editable props explicitly; CMS bindings and unregistered component properties remain read-only. Astro/JSX compilation infers element identities and authored classes from the actual source. Existing explicit element/instance IDs are preserved and should be preserved when source files are refactored. The preview reads original class/prop metadata so resetting a draft can restore the source even when the site was built with a saved design.

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

Content changes preview immediately. Published previews use the existing collection loaders; saved CMS draft previews use the authenticated parent's current values and the same domain mappers and canonical page components. Static content lives in `packages/static-content/src/documents`, and source views import those files directly. Existing CMS page SEO overrides continue to apply. Placeholders `{{site.name}}` and `{{site.email}}` in legal/support copy resolve from shared brand content.

## CMS pages

The Pages list includes templates for products, articles, authors, product categories, and article categories. The page dropdown in the canvas toolbar switches between static pages and CMS templates. For the current template, the **Items** tab lists its saved and published records; **Pages** returns to the page list. Search the dropdown to find a page or item, or hover its current-page row to reveal the details gear and open the floating details panel. The gear is also available on keyboard focus and touch devices. Home uses a house icon, other static pages use a blank page icon, and CMS pages and previews use one database icon throughout the Pages panel and picker. The icon and label are blue while browser content or page details have unsaved changes, orange for saved draft, queued, or unpublished CMS records, and white for published records. Unchanged CMS templates keep purple icons and labels in the left Pages panel. Browser changes take priority over the saved publication state; discarding them restores that state’s color. Published previews use published collection snapshots; saved drafts render in the private canvas even before their slug has a public route. A collection with no items can still have its template copy edited.

The template's settings icon opens its unbound copy in the floating details panel. Bound leaf copy can also be selected on the canvas and edited through the selection-only Content inspector. Edits apply to every generated page using that template and follow the same browser-draft and GitHub review workflow as static pages. Collection-bound titles, descriptions, images, prices, and article bodies remain managed in CMS; template edits do not change collection records or generated SEO metadata.

Selecting CMS content shows its collection, item, and registered field in the inspector. The small **Edit CMS item** icon opens that exact record in the existing authenticated record editor and focuses the field, including the root field for nested assets. Related products/articles, categories, authors, FAQs, and testimonials carry their own record identities. The Designer stays mounted while the record is edited; **Back to canvas** restores the page, preview, selection, scroll, browser drafts, and history. Unsaved record or page-detail edits use the existing discard confirmation. Failed record loads offer Retry and a return to the canvas.

Saving the CMS record does not publish the page. Use **CMS snapshot** inside the page picker to choose **Published** or **Saved CMS draft**. The item list includes unpublished records; these open a saved draft automatically. Saved snapshots refresh after returning from a source edit, including text, media/alt and formatted bodies. Browser template/design drafts appear in both snapshots. **View site** uses the actual published slug and is unavailable when the record has no public route. Missing or unregistered source identity never falls back to the current preview item.

The opt-in `/editor-preview/cms/` shell contains no draft values; normal builds omit it. Only the configured CMS parent may send an ephemeral, session-correlated snapshot of allowlisted public-model fields. The site receives no CMS credentials and never fetches authenticated CMS records. Incomplete records use render-only placeholders, purchase controls are disabled, and missing records or excessive snapshots show an error with Retry. The snapshot limit is 5,000 related records, 8 MiB and 200,000 characters per field. Supported private templates are products, articles, authors, product categories and article categories; static pages retain their published CMS data.

## Extend the editing contract

The toolbar's **Publish → Review & publish** captures browser content, styles and composition together with the complete queued CMS record list. Save or discard open record/page/site settings forms first. The review displays source diffs and the exact saved record identities; newly queued records remain outside that release. **Review & push** remains available for a source-only commit.

Publication checks configuration before writing, creates one source commit with a release receipt, promotes only the reviewed CMS versions, and requests a build of that exact revision. A changed branch or CMS record pauses the release without promoting newer values. Source retries recover the original commit after a lost response; failed builds retry the committed revision. Progress survives reload in storage scoped to the editor, repository and branch. Starting another release preserves the prior receipt as downloadable recovery. Browser drafts take priority over committed/deploying/live labels, and status checks preserve subsequent draft history.

**Live revision verified** requires the production origin's revision marker to match the commit and publication identity. A completed provider build alone cannot establish live status. Local testing needs no Vercel configuration: bundled source and browser edits still work, and publication stays unavailable until a source connection and deployment target are configured. The browser test suite simulates the provider entirely through local fixtures; it never creates a hosted deployment.

Home supports approved section composition through the Navigator's **Add element** menu and the selected section's compact **Section actions** menu. Insert Hero, Stats, Shop by category, Featured products, Intro, Journal, Testimonials, FAQ teaser or CTA sections; duplicate, hide/show and reorder them. Drag a root section onto another root section, or focus it in Navigator and use Alt+↑/↓. Hidden sections remain listed and editable; Preview and normal builds respect their hidden state.

Original sections retain their Home source bindings. Inserted and duplicated sections own independent validated copy in `packages/static-content/src/documents/layout.json`, and copied element utilities/component variants get distinct identities. Shared main-component styling and reusable CSS classes remain shared. The properties inspector reads each section's actual source, including fields in a section whose CMS data is currently empty. Changed fields use blue labels, small reset icons and Alt-click reset, with the main-component edit icon at the top.

Layout edits participate in browser drafts, Undo/Redo, recovery, review, SHA conflict checks and atomic GitHub writes alongside design/content changes. The layout contract is version 1, allows only Home's approved root sections, and is limited to 60 instances and 512 KiB. Unknown types, nested layouts, mismatched identities, invalid copy/URLs and unsupported versions fail validation. Basic nested additions use the design document and do not change this Home section contract. Preview builds hydrate the canonical Home renderer before applying source overlays; normal builds render the same saved layout through SSR. A source push still does not establish deployment.

Navigator's **Add element** menu is available on every page. Select a container to add inside it, or a leaf to add after it. It offers Div, Section, headings, Paragraph, Text, Link, Image and list elements, plus registered Button, Grid, Section and Typography components. Added elements have editable text and supported attributes; component instances retain their property controls. The compact **Element actions** menu moves, duplicates or removes added elements. Nested duplication preserves independent identities, and removal cleans up descendant design entries.

Additions share draft/history/recovery/review/source commit handling with styling and render through the actual React/Astro source in normal builds. Their schema permits at most 100 distinct additions and 12 levels of nesting, rejects cycles and executable/unsafe attributes, and shares the 100,000-character design document limit. Changes follow source scope, including shared footers and repeated templates.

To verify the ordinary-element authoring snapshot through a normal desktop/mobile build:

```sh
npm run test:e2e:designer -- --grep 'direct source styling'
npx tsx apps/cms/tests/designer/verify-direct-authoring-build.ts
```

To verify a browser-pushed composition snapshot through a normal build:

```sh
npm run test:e2e:designer -- --grep 'approved sections duplicate'
npx tsx --tsconfig tsconfig.base.json apps/cms/tests/designer/verify-composition-build.ts
```

The verifier temporarily rebuilds the exact source snapshot recorded by that isolated GitHub fixture, checks desktop/mobile order, copy, visibility and responsive instance styles without the editor renderer, then restores the original source files. Rebuild normally afterward to restore output for the current checkout.

Add or remove static fields in the JSON documents and wire them into the Astro/React view. Content editors can change bound content, source-backed design values, added elements and approved layouts; only validated class edits at selected Astro/JSX source locations are writable through the Designer source API; arbitrary code, routes and collection records cannot be edited through that API. Use `data-static-field="document.path.to.field"` on text elements for precise canvas selection. The preview bridge also binds matching titles, navigation, and structured copy. Designer reuses CMS components and theme directly; there is no separate editor UI package.

CMS template definitions include a `collectionId` and a route such as `/shop/[slug]`. Use `cmsAttributes({ collectionId: "products", recordId: product.id, label: product.title }, "title")` from `@three-acts/cms-schema` on collection-bound elements. It emits the canonical collection, exact record identity, label, and field binding, keeping CMS content separate from static copy. A card/container can omit the field; annotate individual fields separately. A legacy `data-cms-bound` without record identity remains read-only and cannot open a source record.

## Tests

For the complete local editor without configuring GitHub or Vercel, run `npm run dev:editor` from the repository root. It builds the opt-in canvas and starts CMS at `http://localhost:5184`, canvas at `http://localhost:5183`, and a file-backed API at `http://localhost:5185`. Sign in with any email and non-empty password. Browser drafts and CMS records persist locally; source pushing and deployment are disabled in this mode. Stop it with Ctrl+C. Re-run after changing canonical website source files. Optional `LOCAL_EDITOR_CMS_PORT`, `LOCAL_EDITOR_WEB_PORT`, `LOCAL_EDITOR_API_PORT` and `LOCAL_EDITOR_DATA_DIR` override the defaults.

Run the Designer browser tests with:

```sh
npm run test:e2e:designer
```

This uses `apps/cms/tests/designer/playwright.config.ts`. The API's GitHub transport fixture tests use an isolated local HTTP fixture, never a real repository:

```sh
npx tsx --test apps/cms/tests/designer/editor-api.integration.test.ts
```

To rebuild the complete locally simulated publication as normal desktop/mobile output, run `npm run test:e2e:designer -- --grep 'publication reviews source'` followed by `npx tsx --tsconfig tsconfig.base.json apps/cms/tests/designer/verify-publication-build.ts`. It verifies reviewed copy, component variants, composition and responsive Tailwind styles, the captured revision marker, and the absence of private editor output, then restores canonical source files. Rebuild afterward to restore output for your current checkout.


### Visual source styling

Style groups follow a design-tool layout: Layout, margin/padding Spacing, Size, Position, Typography, Backgrounds, Borders and Effects. Type CSS values directly; bare length numbers mean pixels, arrow keys adjust values, and Alt-click a changed label restores the source baseline. The blue labels indicate drafts. Advanced custom properties use the same Tailwind translation rather than a separate override stylesheet.

Preview instrumentation discovers each element's source file, opening-tag position and Git blob SHA automatically. The authenticated source endpoint validates that exact baseline and generates class-only AST edits. Review shows original and resulting source; push recomputes the patch from current source and rejects forged code or stale baselines. Source IDs are frozen on the first edit so later rebuilds preserve selection and insertion anchors. Dynamic classes keep their original expression; repeated Home sections receive conditional instance classes, while explicit main-component edits remain shared.

After a source commit, a bounded, SHA-verified browser cache retains its preview until the website rebuild includes that file. This cache never supplies code for a write. Source references must match the current source revision before another class edit; rebuilding the local canvas or publishing the committed revision supplies fresh references. Added elements and component prop overrides continue using their existing structured source documents.


To verify source-authored main-component styles without the editor runtime, run the `Tailwind design drafts` browser case followed by `npx tsx --tsconfig tsconfig.base.json apps/cms/tests/designer/verify-component-source-build.ts`. This checks desktop/mobile Hero spacing, shared Button.Link labels, independent instance variants and unchanged Button.Root labels from the actual committed files.
