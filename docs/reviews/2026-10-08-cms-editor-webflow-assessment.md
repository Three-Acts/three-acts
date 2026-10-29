# CMS editor improvements toward Webflow behavior

Assessment of commit `ac341a7`, 8 October 2026. The CMS has a useful canvas, Navigator, breadcrumbs, page settings, template picker, inline text editing, and content review. The main opportunity is to make editing more predictable and connected: reversible changes, direct access to CMS records, clear save state, and access to hidden content. Persistent visual design requires an additional document model.

Webflow has distinct content editing and design capabilities. Its content editing workflow supports editing static and collection content on the canvas, automatically saving drafts, replacing media, and revealing interactive content. Design mode adds classes, responsive styles, and hierarchy changes. Use these as two stages of the Three Acts roadmap. [Webflow content editing](https://help.webflow.com/hc/en-us/articles/33961251014931-Edit-site-content-as-a-content-editor), [Webflow interface](https://help.webflow.com/hc/en-us/articles/33961260162323-Intro-to-Webflow).

## Prioritized improvements

### 1 Add editor undo and redo

**Priority: high. Scope: existing content contract plus temporary style experiments.**

`DesignerWorkspace.changeField` replaces the current draft without keeping an edit history. The canvas toolbar uses an undo icon for **Discard drafts**, which discards every changed content document after confirmation. Style reset similarly restores every modified element. Native text-input undo cannot reverse a sequence of canvas edits, field edits, and selection changes.

Add Undo/Redo buttons and Command/Control shortcuts with a bounded transaction history. Group typing into coherent edits and commit inline editing as one transaction. Keep browser text undo while an input is active; route editor shortcuts through the iframe when canvas focus is active. Keep Discard all drafts as a separate, explicitly scoped action. Reset history when the source baseline changes or a push succeeds.

**Acceptance:** edit two fields on different pages, undo only the most recent edit, redo it, and verify the canvas, review diff, and persisted drafts agree. Resetting one style property leaves other experiments intact.

Evidence: [draft mutation](../../apps/cms/src/components/designer/designer-workspace.tsx), [preview style reset](../../apps/web/public/editor-preview.js).

### 2 Connect selected CMS content to its source record

**Priority: high. Scope: binding metadata and existing record editor.**

Selecting a product title produces a purple CMS selection and an instruction to edit its source in the CMS workspace. There is no action that opens the corresponding record or field. The existing record editor and guarded navigation can provide this handoff before supporting direct canvas edits.

Add **Edit CMS item**, show the collection/item/field, open the correct record, and preserve a return path to the selected canvas item. Carry actual record IDs on template fields, related records, and repeated cards. Normalize collection IDs: some view markers use `productCategories` and `articleCategories`, while the registry uses `product-categories` and `article-categories`. Do not infer a related record solely from the currently previewed item.

**Acceptance:** selecting a product title opens that product; selecting its category opens the category; selecting a related article opens that article. Unsaved record changes receive the existing navigation guard. Returning restores the page and selection.

Evidence: [Content inspector](../../apps/cms/src/components/designer/inspector.tsx), [CMS binding parsing](../../apps/web/public/editor-preview.js), [product markers](../../apps/web/src/views/shop/ProductPage.tsx), [workspace navigation](../../apps/cms/src/screens/cms-workspace.tsx).

### 3 Make editability and save state visible

**Priority: high. Scope: UI and current draft storage.**

The workspace opens on Style, although Style is a temporary experiment and registered content is what can be saved. The preview-only badge already explains the limitation, but the most prominent editing mode is called Design. Content drafts save to localStorage; CMS records use an explicit backend Save; GitHub push and deployment are separate operations.

Make Content the initial inspector for content editors, or select the useful inspector when an editable leaf is chosen. Show an explicit edit affordance for text, links, and images. Label shared/template edits with their scope, such as **Shared across the site** or **All product pages**. Show **Saved in this browser**, draft changes awaiting push, and temporary style changes as separate states. Preserve source/storage failure feedback.

**Acceptance:** users can tell whether a selected value is editable, where it is saved, and which pages it affects without opening Publish. A style-only change remains clearly excluded from saved content.

Evidence: [workspace defaults and persistence](../../apps/cms/src/components/designer/designer-workspace.tsx), [preview-only badge](../../apps/cms/src/components/designer/style-inspector.tsx), [record saving](../../apps/cms/src/hooks/use-cms-workspace.ts).

### 4 Keep hidden elements reachable

**Priority: medium. Scope: preview bridge and Navigator.**

The preview tree includes visible elements only, stops after 400 nodes, and rejects selection of invisible elements. Design mode intercepts clicks, including clicks that would reveal menus and accordion panels. The Navigator therefore cannot reliably expose content hidden by responsive CSS or interactions. Webflow's Navigator includes hidden elements, and its content editing UI provides actions to reveal interactive content. [Webflow Navigator](https://help.webflow.com/hc/en-us/articles/33961320786451-Navigator), [interactive content editing](https://help.webflow.com/hc/en-us/articles/33961251014931-Edit-site-content-as-a-content-editor).

Keep hidden nodes in the tree with a visibility indicator. Provide controlled Show menu/Open accordion actions and update the tree when interaction state changes. Allow hidden-node inspection without silently changing published visibility. Report truncation or load branches lazily instead of silently omitting the remainder.

**Acceptance:** find and edit mobile-menu content without leaving editing mode; inspect an element hidden at the current width; retain stable selection when a branch opens.

Evidence: [tree construction and selection guards](../../apps/web/public/editor-preview.js), [Navigator](../../apps/cms/src/components/designer/navigator.tsx).

### 5 Support draft CMS previews and contextual media editing

**Priority: medium. Scope: authenticated preview rendering and CMS integration.**

The item picker uses liveValues, or values of published records. Draft-only items have no preview route. This avoids navigating to missing static pages, but prevents the edit-preview loop before publication. The static preview message contains registered content documents only, so editing a CMS record does not overlay that record's draft values on the canvas.

Introduce an authenticated preview path that renders draft collection values without changing public data. Then reuse the existing image/media controls for bound assets and alt text. Keep rich text structured: the current plain-text leaf restrictions protect nested markup, so formatted text needs an explicit serialization/rendering contract.

**Acceptance:** preview a new unpublished product and a saved draft title/image without publishing; public routes still show the published snapshot; replacing an image updates the draft and preview consistently.

Evidence: [preview item loader](../../apps/cms/src/components/designer/use-cms-page-previews.ts), [preview document message](../../apps/cms/src/components/designer/designer-workspace.tsx), [field controls](../../apps/cms/src/components/editor/field-control.tsx).

### 6 Make styles durable and responsive

**Priority: highest for full Designer parity. Scope: new style model and rendering support.**

Style changes currently set inline properties on one DOM element and disappear on page changes/reloads. The three device buttons resize the iframe; they do not select a style breakpoint. A desktop font-size experiment remains applied at mobile width. Class chips are read-only, values come from computed CSS, and there is no metadata identifying the source of an inherited property. Webflow saves reusable classes and supports breakpoint-specific overrides with inheritance indicators. [Webflow Style panel](https://help.webflow.com/hc/en-us/articles/33961362040723-Style-panel-overview), [Webflow breakpoints](https://help.webflow.com/hc/en-us/articles/33961300305811-Breakpoints-overview).

Add a validated style document using stable element/component IDs, classes or tokens, breakpoint overrides, and later pseudo-states. Integrate it into draft storage, review, atomic source writes, and Astro rendering. Show authored values and their origins rather than only resolved pixel values. Add exact viewport width, resize handles, and zoom separately from breakpoint selection. Existing positional DOM selectors are unsuitable as durable identities across layout changes.

**Acceptance:** a mobile override survives reload/push and the built website matches the preview; desktop retains its base value; removing the override restores inheritance; shared-class edits update all intended instances.

Evidence: [inline mutation and positional selectors](../../apps/web/public/editor-preview.js), [viewport presets](../../apps/cms/src/components/designer/designer-workspace.tsx), [read-only classes](../../apps/cms/src/components/designer/style-inspector.tsx).

### 7 Add constrained section composition

**Priority: later. Scope: layout model and approved component registry.**

The Navigator is a read-only outline. The content validator requires the existing object keys and array lengths; layouts, routes, and section order remain developer-owned. Webflow hierarchy editing changes the underlying document and immediately updates its canvas. [Webflow Navigator](https://help.webflow.com/hc/en-us/articles/33961320786451-Navigator).

Start with approved section types and explicit editable properties. Add section reorder, duplicate, hide, and insertion through a validated page layout document. Use stable IDs, schema versions, nesting rules, and source rendering. Avoid treating arbitrary DOM mutations as publishable layout changes.

**Acceptance:** reorder or duplicate an approved section, undo it, review it, and verify the persisted build matches the preview across widths. Invalid nesting is rejected.

Evidence: [content contract](../../packages/static-content/src/index.ts), [Designer boundaries](../../apps/cms/DESIGNER.md).

### 8 Connect review and deployment state

**Priority: medium. Scope: publish orchestration and feedback.**

Publish already groups source actions and site deployment, and correctly instructs editors to push browser drafts before deploying. It still allows deployment independently of those drafts. A successful GitHub push updates the source baseline and clears local drafts, while the hosting rebuild may still be pending or fail.

Add a review summary of content changes, queued CMS items, and temporary styles excluded from publication. Offer an ordered review/push/deploy workflow and retain a visible **Committed**, **Deploying**, **Live**, or **Deploy failed** state tied to the relevant source revision. Respect the configured content branch and hosting build source; push success alone does not establish that a build includes the commit.

**Acceptance:** pending content cannot be mistaken for deployed content; deployment failure retains a retry path without repeating the source commit; the live revision can be identified.

Evidence: [source push](../../apps/cms/src/components/designer/designer-workspace.tsx), [publishing menu](../../apps/cms/src/components/workspace/top-bar.tsx), [deployment hook](../../apps/cms/src/hooks/use-publish.ts).

## Suggested delivery order

1. Implement undo/redo, contextual editability/save feedback, and exact CMS record handoff.
2. Add hidden-content access and authenticated CMS draft preview; reuse media controls.
3. Define and validate the persistent style model, then add classes, responsive overrides, and inheritance feedback.
4. Add constrained section composition and expand the unified publication workflow.

The current atomic GitHub writes, original file SHA checks, URL validation, structured-text protection, and draft recovery are useful foundations to preserve.

## Verification and limits

Repository code, Designer documentation, and existing browser-test coverage were inspected. Local browser checks used the mock CMS on port 5174 and an isolated public-site preview on port 5341. Confirmed canvas selection, Content inspection, temporary style reset, a desktop style experiment remaining applied in the 390px mobile preview, and a product-title selection ending at the CMS read-only explanation. Screenshots are under `output/playwright/`.

No production code changed and no remote push or deployment was performed. Existing automated tests were inspected, not executed. The mock preview did not have a reviews API or working sample video host, so those errors are outside this assessment of editor behavior. Durable styles, draft preview, and layout composition are proposals; their complete data contracts remain to be designed.
