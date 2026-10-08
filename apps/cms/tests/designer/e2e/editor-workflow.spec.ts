import { expect, test } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import type { EditorWorkspace } from "@three-acts/static-content";
import { fileURLToPath } from "node:url";
import type { CmsDraftPreview } from "@three-acts/cms-schema";

const email = "e2e-designer@example.com";
const password = "e2e-password";
const firstEdit = "A browser-saved headline for Three Acts.";
const directEdit = "A directly edited headline for Three Acts.";
const pushedEdit = "A committed headline for Three Acts.";


function pagePicker(page: import("@playwright/test").Page) {
  return page.getByRole("dialog", { name: "Page picker" });
}

async function openPagePicker(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Choose page" }).click();
  const picker = pagePicker(page);
  await expect(picker).toBeVisible();
  return picker;
}

async function choosePage(page: import("@playwright/test").Page, label: string) {
  await (await openPagePicker(page)).getByRole("button", { name: `Open page ${label}`, exact: true }).click();
}

async function choosePreviewItem(page: import("@playwright/test").Page, label: string) {
  const picker = await openPagePicker(page);
  await picker.getByRole("searchbox", { name: "Search picker pages" }).fill(label);
  await picker.getByRole("button", { name: `Preview item ${label}`, exact: true }).click();
}

async function selectArticleBreadcrumbLink(page: import("@playwright/test").Page) {
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  await canvas.locator('[data-static-field="article-template.journal_breadcrumb"]').click();
  await page.getByRole("navigation", { name: "Element breadcrumb" }).getByRole("button", { name: "Link · Journal", exact: true }).click();
  await page.getByRole("button", { name: "Content panel" }).click();
}

async function openPublishing(page: import("@playwright/test").Page) {
  const publishing = page.getByRole("dialog", { name: "Publishing" });
  if (!(await publishing.count())) await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(publishing).toBeVisible();
  return publishing;
}

async function expectReviewState(page: import("@playwright/test").Page, enabled: boolean) {
  const publishing = await openPublishing(page);
  const review = publishing.getByRole("button", { name: "Review & push" });
  if (enabled) await expect(review).toBeEnabled();
  else await expect(review).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(publishing).toHaveCount(0);
}

async function openReview(page: import("@playwright/test").Page) {
  const publishing = await openPublishing(page);
  await publishing.getByRole("button", { name: "Review & push" }).click();
  const review = page.getByRole("dialog", { name: "Review changes" });
  await expect(review).toBeVisible();
  return review;
}

async function expectPageState(
  pageItem: import("@playwright/test").Locator,
  state: "changed" | "draft" | "published" | "saved",
  description: string,
  color: string
) {
  await expect(pageItem).toHaveAttribute("data-page-state", state);
  await expect(pageItem).toHaveAttribute("aria-description", description);
  await expect(pageItem).toHaveCSS("color", color);
  await expect(pageItem.locator("span").first()).toHaveCSS("color", color);
  await expect(pageItem.locator("svg").first()).toHaveCSS("color", color);
}

async function openCurrentPageDetails(page: import("@playwright/test").Page) {
  const picker = await openPagePicker(page);
  const details = picker.getByRole("button", { name: "Current page details", exact: true });
  await details.locator("xpath=..").hover();
  await details.click();
}

async function openDesignerTab(page: import("@playwright/test").Page) {
  const workspace = page.getByRole("navigation", { name: "Workspace" });
  await expect(workspace.getByRole("button")).toHaveText(["Designer", "CMS", "Resources", "Site"]);
  await expect(workspace.getByRole("button", { name: "Designer", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Choose page" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Preview item" })).toHaveCount(0);
  await expect(page.getByText("Preview item", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", {name:"Add element",exact:true})).toBeEnabled();
  // Start these workflows on Content; these workflows intentionally edit Content.
  await page.getByRole("button", { name: "Content panel" }).click();
}

async function signInAndOpenDesigner(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Back of house." })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("navigation", { name: "Workspace" })).toBeVisible();
  await openDesignerTab(page);
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Home");
}

test("canvas selection keeps the content inspector available and explains read-only bindings", async ({ page }) => {
  await signInAndOpenDesigner(page);

  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  const overlay = canvas.locator("#three-acts-editor-selection");
  const content = page.getByRole("complementary", { name: "Content inspector" });

  await expect(content).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Style inspector" })).toHaveCount(0);
  await expect(content.getByRole("searchbox")).toHaveCount(0);
  await expect(content.getByRole("button", { name: /Edit .*:/i })).toHaveCount(0);

  // Hover previews an element; selecting it updates the existing content pane.
  await hero.hover();
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute("data-category", "element");
  await expect(overlay).toHaveAttribute("data-label", /.+/);
  await expect(overlay).toHaveCSS("--editor-selection-color", "#305eee");
  await hero.click();
  await expect(content).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Element breadcrumb" })).toContainText(/.+/);
  const selectedField = content.locator("#selected-text");
  await expect(selectedField).toHaveValue("The client website template that ships production-ready.");
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-selection-content.png", import.meta.url)), fullPage: true });
  const edited = "An intentionally selected and browser-saved headline.";
  await selectedField.fill("");
  await expect(hero).toHaveText("");
  await expect(selectedField).toBeVisible();
  await selectedField.fill(edited);
  await expect(hero).toHaveText(edited);

  // A marked component gets the green affordance and its own selection metadata.
  await canvas.locator("body").evaluate((body) => {
    const component = document.createElement("section");
    component.dataset.editorComponent = "e2e-card";
    component.dataset.editorComponentLabel = "E2E card";
    component.textContent = "Component selection fixture";
    body.append(component);
  });
  const component = canvas.locator('[data-editor-component="e2e-card"]');
  await component.hover();
  await expect(overlay).toHaveAttribute("data-category", "component");
  await expect(overlay).toHaveCSS("--editor-selection-color", "#16a34a");
  await component.click();
  await expect(page.getByRole("complementary", { name: "Component properties" }).getByText("This component has no registered property definition.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Style panel" })).toHaveCount(0);

  // Selecting a structural parent reports safe metadata without exposing a
  // flattened dump of all text inside its descendants.
  await page.getByRole("button", { name: "Navigator panel" }).click();
  const bodyNode = page.getByRole("complementary", { name: "Navigator" }).getByRole("treeitem", { name: "Element: Body, body" });
  await bodyNode.click();
  await expect(content.getByText(/structured content that cannot be safely edited as one text field/i)).toBeVisible();
  await expect(content.locator("#selected-text")).toHaveCount(0);
  await expect(content.getByText(/The client website template that ships production-ready/)).toHaveCount(0);

  await page.reload();
  await openDesignerTab(page);
  const reloadedCanvas = page.frameLocator('iframe[title="Website canvas"]');
  const reloadedHero = reloadedCanvas.locator('[data-static-field="home.hero_section.display_1"]');
  await expect(reloadedHero).toHaveText(edited);

  // CMS-bound values receive the purple affordance and remain read-only.
  await choosePage(page, "Product template");
  await choosePreviewItem(page, "Web App (Astro Static Site)");
  const productCanvas = page.frameLocator('iframe[title="Website canvas"]');
  const productTitle = productCanvas.locator('h1[data-cms-bound="products.title"]');
  const productOverlay = productCanvas.locator("#three-acts-editor-selection");
  await productTitle.hover();
  await expect(productOverlay).toBeVisible();
  await expect(productOverlay).toHaveAttribute("data-category", "cms");
  await expect(productOverlay).toHaveCSS("--editor-selection-color", "#9333ea");
  await productTitle.click();
  await expect(page.getByRole("complementary", { name: "Component properties" }).getByText(/This CMS content is read-only in the designer/i)).toBeVisible();
  await expect(page.locator("#selected-text")).toHaveCount(0);

  // A plain, unbound text element opens a clear explanation rather than an
  // editor that cannot persist its changes.
  await productCanvas.locator("body").evaluate((body) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = "Unbound text for canvas selection coverage.";
    paragraph.dataset.testid = "unbound-canvas-text";
    body.append(paragraph);
  });
  const unbound = productCanvas.locator('[data-testid="unbound-canvas-text"]');
  await unbound.hover();
  await expect(productOverlay).toHaveAttribute("data-category", "element");
  await expect(productOverlay).toHaveCSS("--editor-selection-color", "#305eee");
  await unbound.click();
  await expect(content.getByText("This text is not connected to a saved content field.", { exact: true })).toBeVisible();
});

test("mixed inline content with a saved binding stays metadata-only and cannot enter inline edit mode", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const paragraphField = canvas.locator('[data-static-field="home.intro_section.p_4"]');
  await paragraphField.evaluate((element) => {
    const strong = document.createElement("strong");
    strong.textContent = " Nested fixture content";
    element.append(strong);
  });

  await paragraphField.click();
  const content = page.getByRole("complementary", { name: "Content inspector" });
  await expect(content.getByText(/structured content that cannot be safely edited as one text field/i)).toBeVisible();
  await expect(content.locator("#selected-text")).toHaveCount(0);
  await expect(content.getByText(/We built Three Acts after forking/i)).toHaveCount(0);
  await paragraphField.dblclick();
  await expect(paragraphField).not.toHaveAttribute("contenteditable", "true");
  // Updating another field also preserves the marked parent's nested structure.
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  await content.locator("#selected-text").fill(firstEdit);
  await expect(hero).toHaveText(firstEdit);
  await expect(paragraphField.locator("strong")).toHaveText(" Nested fixture content");
});

test("navigator selection, Tailwind source reset, persisted page changes, and canvas modes work together", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const navigator = page.getByRole("complementary", { name: "Navigator" });
  await navigator.getByRole("searchbox", { name: "Search elements" }).fill("Cta Section");
  await navigator.getByRole("treeitem", { name: "Element: Cta Section, section, nested element", exact: true }).click();
  await navigator.getByRole("searchbox", { name: "Search elements" }).fill("");
  await expect(page.getByRole("navigation", { name: "Element breadcrumb" })).toContainText("Cta Section");
  await expect(canvas.locator("[data-editor-selected]")).toHaveCount(1);
  await page.getByRole("button", { name: "Style panel" }).click();
  const styles = page.getByRole("complementary", { name: "Style inspector" });
  await styles.getByRole("combobox", { name: "Style breakpoint" }).selectOption("base");
  const section = canvas.locator('[data-editor-id="source.cta-section.1"]');
  const original = await section.getAttribute("class");
  await styles.getByRole("combobox", { name: "Padding top", exact: true }).selectOption("pt-4");
  await styles.getByRole("combobox", { name: "Background", exact: true }).selectOption("bg-block");
  await expect(section).toHaveClass(/pt-4/);
  await expect(section).toHaveClass(/bg-block/);
  await expect(section).not.toHaveAttribute("style");
  await expectReviewState(page, true);
  await choosePage(page, "About");
  await choosePage(page, "Home");
  await expect(section).toHaveClass(/pt-4/);
  await expect(section).toHaveClass(/bg-block/);
  await section.click({ position: { x: 1, y: 1 } });
  await styles.getByRole("combobox", { name: "Padding top", exact: true }).selectOption("");
  await styles.getByRole("combobox", { name: "Background", exact: true }).selectOption("");
  await expect(section).toHaveAttribute("class", original!);
  await expectReviewState(page, false);
  await page.getByRole("button", { name: "Preview mode" }).click();
  await expect(canvas.locator("#three-acts-editor-selection")).toBeHidden();
  await expect(styles.getByRole("combobox", { name: "Padding top", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Design mode" }).click();
  await expect(styles.getByRole("combobox", { name: "Padding top", exact: true })).toBeEnabled();
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-style-inspector.png", import.meta.url)), fullPage: true });
});

test("compact panels keep disclosure choices, reveal canvas selections, and align their controls", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const navigator = page.getByRole("complementary", { name: "Navigator" });
  const tree = navigator.getByRole("tree", { name: "Page elements" });
  await expect(tree.getByRole("treeitem").first()).toHaveAccessibleName("Element: Body, body");
  expect(await tree.getByRole("treeitem").count()).toBeLessThan(60);
  await navigator.getByRole("button", { name: "Collapse all elements" }).click();
  await expect(tree.getByRole("treeitem")).toHaveCount(1);
  await tree.getByRole("treeitem").press("ArrowRight");
  await expect.poll(() => tree.getByRole("treeitem").count()).toBeGreaterThan(1);
  await navigator.getByRole("button", { name: "Expand all elements" }).click();

  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  const selectedNode = tree.locator('[aria-selected="true"]');
  await expect(selectedNode).toContainText("Hero Display");
  await expect(selectedNode.locator("svg")).not.toHaveClass(/mouse-pointer/);
  await navigator.getByRole("button", { name: "Collapse all elements" }).click();
  await expect(tree.getByRole("treeitem")).toHaveCount(1);
  await hero.click();
  await expect(selectedNode).toBeVisible();

  await page.getByRole("button", { name: "Style panel" }).click();
  const style = page.getByRole("complementary", { name: "Style inspector" });
  expect(await style.evaluate((element) => Math.round(element.parentElement!.getBoundingClientRect().width))).toBe(256);
  expect(await navigator.evaluate((element) => Math.round(element.parentElement!.getBoundingClientRect().width))).toBe(224);
  const leftTabs = await page.getByLabel("Left panel", { exact: true }).boundingBox();
  const rightTabs = await page.getByLabel("Right panel", { exact: true }).boundingBox();
  expect(Math.abs(leftTabs!.y - rightTabs!.y)).toBeLessThan(1);
  const selectedHeader = await page.getByLabel("Selected element", { exact: true }).boundingBox();
  expect(selectedHeader!.y).toBeGreaterThan(rightTabs!.y);

  await page.getByRole("button", { name: "Pages panel" }).click();
  await expect(page.getByText("Global content", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Site & navigation", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Navigator panel" }).click();

  // A nested content leaf now exposes its source styling directly.
  await expect(style.getByRole("combobox", {name:"Padding bottom",exact:true})).toBeEnabled();
  const cta = canvas.locator('[data-editor-id="source.cta-section.1"]');
  await cta.click({ position: { x: 1, y: 1 } });
  await style.getByRole("combobox", { name: "Style breakpoint" }).selectOption("base");
  await style.getByRole("combobox", { name: "Display", exact: true }).selectOption("flex");
  await expect(cta).toHaveClass(/flex/);
  await style.getByRole("combobox", { name: "Direction", exact: true }).selectOption("flex-col");
  await expect(cta).toHaveClass(/flex-col/);
  await style.getByRole("combobox", { name: "Display", exact: true }).selectOption("");
  await style.getByRole("combobox", { name: "Direction", exact: true }).selectOption("");
  await hero.click();
  await page.getByRole("button", { name: "Show parent elements" }).click();
  const parents = page.getByRole("dialog", { name: "Parent elements" });
  await expect(parents).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(parents).toHaveCount(0);
  await expectReviewState(page, false);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-reference-refinement.png", import.meta.url)), fullPage: true });
});

test("CMS designer edits drafts, adapts the canvas, discards safely, pushes to the stub, and renders GitHub readback", async ({ page }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "failed";
    // Vite's optimized modules can be canceled as an iframe navigation starts;
    // only report requests that failed instead of normal navigation aborts.
    if (reason !== "net::ERR_ABORTED") failedRequests.push(`${request.method()} ${request.url()}: ${reason}`);
  });

  await signInAndOpenDesigner(page);

  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await expect(hero).toContainText("The client website template that ships production-ready.");
  const shopNavigation = canvas.locator('[data-static-field="shared.navLinks.0.label"]').first();
  await expect(shopNavigation).toHaveText("Shop");
  await shopNavigation.click();
  await expect(page.locator("#selected-text")).toHaveValue("Shop");

  await hero.click();
  await expect(page.locator("#selected-text")).toHaveValue("The client website template that ships production-ready.");
  await page.locator("#selected-text").fill(firstEdit);
  await expect(hero).toHaveText(firstEdit);
  await expectReviewState(page, true);
  await expect(page.getByRole("complementary", { name: "Content inspector" }).getByRole("searchbox")).toHaveCount(0);

  await page.reload();
  await openDesignerTab(page);
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Home");
  const reloadedCanvas = page.frameLocator('iframe[title="Website canvas"]');
  const reloadedHero = reloadedCanvas.locator('[data-static-field="home.hero_section.display_1"]');
  await expect(reloadedHero).toHaveText(firstEdit);
  await reloadedHero.click();
  await expect(page.locator("#selected-text")).toHaveValue(firstEdit);

  await page.getByLabel("mobile preview").click();
  await expect(page.getByLabel("mobile preview")).toHaveAttribute("aria-pressed", "true");
  const canvasWidth = await canvas.locator("html").evaluate(element => element.ownerDocument.defaultView!.innerWidth);
  expect(canvasWidth).toBe(390);
  await page.getByLabel("desktop preview").click();

  const aboutPicker = await openPagePicker(page);
  await aboutPicker.getByRole("searchbox").fill("About");
  await aboutPicker.getByRole("button", { name: "Open page About", exact: true }).click();
  await expect(page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="about.about.title_5"]')).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Content inspector" }).getByRole("searchbox")).toHaveCount(0);

  const homePicker = await openPagePicker(page);
  await homePicker.getByRole("searchbox").fill("Home");
  await homePicker.getByRole("button", { name: "Open page Home", exact: true }).click();
  const homeHero = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]');
  await homeHero.dblclick();
  await homeHero.fill(directEdit);
  await homeHero.press("Tab");
  await expect(page.locator("#selected-text")).toHaveValue(directEdit);
  await expect(homeHero).toHaveText(directEdit);

  await page.getByRole("button", { name: "Discard drafts" }).click();
  const discard = page.getByRole("alertdialog", { name: "Discard drafts?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Cancel" }).click();
  await expect(homeHero).toHaveText(directEdit);
  await page.getByRole("button", { name: "Discard drafts" }).click();
  await page.getByRole("alertdialog", { name: "Discard drafts?" }).getByRole("button", { name: "Discard drafts" }).click();
  await expect(homeHero).toHaveText("The client website template that ships production-ready.");
  await expectReviewState(page, false);

  await homeHero.click();
  await page.locator("#selected-text").fill(pushedEdit);
  await expect(homeHero).toHaveText(pushedEdit);
  await expectReviewState(page, true);
  await openReview(page);
  await expect(page.getByText("One commit to test/site on content.")).toBeVisible();
  await page.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByText("Pushed to GitHub", { exact: true })).toBeVisible();
  await expect(page.getByText("Your hosting service can now rebuild the site. View the commit in GitHub connection details.", { exact: true })).toBeVisible();
  await expect(homeHero).toHaveText(pushedEdit);
  await expectReviewState(page, false);

  // A full reload reads the committed file back from the local GitHub REST stub.
  await page.reload();
  await openDesignerTab(page);
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Home");
  await expect(page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]')).toHaveText(pushedEdit);

  expect(failedRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-after-push.png", import.meta.url)), fullPage: true });
});

test("a selected bound link attribute saves through GitHub and can be discarded after reload", async ({ page }) => {
  await signInAndOpenDesigner(page);
  await choosePage(page, "Article template");
  await choosePreviewItem(page, "Ship a client site in an afternoon");

  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const breadcrumbLink = canvas.locator('[data-static-field="article-template.journal_breadcrumb_href"]');
  const content = page.getByRole("complementary", { name: "Content inspector" });
  const cmsImage = canvas.locator('img[data-cms-bound="articles.coverImage"]');
  await expect(cmsImage).toBeVisible();
  await cmsImage.click();
  await expect(content.getByLabel("src", { exact: true })).toHaveAttribute("readonly", "");
  await expect(content.getByLabel("alt", { exact: true })).toHaveAttribute("readonly", "");
  await expect(content.getByText(/attribute is not connected to a saved content field/i).first()).toBeVisible();

  await selectArticleBreadcrumbLink(page);
  const href = content.getByLabel("href", { exact: true });
  await expect(href).toHaveValue("/blog");
  await expect(content.locator("#selected-text")).toHaveCount(0);

  await expectReviewState(page, false);
  await href.fill("");
  await href.press("Enter");
  await expect(breadcrumbLink).not.toHaveAttribute("href");
  await expect(href).toBeVisible();
  await expect(href).toHaveValue("");
  await href.fill("/blog");
  await href.press("Enter");
  await expect(breadcrumbLink).toHaveAttribute("href", "/blog");
  await expectReviewState(page, false);
  await href.fill("javascript:alert(1)");
  await href.press("Enter");
  await expect(href).toHaveAttribute("aria-invalid", "true");
  await expect(breadcrumbLink).toHaveAttribute("href", "/blog");
  await expectReviewState(page, false);
  await href.fill("https://");
  await href.press("Enter");
  await expect(href).toHaveAttribute("aria-invalid", "true");
  await expect(breadcrumbLink).toHaveAttribute("href", "/blog");
  await expectReviewState(page, false);
  await href.fill("/cancel-me");
  await href.press("Escape");
  await expect(href).toHaveValue("/blog");
  await expect(breadcrumbLink).toHaveAttribute("href", "/blog");
  await expectReviewState(page, false);

  await href.fill("/journal");
  await href.press("Enter");
  await expect(href).toHaveValue("/journal");
  await expect(breadcrumbLink).toHaveAttribute("href", "/journal");
  await expectReviewState(page, true);
  await openReview(page);
  await page.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByText("Pushed to GitHub", { exact: true })).toBeVisible();
  await expect(page.getByText("Your hosting service can now rebuild the site. View the commit in GitHub connection details.", { exact: true })).toBeVisible();

  await page.reload();
  await openDesignerTab(page);
  await choosePage(page, "Article template");
  await choosePreviewItem(page, "Ship a client site in an afternoon");
  const reloadedLink = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="article-template.journal_breadcrumb_href"]');
  await selectArticleBreadcrumbLink(page);
  const reloadedHref = page.getByRole("complementary", { name: "Content inspector" }).getByLabel("href", { exact: true });
  await expect(reloadedHref).toHaveValue("/journal");
  await reloadedHref.fill("/discard-me");
  await reloadedHref.press("Enter");
  await expect(reloadedLink).toHaveAttribute("href", "/discard-me");

  await page.getByRole("button", { name: "Discard drafts" }).click();
  await page.getByRole("alertdialog", { name: "Discard drafts?" }).getByRole("button", { name: "Discard drafts" }).click();
  await expect(reloadedLink).toHaveAttribute("href", "/journal");
  await expectReviewState(page, false);
});

test("editing a shared navigation href drafts only shared content and leaves the Home canvas in place", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const iframe = page.locator('iframe[title="Website canvas"]');
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const originalRoute = await iframe.evaluate((element) => new URL(element.src).pathname);
  const originalHero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await originalHero.click();
  const originalHeroField = page.locator("#selected-text");
  await expect(originalHeroField).toBeVisible();
  const originalHeroText = await originalHeroField.inputValue();
  await expect(originalHero).toHaveText(originalHeroText);
  const shopLabel = canvas.locator('[data-static-field="shared.navLinks.0.label"]').first();
  const shopLink = canvas.locator('[data-static-field="shared.navLinks.0.href"]').first();
  await shopLabel.click();
  await page.getByRole("navigation", { name: "Element breadcrumb" }).getByRole("button", { name: "Link · Shop", exact: true }).click();
  await page.getByRole("button", { name: "Content panel" }).click();

  const content = page.getByRole("complementary", { name: "Content inspector" });
  await expect(page.getByLabel("Editing scope", { exact: true })).toHaveText("Shared across the site");
  const href = content.getByLabel("href", { exact: true });
  await expect(href).toHaveValue("/shop");
  await href.fill("/newpath");
  await href.press("Enter");
  await expect(href).toHaveValue("/newpath");
  await expect(shopLink).toHaveAttribute("href", "/newpath");
  await expect(shopLabel).toHaveText("Shop");
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Home");
  await expect.poll(() => iframe.evaluate((element) => new URL(element.src).pathname)).toBe(originalRoute);

  const review = await openReview(page);
  await expect(review.getByRole("heading", { name: /^Site & navigation\b/ })).toBeVisible();
  await expect(review.getByRole("heading", { name: /^Home\b/ })).toHaveCount(0);
  await expect(review.getByText("nav Links / Item 1 / href", { exact: true })).toBeVisible();
  await expect(review.getByText("/newpath", { exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Keep editing" }).click();

  await page.getByRole("button", { name: "Discard drafts" }).click();
  await page.getByRole("alertdialog", { name: "Discard drafts?" }).getByRole("button", { name: "Discard drafts" }).click();
  await expect(shopLink).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Home");
  await expect.poll(() => iframe.evaluate((element) => new URL(element.src).pathname)).toBe(originalRoute);
  await expect(originalHero).toHaveText(originalHeroText!);
  await expectReviewState(page, false);
});

test("page details stay beside the canvas and guard close and page changes until saved or discarded", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  await expect(canvas.locator('[data-static-field="home.hero_section.display_1"]')).toBeVisible();
  const iframe = page.locator('iframe[title="Website canvas"]');
  const initialCanvasWidth = await iframe.evaluate((element) => Math.round(element.parentElement!.getBoundingClientRect().width));
  await openCurrentPageDetails(page);
  const panel = page.getByRole("complementary", { name: "Page details" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Page details", exact: true })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Home", exact: true })).toHaveCount(0);
  await expect(canvas.locator('[data-static-field="home.hero_section.display_1"]')).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Content inspector" })).toBeVisible();
  await expect.poll(() => iframe.evaluate((element) => Math.round(element.parentElement!.getBoundingClientRect().width))).toBe(initialCanvasWidth);
  const pageName = panel.getByLabel("Page name");
  await expect(pageName).toBeVisible();
  const originalName = await pageName.inputValue();
  await pageName.fill(`${originalName} e2e draft`);
  await panel.getByRole("button", { name: "Close page details" }).click();
  const discardDetails = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
  await expect(discardDetails).toBeVisible();
  await discardDetails.getByRole("button", { name: "Cancel" }).click();
  await expect(pageName).toHaveValue(`${originalName} e2e draft`);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await expect(page.getByText("Unsaved", { exact: true })).toHaveCount(0);
  await panel.getByRole("button", { name: "Close page details" }).click();
  await expect(panel).toHaveCount(0);
  await expect.poll(() => iframe.evaluate((element) => Math.round(element.parentElement!.getBoundingClientRect().width))).toBe(initialCanvasWidth);
  await expect(page.getByRole("complementary", { name: "Content inspector" })).toBeVisible();
  await openCurrentPageDetails(page);
  await expect(panel.getByLabel("Page name")).toHaveValue(`${originalName} e2e draft`);

  const unsavedHomeName = `${originalName} unsaved Home`;
  await panel.getByLabel("Page name").fill(unsavedHomeName);
  await choosePage(page, "About");
  await expect(page.getByRole("alertdialog", { name: "Discard unsaved changes?" })).toBeVisible();
  await page.getByRole("alertdialog", { name: "Discard unsaved changes?" }).getByRole("button", { name: "Cancel" }).click();
  await expect(panel.getByLabel("Page name")).toHaveValue(unsavedHomeName);
  await expect(canvas.locator('[data-static-field="home.hero_section.display_1"]')).toBeVisible();

  await choosePage(page, "About");
  await page.getByRole("alertdialog", { name: "Discard unsaved changes?" }).getByRole("button", { name: "Discard" }).click();
  await expect(panel.getByLabel("Page name")).toHaveValue("About");
  await expect(canvas.locator('[data-static-field="about.about.title_5"]')).toBeVisible();

  const unsavedAboutName = "About unsaved e2e";
  await panel.getByLabel("Page name").fill(unsavedAboutName);
  await choosePage(page, "Home");
  await expect(page.getByRole("alertdialog", { name: "Discard unsaved changes?" })).toBeVisible();
  await page.getByRole("alertdialog", { name: "Discard unsaved changes?" }).getByRole("button", { name: "Cancel" }).click();
  await expect(panel.getByLabel("Page name")).toHaveValue(unsavedAboutName);
  await expect(canvas.locator('[data-static-field="about.about.title_5"]')).toBeVisible();

  await choosePage(page, "Home");
  await page.getByRole("alertdialog", { name: "Discard unsaved changes?" }).getByRole("button", { name: "Discard" }).click();
  await expect(panel.getByLabel("Page name")).toHaveValue(`${originalName} e2e draft`);
  await expect(canvas.locator('[data-static-field="home.hero_section.display_1"]')).toBeVisible();
  await panel.getByRole("button", { name: "Close page details" }).click();
  await expect(page.getByRole("complementary", { name: "Content inspector" })).toBeVisible();
});

test("Pages sidebar details open for the hovered row and keyboard-focused row", async ({ page }) => {
  await signInAndOpenDesigner(page);
  await page.getByRole("button", { name: "Pages panel" }).click();

  const pages = page.getByRole("complementary", { name: "Pages" });
  const homeDetails = pages.getByRole("button", { name: "Page details for Home", exact: true });
  await homeDetails.locator("xpath=..").hover();
  await expect(homeDetails).toBeVisible();
  await homeDetails.click();

  const panel = page.getByRole("complementary", { name: "Page details" });
  await expect(panel.getByLabel("Page name")).toBeVisible();
  await expect(panel.getByLabel("Page path")).toHaveValue("/");
  await expect(page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]')).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-pages-polish.png", import.meta.url)), fullPage: true });
  await panel.getByRole("button", { name: "Close page details" }).click();

  const aboutDetails = pages.getByRole("button", { name: "Page details for About", exact: true });
  await aboutDetails.focus();
  await expect(aboutDetails).toBeFocused();
  await aboutDetails.press("Enter");
  await expect(panel.getByLabel("Page name")).toHaveValue("About");
  await expect(page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="about.about.title_5"]')).toBeVisible();
});

test("the canvas page picker previews CMS records and shares editable template copy with page details drafts", async ({ page }) => {
  await signInAndOpenDesigner(page);

  await page.setViewportSize({ width: 1309, height: 954 });
  const trigger = page.getByRole("button", { name: "Choose page" });
  const iframe = page.locator('iframe[title="Website canvas"]');
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const previewAt = async (template: string, item: string, route: string) => {
    await choosePage(page, template);
    await choosePreviewItem(page, item);
    await expect(trigger).toContainText(item);
    await expect.poll(() => iframe.evaluate((element) => new URL(element.src).pathname)).toBe(route);
  };

  // Static pages, CMS templates, and a template's collection previews share
  // one searchable popup. The case-studies category is a draft with a live snapshot.
  await previewAt("Product template", "Web App (Astro Static Site)", "/shop/web-app");
  const picker = await openPagePicker(page);
  for (const template of ["Product template", "Article template", "Author template", "Product category template", "Article category template"]) {
    await expect(picker.getByRole("button", { name: `Open page ${template}`, exact: true })).toBeVisible();
  }
  const searchPicker = picker.getByRole("searchbox", { name: "Search picker pages" });
  await picker.getByRole("button", { name: "Browse collection items", exact: true }).click();
  await expect(searchPicker).toBeFocused();
  await expect(picker.getByRole("button", { name: "Preview item Web App (Astro Static Site)", exact: true })).toBeVisible();
  await expect(picker.getByRole("button", { name: "Open page Article template", exact: true })).toHaveCount(0);
  await picker.getByRole("button", { name: "Back to pages", exact: true }).click();
  await expect(searchPicker).toBeFocused();
  await expect(picker.getByRole("button", { name: "Open page Article template", exact: true })).toBeVisible();
  await searchPicker.fill("CMS App");
  await expect(picker.getByRole("button", { name: "Preview item CMS App (Editorial Workspace)", exact: true })).toBeVisible();
  await expect(picker.getByRole("button", { name: "Preview item Web App (Astro Static Site)", exact: true })).toHaveCount(0);
  await searchPicker.fill("No matching page or item");
  await expect(picker.getByText("No pages or items match your search.", { exact: true })).toBeVisible();
  await expect(picker.getByText(/No (static|CMS) pages match/)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(trigger).toBeFocused();

  const screenshotPicker = await openPagePicker(page);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-toolbar-page-picker.png", import.meta.url)), fullPage: true });
  await page.getByRole("button", { name: "desktop preview" }).click();
  await expect(screenshotPicker).toHaveCount(0);

  await previewAt("Article template", "Ship a client site in an afternoon", "/blog/ship-a-client-site-in-an-afternoon");
  await previewAt("Author template", "Nico de Wet", "/authors/nico-de-wet");
  await previewAt("Product category template", "Apps", "/shop/category/apps");
  await previewAt("Article category template", "Guides", "/blog/category/guides");
  const categoryPicker = await openPagePicker(page);
  await categoryPicker.getByRole("searchbox", { name: "Search picker pages" }).fill("Case studies");
  await categoryPicker.getByRole("button", { name: "Preview item Case studies", exact: true }).click();
  await expect.poll(() => iframe.evaluate((element) => new URL(element.src).pathname)).toBe("/blog/category/case-studies");

  await previewAt("Product template", "Web App (Astro Static Site)", "/shop/web-app");
  const templateCopy = canvas.locator('[data-static-field="product-template.what_you_get"]');
  await expect(templateCopy).toBeVisible();
  await templateCopy.click();
  const selectedField = page.locator("#selected-text");
  await expect(selectedField).toHaveValue("What you get");

  const boundTitle = canvas.locator('h1[data-cms-bound="products.title"]');
  await expect(boundTitle).toBeVisible();
  await boundTitle.click();
  await boundTitle.dblclick();
  await expect(page.getByLabel("Main component editing")).toBeVisible();
  await expect(selectedField).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Content inspector" }).getByText(/This CMS content is read-only in the designer/i)).toBeVisible();
  await page.getByRole("button", { name: "Done editing component" }).click();
  await expect(boundTitle).not.toHaveAttribute("contenteditable");
  await templateCopy.click();
  const templateField = page.locator("textarea#selected-text");
  await expect(templateField).toHaveValue("What you get");
  await expect(page.getByLabel("Editing scope", { exact: true })).toHaveText("All pages using Product template");

  const editedCopy = "What the product page includes (E2E draft)";
  await templateField.fill(editedCopy);
  await expect(templateCopy).toHaveText(editedCopy);

  await openCurrentPageDetails(page);
  const panel = page.getByRole("complementary", { name: "Page details" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/Collection fields are edited in CMS\./)).toBeVisible();
  const detailCopy = panel.getByLabel(/what you get/i);
  await expect(detailCopy).toHaveValue(editedCopy);
  const editedDetail = "What the product page includes after details editing (E2E)";
  await detailCopy.fill(editedDetail);
  await expect(templateCopy).toHaveText(editedDetail);
  await expectReviewState(page, true);
  await canvas.locator("body").evaluate((element) => element.ownerDocument.getSelection()?.removeAllRanges());
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-template-details.png", import.meta.url)), fullPage: true });

  await openReview(page);
  await expect(page.getByText("One commit to test/site on content.")).toBeVisible();
  await page.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByText("Pushed to GitHub", { exact: true })).toBeVisible();
  await expect(page.getByText("Your hosting service can now rebuild the site. View the commit in GitHub connection details.", { exact: true })).toBeVisible();
  await expectReviewState(page, false);
  await expect(detailCopy).toHaveValue(editedDetail);

  await page.reload();
  await openDesignerTab(page);
  await choosePage(page, "Product template");
  await choosePreviewItem(page, "Web App (Astro Static Site)");
  await expect(canvas.locator('[data-static-field="product-template.what_you_get"]')).toHaveText(editedDetail);
  await openCurrentPageDetails(page);
  const reloadedPanel = page.getByRole("complementary", { name: "Page details" });
  await expect(reloadedPanel.getByLabel(/what you get/i)).toHaveValue(editedDetail);
});

test("content stays selection-only when a CMS template has no preview items", async ({ page }) => {
  await page.route("**/api/cms/collections/products/records**", async (route) => {
    const response = await route.fetch();
    const payload = await response.json() as { data: { records: unknown[]; total: number } };
    payload.data.records = [];
    payload.data.total = 0;
    await route.fulfill({ response, json: payload });
  });
  await signInAndOpenDesigner(page);
  await choosePage(page, "Product template");
  await expect(page.getByRole("heading", { name: "No CMS items to preview" })).toBeVisible();
  await expect(page.locator('iframe[title="Website canvas"]')).toHaveCount(0);
  const picker = await openPagePicker(page);
  await picker.getByRole("button", { name: "Browse collection items", exact: true }).click();
  await expect(picker.getByText("No CMS items.", { exact: true })).toBeVisible();
  await expect(picker.getByRole("button", { name: /^Preview item / })).toHaveCount(0);
  await page.keyboard.press("Escape");
  const content = page.getByRole("complementary", { name: "Content inspector" });
  await expect(content).toBeVisible();
  await expect(content.getByRole("searchbox")).toHaveCount(0);
  await expect(content.getByRole("button", { name: /Edit .*:/i })).toHaveCount(0);
  await expect(content.locator("#selected-text")).toHaveCount(0);
});

test("a GitHub update during a browser draft blocks a stale push", async ({ page, request }) => {
  await signInAndOpenDesigner(page);
  const hero = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]');
  await expect(hero).toBeVisible();
  await hero.click();
  await page.locator("#selected-text").fill(firstEdit);

  const homePath = "packages/static-content/src/documents/home.json";
  const updatedContent = JSON.parse(readFileSync(new URL(`../../../../../${homePath}`, import.meta.url), "utf8")) as Record<string, unknown>;
  const heroSection = updatedContent.hero_section as Record<string, string>;
  heroSection.display_1 = "Changed from GitHub while this draft was open.";
  const externalChange = await request.post("http://127.0.0.1:5380/__e2e/external-change", {
    data: { path: homePath, content: `${JSON.stringify(updatedContent, null, 2)}\n` }
  });
  expect(externalChange.ok()).toBeTruthy();

  await openReview(page);
  await page.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByRole("alert")).toContainText("A page changed on GitHub since you started editing");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expectReviewState(page, true);
  await expect(hero).toHaveText(firstEdit);
});

test("the Publish menu centralizes source actions and preserves drafts when reloading", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  await page.locator("#selected-text").fill(firstEdit);

  const toolbar = page.getByLabel("Canvas toolbar", { exact: true });
  const publish = page.getByRole("button", { name: "Publish", exact: true });
  const viewSite = page.getByRole("link", { name: "View site" });
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Choose page" })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Design mode" })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Preview mode" })).toBeVisible();
  await expect(toolbar.getByLabel("mobile preview")).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Discard drafts" })).toBeEnabled();
  await expect(publish).toBeVisible();
  await expect(viewSite).toBeVisible();
  await expect(page.getByText("Click to select · double-click text to edit")).toHaveCount(0);
  await expect(page.locator(".designer-workspace footer")).toHaveCount(0);
  const publishBounds = (await publish.boundingBox())!;
  const viewSiteBounds = (await viewSite.boundingBox())!;
  const publishCenterY = publishBounds.y + publishBounds.height / 2;
  const viewSiteCenterY = viewSiteBounds.y + viewSiteBounds.height / 2;
  expect(Math.abs(publishCenterY - viewSiteCenterY)).toBeLessThan(2);
  const canvasTop = (await page.locator('iframe[title="Website canvas"]').boundingBox())!.y;
  expect(publishBounds.y).toBeLessThan(canvasTop);
  await expect(page.getByRole("button", { name: "GitHub connection" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reload from source" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Review & push" })).toHaveCount(0);

  const menu = await openPublishing(page);
  await expect(menu.getByText("test/site", { exact: true })).toBeVisible();
  await expect(menu.getByText("content", { exact: true })).toBeVisible();
  await expect(menu.getByText(/^\d+ queued CMS records?$/)).toBeVisible();
  await expect(menu.getByRole("button", { name: "GitHub connection" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Reload from source" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Review & push" })).toBeEnabled();
  await expect(menu.getByRole("button", { name: "Review & publish" })).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-publish-menu.png", import.meta.url)), fullPage: true });

  await menu.getByRole("button", { name: "GitHub connection" }).click();
  const dialog = page.getByRole("dialog", { name: "GitHub connection" });
  await expect(dialog.getByRole("heading", { name: "Connected to GitHub" })).toBeVisible();
  await expect(dialog.getByText("GitHub repository", { exact: true })).toBeVisible();
  await expect(dialog.getByText("test/site", { exact: true })).toBeVisible();
  await expect(dialog.getByText("content", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Workspace administrator", { exact: true })).toBeVisible();
  await dialog.getByText(/Registered content files/).click();
  await expect(dialog.getByText("packages/static-content/src/documents/home.json", { exact: true })).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-github-connection.png", import.meta.url)), fullPage: true });
  await dialog.getByRole("button", { name: "Close" }).click();

  const reopened = await openPublishing(page);
  await reopened.getByRole("button", { name: "Reload from source" }).click();
  await expect(hero).toHaveText(firstEdit);
  await hero.click();
  await expect(page.locator("#selected-text")).toHaveValue(firstEdit);
  await expectReviewState(page, true);
});

test("disconnected GitHub workspace lets editors review but disables pushing", async ({ page }) => {
  await page.route("**/api/editor/content", async (route) => {
    const response = await route.fetch();
    const payload = await response.json() as { ok: boolean; data: { connected: boolean; repository: string | null; branch: string | null; source?: string; headSha?: string | null; connectionMode?: string } };
    payload.data.connected = false;
    payload.data.repository = null;
    payload.data.branch = null;
    payload.data.source = "local";
    payload.data.headSha = null;
    payload.data.connectionMode = "none";
    await route.fulfill({ response, json: payload });
  });
  await signInAndOpenDesigner(page);
  await (await openPublishing(page)).getByRole("button", { name: "GitHub connection" }).click();
  const connection = page.getByRole("dialog", { name: "GitHub connection" });
  await expect(connection.getByRole("heading", { name: "GitHub not connected" })).toBeVisible();
  await expect(connection.getByText("Bundled demo content", { exact: true })).toBeVisible();
  await expect(connection.getByText("Not connected", { exact: true })).toBeVisible();
  await connection.getByRole("button", { name: "Close" }).click();
  const hero = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  await page.locator("#selected-text").fill(firstEdit);
  const review = await openReview(page);
  await expect(review).toContainText("GitHub is not connected.");
  await expect(page.getByRole("button", { name: "Push to GitHub" })).toBeDisabled();
});

test("page and item icons communicate publication state and unsaved changes", async ({ page }) => {
  let homeStatus: "published" | "draft" = "published";
  await page.route("**/api/cms/collections/page-settings/records**", async (route) => {
    const response = await route.fetch();
    const payload = await response.json() as { data: { records: Array<{ values: Record<string, unknown>; publishStatus: string }> } };
    for (const record of payload.data.records) {
      if (record.values.pagePath === "/") record.publishStatus = homeStatus;
      if (record.values.pagePath === "/about") record.publishStatus = "draft";
    }
    await route.fulfill({ response, json: payload });
  });

  await signInAndOpenDesigner(page);
  await page.getByRole("button", { name: "Pages panel" }).click();
  const pages = page.getByRole("complementary", { name: "Pages" });
  const home = pages.getByRole("navigation", { name: "Static pages" }).getByRole("button").filter({ hasText: "Home" });
  const white = "rgb(239, 239, 238)";
  const blue = "rgb(32, 100, 236)";
  const orange = "rgb(231, 161, 90)";

  await expectPageState(home, "published", "Published", white);
  const initialPicker = await openPagePicker(page);
  const pickerHome = initialPicker.getByRole("button", { name: "Open page Home", exact: true });
  await expectPageState(pickerHome, "published", "Published", white);
  await expect(initialPicker.getByRole("button", { name: "Open page Product template", exact: true }).locator("svg.lucide-database")).toHaveCount(1);
  await page.keyboard.press("Escape");

  const hero = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  await page.locator("#selected-text").fill(firstEdit);
  await expectPageState(home, "changed", "Changes", blue);
  await expectPageState(page.getByRole("button", { name: "Choose page" }), "changed", "Changes", blue);
  const changedPicker = await openPagePicker(page);
  await expectPageState(changedPicker.getByRole("button", { name: "Open page Home", exact: true }), "changed", "Changes", blue);
  await expectPageState(pages.getByRole("navigation", { name: "Static pages" }).getByRole("button").filter({ hasText: "About" }), "draft", "Draft", orange);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-page-states.png", import.meta.url)), fullPage: true });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Discard drafts" }).click();
  await page.getByRole("alertdialog", { name: "Discard drafts?" }).getByRole("button", { name: "Discard drafts" }).click();
  await expectPageState(home, "published", "Published", white);

  homeStatus = "draft";
  await page.reload();
  await openDesignerTab(page);
  await page.getByRole("button", { name: "Pages panel" }).click();
  const reloadedPages = page.getByRole("complementary", { name: "Pages" });
  const reloadedHome = reloadedPages.getByRole("navigation", { name: "Static pages" }).getByRole("button").filter({ hasText: "Home" });
  await expectPageState(reloadedHome, "draft", "Draft", orange);
  const draftPicker = await openPagePicker(page);
  await expectPageState(draftPicker.getByRole("button", { name: "Open page Home", exact: true }), "draft", "Draft", orange);
  await page.keyboard.press("Escape");

  const reloadedHero = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]');
  await reloadedHero.click();
  await page.locator("#selected-text").fill(directEdit);
  await expectPageState(reloadedHome, "changed", "Changes", blue);
  await expectPageState(page.getByRole("button", { name: "Choose page" }), "changed", "Changes", blue);
  await page.getByRole("button", { name: "Discard drafts" }).click();
  await page.getByRole("alertdialog", { name: "Discard drafts?" }).getByRole("button", { name: "Discard drafts" }).click();
  await expectPageState(reloadedHome, "draft", "Draft", orange);

  await choosePage(page, "Product template");
  const productPicker = await openPagePicker(page);
  const productTemplate = productPicker.getByRole("button", { name: "Open page Product template", exact: true });
  await expect(productTemplate.locator("svg.lucide-database")).toHaveCount(1);
  const templateSidebar = reloadedPages.getByRole("navigation", { name: "CMS pages" }).getByRole("button").filter({ hasText: "Product template" });
  await expect(templateSidebar).toHaveAttribute("data-page-state", "saved");
  await expect(templateSidebar).toHaveClass(/text-violet-400/);
  const savedTemplateColor = await templateSidebar.evaluate((element) => getComputedStyle(element).color);
  await expect(templateSidebar.locator("span").first()).toHaveCSS("color", savedTemplateColor);
  await expect(templateSidebar.locator("svg.lucide-database")).toHaveCSS("color", savedTemplateColor);
  await productPicker.getByRole("button", { name: "Browse collection items", exact: true }).click();
  const publishedItem = productPicker.getByRole("button", { name: "Preview item Web App (Astro Static Site)", exact: true });
  await expectPageState(publishedItem, "published", "Published", white);
  await expect(publishedItem.locator("svg.lucide-database")).toHaveCount(1);
  const draftItem = productPicker.getByRole("button", { name: "Preview item Studio Theme", exact: true });
  await expectPageState(draftItem, "draft", "Draft", orange);
  await expect(draftItem.locator("svg.lucide-database")).toHaveCount(1);
  await draftItem.click();
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Studio Theme");
  await expectPageState(page.getByRole("button", { name: "Choose page" }), "draft", "Draft", orange);

  const productCopy = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="product-template.what_you_get"]');
  await productCopy.click();
  const selectedTemplateCopy = page.locator("#selected-text");
  await expect(selectedTemplateCopy).toBeVisible();
  await selectedTemplateCopy.fill("Edited template copy with a browser draft");
  await expectPageState(templateSidebar, "changed", "Changes", blue);
  await expectPageState(page.getByRole("button", { name: "Choose page" }), "changed", "Changes", blue);
  await page.getByRole("button", { name: "Discard drafts" }).click();
  await page.getByRole("alertdialog", { name: "Discard drafts?" }).getByRole("button", { name: "Discard drafts" }).click();
  await expectPageState(templateSidebar, "saved", "Saved", savedTemplateColor);
  await expect(templateSidebar).toHaveClass(/text-violet-400/);
  await expectPageState(page.getByRole("button", { name: "Choose page" }), "draft", "Draft", orange);
});

test("publication requires saved page details and preserves unsaved edits", async ({ page }) => {
  const aboutStatus = "queued_to_publish";
  await page.route("**/api/cms/collections/page-settings/records**", async (route) => {
    const response = await route.fetch();
    const payload = await response.json() as { data?: { records?: Array<{ values: Record<string, unknown>; publishStatus: string }> } };
    for (const record of payload.data?.records ?? []) {
      if (record.values.pagePath === "/") record.publishStatus = "published";
      if (record.values.pagePath === "/about") record.publishStatus = aboutStatus;
    }
    await route.fulfill({ response, json: payload });
  });
  await signInAndOpenDesigner(page);
  await page.getByRole("button", { name: "Pages panel" }).click();
  const pages = page.getByRole("complementary", { name: "Pages" });
  const staticPages = pages.getByRole("navigation", { name: "Static pages" });
  const home = staticPages.getByRole("button").filter({ hasText: "Home" });
  const about = staticPages.getByRole("button").filter({ hasText: "About" });
  await expectPageState(about, "draft", "Queued to publish", "rgb(231, 161, 90)");

  await openCurrentPageDetails(page);
  const details = page.getByRole("complementary", { name: "Page details" });
  const homeName = details.getByLabel("Page name");
  await expect(homeName).toBeVisible();
  await expect(details.getByLabel("Page path")).toHaveValue("/");
  await homeName.fill("Home details draft preserved through publish");
  await expectPageState(home, "changed", "Changes", "rgb(32, 100, 236)");

  const publishing = await openPublishing(page);
  await expect(publishing.getByRole("button", { name: "Review & publish" })).toBeDisabled();
  await expect(publishing.getByText("Save or discard the open record/settings edits before reviewing publication.")).toBeVisible();
  await expect(homeName).toHaveValue("Home details draft preserved through publish");
  await expectPageState(home, "changed", "Changes", "rgb(32, 100, 236)");
  await expectPageState(about, "draft", "Queued to publish", "rgb(231, 161, 90)");
  await publishing.getByRole("button", { name: "Close publishing" }).click();

  await details.getByRole("button", { name: "Close page details" }).click();
  const discardDetails = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
  await expect(discardDetails).toBeVisible();
  await discardDetails.getByRole("button", { name: "Discard" }).click();
  await expect(details).toHaveCount(0);
});

test("Tailwind design drafts configure component properties, shared parts, custom CSS and GitHub readback", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const heroButton = canvas.locator('[data-editor-component="Button.Link"][data-editor-instance="home.hero_section.href_3"]');
  const closingButton = canvas.locator('[data-editor-component="Button.Link"][data-editor-instance="home.cta_section.href_2"]');
  await heroButton.click();
  const properties = page.getByRole("complementary", { name: "Component properties" });
  await expect(properties).toBeVisible();
  await expect(page.getByRole("button", { name: "Style panel" })).toHaveCount(0);
  await properties.getByRole("combobox", { name: "Component variant" }).selectOption("secondary");
  await expect(heroButton).toHaveClass(/border-line-strong/);
  await expect(closingButton).toHaveClass(/border-surface/);
  await properties.getByRole("combobox", { name: "Component size" }).selectOption("sm");
  await expect(heroButton).toHaveClass(/px-\[17px\]/);
  const variantLabel = properties.locator('label[for="component-property-variant"]');
  const sizeLabel = properties.locator('label[for="component-property-size"]');
  await expect(variantLabel).toHaveClass(/text-cms-accent/);
  await expect(sizeLabel).toHaveClass(/text-cms-accent/);
  await properties.getByRole("button", { name: "Reset variant to source" }).click();
  await expect(properties.getByRole("combobox", { name: "Component variant" })).toHaveValue("primary");
  await expect(properties.getByRole("combobox", { name: "Component size" })).toHaveValue("sm");
  await expect(variantLabel).toHaveClass(/text-cms-muted/);
  await expect(properties.getByRole("button", { name: "Reset variant to source" })).toHaveCount(0);
  await sizeLabel.click({ modifiers: ["Alt"] });
  await expect(properties.getByRole("combobox", { name: "Component size" })).toHaveValue("lg");
  await expect(sizeLabel).toHaveClass(/text-cms-muted/);
  await expect(properties.getByRole("button", { name: "Reset size to source" })).toHaveCount(0);
  await properties.getByRole("combobox", { name: "Component variant" }).selectOption("secondary");
  await properties.getByRole("combobox", { name: "Component size" }).selectOption("sm");
  const text = properties.getByRole("textbox", { name: "Component Text", exact: true });
  const sourceText = await text.inputValue();
  await text.fill("Edited button text");
  await expect(heroButton).toContainText("Edited button text");
  await properties.getByRole("button", { name: "Reset Text to source" }).click();
  await expect(text).toHaveValue(sourceText);
  await expect(properties.getByRole("combobox", { name: "Component variant" })).toHaveValue("secondary");
  const editMain = properties.getByRole("button", { name: "Edit main component" });
  await editMain.hover();
  await expect(page.getByText("Edit main component. Changes inside it apply to all instances.", { exact: true })).toBeVisible();
  const href = properties.getByRole("textbox", { name: "href", exact: true });
  await href.fill("javascript:alert(1)");
  await href.press("Enter");
  await expect(href).toHaveAttribute("aria-invalid", "true");
  await expect(heroButton).toHaveAttribute("href", "/shop");
  await href.press("Escape");
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-component-properties.png", import.meta.url)), fullPage: true });
  await properties.getByRole("button", { name: "Edit main component" }).click();
  await expect(page.getByLabel("Main component editing")).toContainText("Changes apply to all instances");
  await heroButton.locator('[data-editor-part="label"]').click();
  const styles = page.getByRole("complementary", { name: "Style inspector" });
  await styles.getByRole("combobox", { name: "Style breakpoint" }).selectOption("base");
  await styles.getByRole("combobox", { name: "Font size", exact: true }).selectOption("text-h3");
  await expect(heroButton.locator('[data-editor-part="label"]')).toHaveClass(/text-h3/);
  await expect(closingButton.locator('[data-editor-part="label"]')).toHaveClass(/text-h3/);
  await page.getByRole("button", { name: "Done editing component" }).click();
  await expect(properties).toBeVisible();
  await expect(properties.getByRole("combobox", { name: "Component variant" })).toHaveValue("secondary");

  const navigator = page.getByRole("complementary", { name: "Navigator" });
  await navigator.getByRole("searchbox", { name: "Search elements" }).fill("Hero");
  await navigator.getByRole("treeitem", { name: "Component: Hero, div, nested element", exact: true }).click();
  await properties.getByRole("button", { name: "Edit main component" }).click();
  const hero = canvas.locator('[data-editor-component="HeroSection"]');
  await styles.getByRole("combobox", { name: "Padding bottom", exact: true }).selectOption("pb-12");
  await expect(hero).toHaveClass(/pb-12/);
  await expect(hero).not.toHaveClass(/(?:^|\s)pb-8(?:\s|$)/);
  await expect(hero).not.toHaveAttribute("style");
  await styles.getByRole("combobox", { name: "Style breakpoint" }).selectOption("tablet");
  await styles.getByRole("combobox", { name: "Padding bottom", exact: true }).selectOption("pb-24");
  await expect(hero).toHaveClass(/tablet:pb-24/);
  await styles.getByText("Reusable custom CSS", { exact: true }).click();
  await styles.getByRole("textbox", { name: "Custom selector" }).fill(".editor-callout");
  await styles.getByRole("textbox", { name: "CSS declarations" }).fill("margin-bottom: 16px; color: var(--color-ink);");
  await styles.getByRole("button", { name: "Save and apply class" }).click();
  await expect(hero).toHaveClass(/editor-callout/);
  await expect(hero).toHaveCSS("margin-bottom", "16px");
  await styles.getByRole("textbox", { name: "CSS declarations" }).fill("background-color: url(https://example.com);");
  await styles.getByRole("button", { name: "Save and apply class" }).click();
  await expect(styles.getByRole("alert")).toContainText("unsupported");

  const review = await openReview(page);
  await expect(review).toContainText("Site design");
  await expect(review).toContainText("pb-12");
  await review.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(review).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Pushed to GitHub");
  const publishing = await openPublishing(page);
  await publishing.getByRole("button", { name: "Reload from source" }).click();
  await expect(hero).toHaveClass(/pb-12/);
  await expect(hero).toHaveClass(/tablet:pb-24/);
  await expect(hero).toHaveCSS("margin-bottom", "16px");
  await expect(heroButton).toHaveClass(/px-\[17px\]/);
  await expect(heroButton.locator('[data-editor-part="label"]')).toHaveClass(/text-h3/);
  await expectReviewState(page, false);
  await heroButton.click();
  await properties.getByRole("combobox", { name: "Component size" }).selectOption("lg");
  await page.reload();
  await openDesignerTab(page);
  await expect(heroButton).toHaveClass(/px-7/);
  await expectReviewState(page, true);
  await page.getByRole("button", { name: "Discard drafts" }).click();
  await page.getByRole("alertdialog", { name: "Discard drafts?" }).getByRole("button", { name: "Discard drafts" }).click();
  await expect(heroButton).toHaveClass(/px-\[17px\]/);
  await expect(hero).toHaveClass(/pb-12/);
  await expectReviewState(page, false);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-tailwind-components.png", import.meta.url)), fullPage: true });
});

test("editor history groups typing, spans pages, preserves native input undo and routes canvas shortcuts", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  const text = page.locator("#selected-text");
  const homeSource = await text.inputValue();
  const undo = page.getByRole("button", { name: "Undo edit", exact: true });
  const redo = page.getByRole("button", { name: "Redo edit", exact: true });
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await expect(page.getByLabel("Editing scope", { exact: true })).toHaveText("This page");
  await text.fill("History headline");
  await text.press("End");
  await text.pressSequentially(" with native typing");
  const typed = await text.inputValue();
  await text.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
  await expect(text).not.toHaveValue(typed);
  // Native input undo changes the field; it must not open the editor's redo stack.
  await expect(redo).toBeDisabled();
  await undo.click();
  await expect(hero).toHaveText(homeSource);
  await expect(undo).toBeDisabled();
  await redo.click();
  await expect(hero).not.toHaveText(homeSource);
  await text.fill("Home history transaction");
  await hero.dblclick();
  await hero.fill("Inline history transaction");
  await hero.press("Enter");
  await expect(hero).toHaveText("Inline history transaction");
  await undo.click();
  await expect(hero).toHaveText("Home history transaction");
  await redo.click();
  await expect(hero).toHaveText("Inline history transaction");
  await undo.click();
  await choosePage(page, "About");
  const about = canvas.locator('[data-static-field="about.about.title_5"]');
  await about.click();
  const aboutSource = await text.inputValue();
  await text.fill("About history transaction");
  await expect(redo).toBeDisabled();
  await about.click();
  await about.press("Control+z");
  await expect(about).toHaveText(aboutSource);
  const draftsAfterUndo = await page.evaluate(() => Object.entries(localStorage).filter(([key]) => key.startsWith("three-acts:editor:drafts:v1:")).map(([, value]) => JSON.parse(value)));
  expect(draftsAfterUndo.some(drafts => drafts.home?.content.hero_section.display_1 === "Home history transaction" && !drafts.about)).toBe(true);
  await about.press("Control+Shift+z");
  await expect(about).toHaveText("About history transaction");
  await page.getByRole("button", { name: "Preview mode" }).click();
  await expect(undo).toBeDisabled();
  await about.press("Control+z");
  await expect(about).toHaveText("About history transaction");
  await page.getByRole("button", { name: "Design mode" }).click();
  const review = await openReview(page);
  await expect(review).toContainText("Home history transaction");
  await expect(review).toContainText("About history transaction");
  await expect(page.locator('[aria-label="Undo edit"]')).toBeDisabled();
  await review.getByRole("button", { name: "Keep editing" }).click();
  await choosePage(page, "Home");
  await expect(hero).toHaveText("Home history transaction");
  await page.getByRole("button", { name: "Discard drafts", exact: true }).click();
  await page.getByRole("alertdialog", { name: "Discard drafts?" }).getByRole("button", { name: "Discard drafts" }).click();
  await expect(hero).toHaveText(homeSource);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await expect(page.getByLabel("Draft save state", { exact: true })).toHaveText("Source loaded");
});

test("editor history reverses individual variants, resets and utilities and clears at source baselines", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const button = canvas.locator('[data-editor-component="Button.Link"][data-editor-instance="home.hero_section.href_3"]');
  await button.click();
  const properties = page.getByRole("complementary", { name: "Component properties" });
  const variant = properties.getByRole("combobox", { name: "Component variant" });
  const size = properties.getByRole("combobox", { name: "Component size" });
  const undo = page.getByRole("button", { name: "Undo edit", exact: true });
  const redo = page.getByRole("button", { name: "Redo edit", exact: true });
  const originalVariant = await variant.inputValue();
  const originalSize = await size.inputValue();
  const changedVariant = originalVariant === "ghost" ? "inverse" : "ghost";
  const changedSize = originalSize === "sm" ? "md" : "sm";
  await variant.selectOption(changedVariant);
  await size.selectOption(changedSize);
  await undo.click();
  await expect(size).toHaveValue(originalSize);
  await expect(variant).toHaveValue(changedVariant);
  await redo.click();
  await expect(size).toHaveValue(changedSize);
  await properties.getByRole("button", { name: "Reset variant to source" }).click();
  await expect(variant).toHaveValue("primary");
  await undo.click();
  await expect(variant).toHaveValue(changedVariant);
  const text = properties.getByRole("textbox", { name: "Component Text", exact: true });
  const sourceText = await text.inputValue();
  await text.fill(`${sourceText} changed before Alt-reset`);
  await properties.locator('label[for="component-home-hero_section.link_4"]').click({ modifiers: ["Alt"] });
  await expect(text).toHaveValue(sourceText);
  await undo.click();
  await expect(text).toHaveValue(`${sourceText} changed before Alt-reset`);
  await redo.click();
  await expect(text).toHaveValue(sourceText);
  await expect(variant).toHaveValue(changedVariant);
  const cta = canvas.locator('[data-editor-id="source.cta-section.1"]');
  await cta.click({ position: { x: 1, y: 1 } });
  await page.getByRole("button",{name:"Style panel",exact:true}).click();
  const styles = page.getByRole("complementary", { name: "Style inspector" });
  await styles.getByRole("combobox", { name: "Style breakpoint" }).selectOption("tablet");
  await styles.getByRole("combobox", { name: "Padding bottom", exact: true }).selectOption("pb-24");
  await expect(cta).toHaveClass(/tablet:pb-24/);
  await undo.click();
  await expect(cta).not.toHaveClass(/tablet:pb-24/);
  await expect(button).toHaveClass(changedVariant === "ghost" ? /border-transparent/ : /border-surface/);
  await redo.click();
  await expect(cta).toHaveClass(/tablet:pb-24/);
  await styles.locator('label[for="utility-paddingBottom"]').click({ modifiers: ["Alt"] });
  await expect(cta).not.toHaveClass(/tablet:pb-24/);
  await undo.click();
  await expect(cta).toHaveClass(/tablet:pb-24/);
  await styles.getByText("Reusable custom CSS", { exact: true }).click();
  await styles.getByRole("textbox", { name: "Custom selector" }).fill(".history-callout");
  await styles.getByRole("textbox", { name: "CSS declarations" }).fill("margin-bottom: 24px;");
  await styles.getByRole("button", { name: "Save and apply class" }).click();
  await expect(cta).toHaveClass(/history-callout/);
  await expect(cta).toHaveCSS("margin-bottom", "24px");
  await undo.click();
  await expect(cta).not.toHaveClass(/history-callout/);
  await expect(cta).toHaveClass(/tablet:pb-24/);
  await redo.click();
  await expect(cta).toHaveClass(/history-callout/);
  await expect(cta).toHaveCSS("margin-bottom", "24px");
  await expect(page.getByLabel("Draft save state", { exact: true })).toContainText("Saved in this browser");
  const publishing = await openPublishing(page);
  await publishing.getByRole("button", { name: "Reload from source" }).click();
  await expect(cta).toHaveClass(/tablet:pb-24/);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await button.click();
  await size.selectOption(changedSize === "md" ? "sm" : "md");
  const review = await openReview(page);
  await review.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(review).toHaveCount(0);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await expect(page.getByLabel("Draft save state", { exact: true })).toHaveText("Committed to GitHub");
});

test("storage and push failures retain history with visible unsaved state", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  const text = page.locator("#selected-text");
  const source = await text.inputValue();
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith("three-acts:editor:drafts:v1:")) throw new DOMException("Storage full", "QuotaExceededError");
      return write.call(this, key, value);
    };
  });
  await text.fill("Draft survives storage failure");
  await expect(page.getByLabel("Draft save state", { exact: true })).toHaveText("Not saved in this browser");
  const undo = page.getByRole("button", { name: "Undo edit", exact: true });
  const redo = page.getByRole("button", { name: "Redo edit", exact: true });
  await undo.click();
  await expect(hero).toHaveText(source);
  await redo.click();
  await expect(hero).toHaveText("Draft survives storage failure");
  await page.route("**/api/editor/push", route => route.fulfill({ status: 500, contentType: "application/json", json: { ok: false, error: { code: "server_error", message: "History push failure fixture" } } }));
  const review = await openReview(page);
  await review.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(review.getByRole("alert")).toContainText("History push failure fixture");
  await review.getByRole("button", { name: "Keep editing" }).click();
  await undo.click();
  await expect(hero).toHaveText(source);
  await redo.click();
  await expect(hero).toHaveText("Draft survives storage failure");
});

async function openBoundCmsSource(page: import("@playwright/test").Page, element: import("@playwright/test").Locator, collection: string, field: string, expectFetch = true) {
  const id = await element.getAttribute("data-cms-item-id");
  expect(id).toBeTruthy();
  await element.click();
  const source = page.getByRole("region", { name: "CMS source", exact: true });
  await expect(source).toBeVisible();
  await source.getByText("Source identity", { exact: true }).click();
  await expect(source.locator("code")).toContainText(`${collection} / ${id} / ${field}`);
  const response = expectFetch ? page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === `/api/cms/collections/${collection}/records/${encodeURIComponent(id!)}`) : null;
  await source.getByRole("button", { name: "Edit CMS item" }).click();
  await response;
  const editor = page.locator(`[data-cms-record-editor="${id}"][data-cms-collection="${collection}"]`);
  await expect(editor).toBeVisible();
  const selectedField = editor.locator(`[data-cms-field="${field.split(".")[0]}"]`);
  await expect(selectedField).toBeVisible();
  return editor;
}

test("CMS handoff opens exact product/category fields and returns with drafts, selection and history", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  const sourceHeadline = await page.locator("#selected-text").inputValue();
  await page.locator("#selected-text").fill("Canvas draft retained through CMS handoff");
  await choosePage(page, "Product template");
  await choosePreviewItem(page, "Web App (Astro Static Site)");
  const title = canvas.locator('h1[data-cms-bound="products.title"]');
  const publishedTitle = await title.textContent();
  const id = await title.getAttribute("data-cms-item-id");
  const editor = await openBoundCmsSource(page, title, "products", "title");
  await expect(editor.locator('[data-cms-field="title"]').getByRole("textbox")).toBeFocused();
  await expect(editor.getByLabel("Canvas source status", { exact: true })).toContainText("Saving does not publish");
  await editor.locator('[data-cms-field="title"]').getByRole("textbox").fill("Unsaved product handoff draft");
  await editor.getByRole("button", { name: "Back to canvas" }).click();
  const guard = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(editor.locator('[data-cms-field="title"]').getByRole("textbox")).toHaveValue("Unsaved product handoff draft");
  await editor.getByRole("button", { name: "Back to canvas" }).click();
  await guard.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(title).toHaveAttribute("data-editor-selected", "");
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Web App (Astro Static Site)");
  await expect(title).toHaveText(publishedTitle!);
  // Reopening the same cached record must not revive the discarded CMS draft.
  const reopened = await openBoundCmsSource(page, title, "products", "title", false);
  await expect(reopened.locator('[data-cms-field="title"]').getByRole("textbox")).toHaveValue(publishedTitle!);
  await reopened.locator('[data-cms-field="title"]').getByRole("textbox").fill("Saved product handoff draft");
  const savedResponse = page.waitForResponse(response => response.request().method() === "PUT" && new URL(response.url()).pathname === `/api/cms/collections/products/records/${encodeURIComponent(id!)}`);
  await reopened.getByRole("button", { name: "Save", exact: true }).click();
  const savedPayload = await (await savedResponse).json() as { data: { values: Record<string, unknown> } };
  expect(savedPayload.data.values.title).toBe("Saved product handoff draft");
  await expect(reopened.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  const liveResponse = await page.request.get("/api/content/collections/products/records");
  const livePayload = await liveResponse.json() as { data: { records: Array<{ id: string; values: Record<string, unknown> }> } };
  expect(livePayload.data.records.find(record => record.id === id)?.values.title).toBe(publishedTitle);
  await reopened.getByRole("button", { name: "Back to canvas" }).click();
  await expect(title).toHaveText(publishedTitle!);
  const category = canvas.locator('[data-cms-bound="product-categories.name"]').first();
  const categoryId = await category.getAttribute("data-cms-item-id");
  expect(categoryId).not.toBe(id);
  const categoryEditor = await openBoundCmsSource(page, category, "product-categories", "name");
  await expect(categoryEditor.locator('[data-cms-field="name"]').getByRole("textbox")).toBeFocused();
  await categoryEditor.getByRole("button", { name: "Back to canvas" }).click();
  await expect(category).toHaveAttribute("data-editor-selected", "");
  await choosePage(page, "Home");
  await expect(hero).toHaveText("Canvas draft retained through CMS handoff");
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(hero).toHaveText(sourceHeadline);
  await expectReviewState(page, false);
});

test("CMS handoff uses related article, author, FAQ and testimonial identities", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  await choosePage(page, "Article template");
  await choosePreviewItem(page, "Ship a client site in an afternoon");
  const related = canvas.locator('article [data-cms-bound="articles.title"]').last();
  const relatedId = await related.getAttribute("data-cms-item-id");
  const parentId = await canvas.locator('h1[data-cms-bound="articles.title"]').getAttribute("data-cms-item-id");
  expect(relatedId).not.toBe(parentId);
  const relatedEditor = await openBoundCmsSource(page, related, "articles", "title");
  await expect(relatedEditor.locator('[data-cms-field="title"]').getByRole("textbox")).toBeFocused();
  await relatedEditor.getByRole("button", { name: "Back to canvas" }).click();
  const mentioned = canvas.locator('[data-cms-bound="products.title"]').first();
  expect(await mentioned.getAttribute("data-cms-item-id")).not.toBe(parentId);
  await mentioned.click();
  const scrollBefore = await mentioned.evaluate(element => element.ownerDocument.defaultView!.scrollY);
  expect(scrollBefore).toBeGreaterThan(0);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-cms-source.png", import.meta.url)), fullPage: true });
  const mentionedEditor = await openBoundCmsSource(page, mentioned, "products", "title");
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-source-record.png", import.meta.url)), fullPage: true });
  await mentionedEditor.getByRole("button", { name: "Back to canvas" }).click();
  await expect(mentioned).toHaveAttribute("data-editor-selected", "");
  await expect.poll(() => mentioned.evaluate(element => element.ownerDocument.defaultView!.scrollY)).toBe(scrollBefore);
  const productImage = canvas.locator('[data-cms-bound="products.images"]').first();
  const mediaEditor = await openBoundCmsSource(page, productImage, "products", "images", false);
  await expect(mediaEditor.locator('[data-cms-field="images"]')).toBeVisible();
  await mediaEditor.getByRole("button", { name: "Back to canvas" }).click();
  const author = canvas.locator('a[data-cms-bound="authors.name"]').first();
  const authorEditor = await openBoundCmsSource(page, author, "authors", "name");
  await authorEditor.getByRole("button", { name: "Back to canvas" }).click();
  await choosePage(page, "FAQ");
  const question = canvas.locator('summary[data-cms-bound="faqs.question"]').nth(1);
  const faqEditor = await openBoundCmsSource(page, question, "faqs", "question");
  await expect(faqEditor.locator('[data-cms-field="question"]').getByRole("textbox")).toBeFocused();
  await faqEditor.getByRole("button", { name: "Back to canvas" }).click();
  await choosePage(page, "About");
  const quote = canvas.locator('blockquote[data-cms-bound="testimonials.quote"]').nth(1);
  const testimonialEditor = await openBoundCmsSource(page, quote, "testimonials", "quote");
  await expect(testimonialEditor.locator('[data-cms-field="quote"]').getByRole("textbox")).toBeFocused();
  await testimonialEditor.getByRole("button", { name: "Back to canvas" }).click();
  await expect(quote).toHaveAttribute("data-editor-selected", "");
});

test("CMS handoff guards page details and exposes missing-record recovery without losing canvas context", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const product = canvas.locator('[data-cms-bound="products.title"]').first();
  await product.click();
  await openCurrentPageDetails(page);
  const details = page.getByRole("complementary", { name: "Page details" });
  await details.getByLabel("Page name").fill("Unsaved details before handoff");
  const source = page.getByRole("region", { name: "CMS source", exact: true });
  await source.getByRole("button", { name: "Edit CMS item" }).click();
  const guard = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(details.getByLabel("Page name")).toHaveValue("Unsaved details before handoff");
  const id = await product.getAttribute("data-cms-item-id");
  await page.route(`**/api/cms/collections/products/records/${id}`, route => route.fulfill({ status: 404, contentType: "application/json", json: { ok: false, error: { code: "record_not_found", message: "This source record was removed." } } }));
  await source.getByRole("button", { name: "Edit CMS item" }).click();
  await guard.getByRole("button", { name: "Discard", exact: true }).click();
  const failure = page.getByRole("region", { name: "CMS record loading", exact: true });
  await expect(failure.getByRole("alert")).toContainText("This source record was removed");
  await expect(failure.getByRole("button", { name: "Retry record" })).toBeVisible();
  await page.unroute(`**/api/cms/collections/products/records/${id}`);
  await failure.getByRole("button", { name: "Retry record" }).click();
  const recovered = page.locator(`[data-cms-record-editor="${id}"]`);
  await expect(recovered).toBeVisible();
  await recovered.getByRole("button", { name: "Back to canvas" }).click();
  await expect(product).toHaveAttribute("data-editor-selected", "");
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Home");
  await expect(details).toHaveCount(0);
  // Incomplete legacy bindings do not invent the currently previewed record.
  await canvas.locator("body").evaluate(body => {
    const legacy = body.ownerDocument.createElement("p");
    legacy.dataset.cmsBound = "products.title";
    legacy.dataset.testid = "legacy-cms-source";
    legacy.textContent = "Legacy content without a record identity";
    body.append(legacy);
  });
  await canvas.locator('[data-testid="legacy-cms-source"]').click();
  await expect(source).toContainText("no registered record identity");
  await expect(source.getByRole("button", { name: "Edit CMS item" })).toHaveCount(0);
});

async function outlineItem(page: import("@playwright/test").Page, element: import("@playwright/test").Locator) {
  await expect(element).toHaveAttribute("data-three-acts-node", /^n\d+$/);
  const id = await element.getAttribute("data-three-acts-node");
  return page.locator(`[data-canvas-selector='[data-three-acts-node="${id}"]']`);
}

test("hidden Navigator reveals closed FAQ content and preserves the interaction through CMS handoff", async ({ page }) => {
  await signInAndOpenDesigner(page);
  await choosePage(page, "FAQ");
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const answers = canvas.locator('[data-cms-bound="faqs.answer"]');
  const answer = answers.nth(1);
  const disclosure = answer.locator("xpath=ancestor::details[1]");
  const originallyOpen = answers.first().locator("xpath=ancestor::details[1]");
  await expect(disclosure).toHaveJSProperty("open", false);
  await expect(originallyOpen).toHaveJSProperty("open", true);
  await originallyOpen.evaluate(details => details.setAttribute("name", "editor-test-faq"));
  await disclosure.evaluate(details => details.setAttribute("name", "editor-test-faq"));
  const navigator = page.getByRole("complementary", { name: "Navigator", exact: true });
  await navigator.getByRole("searchbox", { name: "Search elements" }).fill((await answer.getAttribute("data-cms-item-label"))!);
  const row = await outlineItem(page, answer);
  await expect(row.locator('[aria-label="Hidden element"]')).toBeVisible();
  await row.click();
  await expect(disclosure).toHaveJSProperty("open", true);
  await expect(answer).toBeVisible();
  await expect(originallyOpen).toHaveJSProperty("open", false);
  await expect(row).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("status", { name: "Selection visibility" })).toContainText("Temporarily revealed");
  const id = await answer.getAttribute("data-cms-item-id");
  await page.getByRole("region", { name: "CMS source", exact: true }).getByRole("button", { name: "Edit CMS item" }).click();
  const editor = page.locator(`[data-cms-record-editor="${id}"]`);
  await expect(editor.locator('[data-cms-field="answer"]').getByRole("textbox")).toBeFocused();
  await editor.getByRole("button", { name: "Back to canvas" }).click();
  await expect(disclosure).toHaveJSProperty("open", true);
  await expect(row).toHaveAttribute("aria-selected", "true");
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-hidden-faq.png", import.meta.url)), fullPage: true });
  await page.getByRole("button", { name: "Preview mode", exact: true }).click();
  await expect(disclosure).toHaveJSProperty("open", false);
  await expect(originallyOpen).toHaveJSProperty("open", true);
  await page.getByRole("button", { name: "Design mode", exact: true }).click();
  await row.click();
  await expect(disclosure).toHaveJSProperty("open", true);
  await canvas.locator('[data-static-field="faq.faq.title_2"]').click();
  await expect(disclosure).toHaveJSProperty("open", false);
  await expectReviewState(page, false);
});

test("hidden Navigator inspects responsive content and reveals mobile navigation without source layout changes", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const mobileNav = canvas.locator('nav[aria-label="Mobile"]');
  const menu = mobileNav.locator("xpath=ancestor::details[1]");
  const label = mobileNav.locator('[data-static-field="shared.navLinks.0.label"]');
  const sourceClasses = await menu.getAttribute("class");
  const navigator = page.getByRole("complementary", { name: "Navigator", exact: true });
  await navigator.getByRole("searchbox", { name: "Search elements" }).fill("Nav Links");
  const row = await outlineItem(page, label);
  await expect(row).toBeVisible();
  await row.click();
  await expect(menu).toHaveJSProperty("open", false);
  await expect(label).toBeHidden();
  await expect(page.getByRole("status", { name: "Selection visibility" })).toContainText("Hidden at this width");
  await page.getByRole("button", { name: "mobile preview", exact: true }).click();
  await expect(menu).toHaveJSProperty("open", true);
  await expect(label).toBeVisible();
  await expect(row).toHaveAttribute("aria-selected", "true");
  await page.locator("#selected-text").fill("Mobile navigation source edit");
  await expect(label).toHaveText("Mobile navigation source edit");
  await expect(canvas.locator('nav[aria-label="Primary"] [data-static-field="shared.navLinks.0.label"]')).toHaveText("Mobile navigation source edit");
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(label).toHaveText("Shop");
  await page.getByRole("button", { name: "Preview mode", exact: true }).click();
  await expect(menu).toHaveJSProperty("open", false);
  await expect(menu).toHaveAttribute("class", sourceClasses!);
  await page.getByRole("button", { name: "Design mode", exact: true }).click();
  await row.click();
  await expect(menu).toHaveJSProperty("open", true);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveJSProperty("open", false);
  await expect(page.getByLabel("Selected element", { exact: true })).toContainText("No selection");
  await expectReviewState(page, false);
});

test("hidden Navigator pages a bounded outline and keeps identity after DOM insertion, reorder and removal", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  await canvas.locator("body").evaluate(body => {
    const section = body.ownerDocument.createElement("section");
    section.dataset.testid = "large-outline";
    section.dataset.editorLabel = "Large outline fixture";
    const fragment = body.ownerDocument.createDocumentFragment();
    for (let index = 0; index < 6000; index++) {
      const row = body.ownerDocument.createElement("p");
      row.dataset.editorLabel = `Outline row ${index}`;
      row.dataset.testid = `outline-${index}`;
      row.textContent = `Fixture content ${index}`;
      fragment.append(row);
    }
    section.append(fragment); body.append(section);
  });
  const navigator = page.getByRole("complementary", { name: "Navigator", exact: true });
  const completeness = navigator.getByLabel("Navigator completeness", { exact: true });
  await expect(completeness).toContainText("Showing 400 of at least");
  const target = canvas.locator('[data-testid="outline-800"]');
  await target.click();
  const row = await outlineItem(page, target);
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("aria-selected", "true");
  const identity = await target.getAttribute("data-three-acts-node");
  await target.evaluate(element => {
    const sibling = element.ownerDocument.createElement("p");
    sibling.textContent = "Inserted sibling";
    element.before(sibling);
    element.parentElement!.prepend(element);
  });
  await expect(target).toHaveAttribute("data-three-acts-node", identity!);
  await expect(row).toHaveAttribute("aria-selected", "true");
  // A copied preview attribute is not allowed to impersonate a real DOM identity.
  await target.evaluate(element => {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.dataset.testid = "copied-identity";
    clone.dataset.editorLabel = "Copied identity fixture";
    clone.removeAttribute("data-editor-selected");
    element.parentElement!.append(clone);
  });
  // Clear selection removes pinned layers. Load the reordered source into the
  // regular outline page before testing another selection through its identity.
  await completeness.getByRole("button", { name: "Load more elements" }).click();
  await expect(completeness).toContainText("Showing 800");
  await page.keyboard.press("Escape");
  await expect(target).not.toHaveAttribute("data-editor-selected", "");
  await navigator.getByRole("searchbox", { name: "Search elements" }).fill("Outline row 800");
  await row.click();
  await expect(target).toHaveAttribute("data-editor-selected", "");
  await expect(canvas.locator('[data-testid="copied-identity"]')).not.toHaveAttribute("data-editor-selected", "");
  await navigator.getByRole("searchbox", { name: "Search elements" }).fill("Outline row 4500");
  for (let nextLimit = 1200; ; nextLimit = Math.min(5000, nextLimit + 400)) {
    await completeness.getByRole("button", { name: "Load more elements" }).click();
    await expect(completeness).toContainText(`Showing ${nextLimit}`);
    if (nextLimit === 5000) break;
  }
  await expect(completeness).toContainText("Outline safety limit reached");
  await expect(completeness.getByRole("button", { name: "Load more elements" })).toHaveCount(0);
  const outsideLimit = canvas.locator('[data-testid="outline-5500"]');
  await outsideLimit.click();
  await navigator.getByRole("searchbox", { name: "Search elements" }).fill("Outline row 5500");
  const pinned = await outlineItem(page, outsideLimit);
  await expect(pinned).toBeVisible();
  await expect(pinned).toHaveAttribute("aria-selected", "true");
  await outsideLimit.evaluate(element => element.remove());
  await expect(page.getByLabel("Selected element", { exact: true })).toContainText("No selection");
  await expect(navigator.locator('[aria-selected="true"]')).toHaveCount(0);
});

async function expectLogicalWidth(page: import("@playwright/test").Page, width: number) {
  const html = page.frameLocator('iframe[title="Website canvas"]').locator("html");
  await expect.poll(() => html.evaluate(element => element.ownerDocument.defaultView!.innerWidth)).toBe(width);
  await expect(page.getByRole("textbox", { name: "Canvas viewport width", exact: true })).toHaveValue(String(width));
}
async function setLogicalWidth(page: import("@playwright/test").Page, width: number) {
  const input = page.getByRole("textbox", { name: "Canvas viewport width", exact: true });
  await input.fill(String(width));
  await input.press("Enter");
  await expectLogicalWidth(page, width);
}

test("canvas viewport renders true preset/custom widths and switches Tailwind at exact boundaries", async ({ page }) => {
  await signInAndOpenDesigner(page);
  for (const [preset, width] of [["desktop", 1280], ["tablet", 1024], ["landscape", 768], ["mobile", 390]] as const) {
    await page.getByRole("button", { name: `${preset} preview`, exact: true }).click();
    await expectLogicalWidth(page, width);
  }
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const button = canvas.locator('[data-editor-component="Button.Link"][data-editor-instance="home.hero_section.href_3"]');
  await button.click();
  await page.getByRole("complementary", { name: "Component properties" }).getByRole("button", { name: "Edit main component" }).click();
  const label = button.locator('[data-editor-part="label"]');
  await label.click();
  const style = page.getByRole("complementary", { name: "Style inspector" });
  await style.getByRole("combobox", { name: "Style breakpoint" }).selectOption("desktop");
  await expectLogicalWidth(page, 1280);
  await style.getByRole("combobox", { name: "Display", exact: true }).selectOption("hidden");
  await expect(label).toHaveClass(/desktop:hidden/);
  await expect(label).toBeHidden();
  for (const [width, breakpoint] of [[767, "base"], [768, "landscape"], [1023, "landscape"], [1024, "tablet"], [1279, "tablet"], [1280, "desktop"]] as const) {
    await setLogicalWidth(page, width);
    await expect(style.getByRole("combobox", { name: "Style breakpoint" })).toHaveValue(breakpoint);
    const media = await canvas.locator("html").evaluate(element => element.ownerDocument.defaultView!.matchMedia("(min-width:1280px)").matches);
    expect(media).toBe(width >= 1280);
    // Our named landscape breakpoint follows width, even when Fit makes the
    // iframe taller than it is wide (Tailwind also has an orientation variant).
    const wideNavigation = canvas.locator('header .landscape\\:flex');
    if (width >= 768) await expect(wideNavigation).toBeVisible();
    else await expect(wideNavigation).toBeHidden();
    const journalGrid = canvas.locator('[data-editor-id="source.journal-section.8"]');
    await expect.poll(() => journalGrid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(width >= 1024 ? 3 : width >= 768 ? 2 : 1);
    if (width < 1280) await expect(label).toBeVisible();
    else await expect(label).toBeHidden();
  }
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(label).toBeVisible();
  await expectReviewState(page, false);
});

test("canvas viewport zoom keeps source width, overlay and inline editing accurate", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const iframe = page.locator('iframe[title="Website canvas"]');
  const viewport = page.getByLabel("Canvas viewport", { exact: true });
  const zoom = page.getByRole("combobox", { name: "Canvas zoom", exact: true });
  await expect(zoom).toHaveValue("fit");
  await expectLogicalWidth(page, 1280);
  expect((await iframe.boundingBox())!.width).toBeLessThan((await viewport.boundingBox())!.width);
  await zoom.selectOption("0.5");
  await expectLogicalWidth(page, 1280);
  await expect.poll(async () => (await iframe.boundingBox())!.width).toBe(640);
  expect(await canvas.locator("html").evaluate(element => element.ownerDocument.defaultView!.matchMedia("(min-width:1280px)").matches)).toBe(true);
  await expect(canvas.locator('header .landscape\\:flex')).toBeVisible();
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  const source = await hero.textContent();
  const overlay = canvas.locator("#three-acts-editor-selection");
  await expect(overlay).toBeVisible();
  const targetBounds = (await hero.boundingBox())!;
  const overlayBounds = (await overlay.boundingBox())!;
  for (const dimension of ["x", "y", "width", "height"] as const) expect(Math.abs(targetBounds[dimension] - overlayBounds[dimension])).toBeLessThan(2);
  await hero.dblclick();
  await expect(hero).toHaveAttribute("contenteditable", "true");
  await hero.fill("Inline editing at fifty percent zoom");
  await hero.press("Enter");
  await expect(page.locator("#selected-text")).toHaveValue("Inline editing at fifty percent zoom");
  await zoom.selectOption("0.75");
  await expectLogicalWidth(page, 1280);
  await expect.poll(async () => (await iframe.boundingBox())!.width).toBe(960);
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(hero).toHaveText(source!);
  await expect(page.getByRole("button", { name: "Undo edit", exact: true })).toBeDisabled();
  await expectReviewState(page, false);
  await zoom.selectOption("fit");
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-fit-canvas.png", import.meta.url)), fullPage: true });
});

test("canvas viewport resizes through zoom-aware drag and keyboard with bounds and cancellation", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const input = page.getByRole("textbox", { name: "Canvas viewport width", exact: true });
  const zoom = page.getByRole("combobox", { name: "Canvas zoom", exact: true });
  const grip = page.getByRole("separator", { name: "Resize canvas width", exact: true });
  await zoom.selectOption("0.5");
  await setLogicalWidth(page, 900);
  let bounds = (await grip.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 30, bounds.y + bounds.height / 2, { steps: 5 });
  await page.mouse.up();
  await expectLogicalWidth(page, 1020);
  await expect(grip).toHaveAttribute("aria-valuenow", "1020");
  await grip.press("ArrowRight");
  await expectLogicalWidth(page, 1030);
  await grip.press("Shift+ArrowLeft");
  await expectLogicalWidth(page, 980);
  await zoom.selectOption("fit");
  await setLogicalWidth(page, 900);
  bounds = (await grip.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 20, bounds.y + bounds.height / 2, { steps: 3 });
  await expect(input).not.toHaveValue("900");
  await grip.press("Escape");
  await page.mouse.up();
  await expectLogicalWidth(page, 900);
  await expect(zoom).toHaveValue("fit");
  for (const value of ["319", "3841", "767.5", ""]) {
    await input.fill(value); await input.press("Enter");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    expect(await page.frameLocator('iframe[title="Website canvas"]').locator("html").evaluate(element => element.ownerDocument.defaultView!.innerWidth)).toBe(900);
    await input.press("Escape");
    await expect(input).toHaveValue("900");
  }
  await setLogicalWidth(page, 320);
  await grip.press("ArrowLeft");
  await expectLogicalWidth(page, 320);
  await setLogicalWidth(page, 3840);
  await grip.press("Shift+ArrowRight");
  await expectLogicalWidth(page, 3840);
  await expect(page.getByRole("button", { name: "Undo edit", exact: true })).toBeDisabled();
  await expectReviewState(page, false);
});

test("canvas viewport preferences survive source handoff and adapt to narrow workspace chrome", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  const source = await page.locator("#selected-text").inputValue();
  await page.locator("#selected-text").fill("Source draft survives viewport preferences");
  await setLogicalWidth(page, 850);
  const zoom = page.getByRole("combobox", { name: "Canvas zoom", exact: true });
  await zoom.selectOption("0.5");
  await choosePage(page, "Product template");
  await choosePreviewItem(page, "Web App (Astro Static Site)");
  const title = canvas.locator('h1[data-cms-bound="products.title"]');
  const editor = await openBoundCmsSource(page, title, "products", "title");
  await editor.getByRole("button", { name: "Back to canvas" }).click();
  await expectLogicalWidth(page, 850);
  await expect(zoom).toHaveValue("0.5");
  await expect(title).toHaveAttribute("data-editor-selected", "");
  await choosePage(page, "Home");
  await expect(hero).toHaveText("Source draft survives viewport preferences");
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(hero).toHaveText(source);
  await expectLogicalWidth(page, 850);
  await expect(zoom).toHaveValue("0.5");
  await page.setViewportSize({ width: 1000, height: 800 });
  await zoom.selectOption("fit");
  const toolbar = page.getByLabel("Canvas toolbar", { exact: true });
  const toolbarBounds = (await toolbar.boundingBox())!;
  expect(toolbarBounds.height).toBeGreaterThanOrEqual(64);
  const inputBounds = (await page.getByRole("textbox", { name: "Canvas viewport width", exact: true }).boundingBox())!;
  const zoomBounds = (await zoom.boundingBox())!;
  expect(inputBounds.x).toBeGreaterThanOrEqual(toolbarBounds.x);
  expect(zoomBounds.x + zoomBounds.width).toBeLessThanOrEqual(toolbarBounds.x + toolbarBounds.width);
  const iframeBounds = (await page.locator('iframe[title="Website canvas"]').boundingBox())!;
  const areaBounds = (await page.getByLabel("Canvas viewport", { exact: true }).boundingBox())!;
  expect(iframeBounds.width).toBeLessThan(areaBounds.width);
  await expectReviewState(page, false);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-compact-viewport.png", import.meta.url)), fullPage: true });
});

test("explicit formatted bodies edit source without flattening and round trip through GitHub", async ({ page }) => {
  await signInAndOpenDesigner(page);
  await choosePage(page, "Terms");
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const body = canvas.locator('[data-static-field="terms.terms.sections_2.0.body"]');
  await body.click();
  const input = page.getByRole("textbox", { name: "Body source", exact: true });
  await expect(input).toBeVisible();
  const source = await input.inputValue();
  await expect(page.getByText(/Plain source text: blank lines separate paragraphs/)).toBeVisible();
  const draft = '## Heading /shop/app\n- First https://example.com/path\n- Second\n\nFirst line\nSecond <img src=x onerror=alert(1)>';
  await input.fill(draft);
  await expect(body.locator("h2")).toHaveText("Heading /shop/app");
  await expect(body.locator("ul li")).toHaveCount(2);
  await expect(body.locator("br")).toHaveCount(1);
  await expect(body.locator('a[href="https://example.com/path"]')).toHaveAttribute("rel", "noopener noreferrer");
  await expect(body.locator("img")).toHaveCount(0);
  await expect(body).toContainText('<img src=x onerror=alert(1)>');
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-body-source.png", import.meta.url)), fullPage: true });
  await body.locator("h2").dblclick();
  await expect(body).not.toHaveAttribute("contenteditable", "true");
  await expect(body.locator("[contenteditable=true]")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(body).not.toContainText("Heading /shop/app");
  await page.getByRole("button", { name: "Redo edit", exact: true }).click();
  await expect(body.locator("h2")).toHaveText("Heading /shop/app");
  await page.reload();
  await openDesignerTab(page);
  await choosePage(page, "Terms");
  await expect(body.locator("h2")).toHaveText("Heading /shop/app");
  const review = await openReview(page);
  await expect(review).toContainText("terms / sections / Item 1 / body");
  await review.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByText("Pushed to GitHub", { exact: true })).toBeVisible();
  await page.reload();
  await openDesignerTab(page);
  await choosePage(page, "Terms");
  await expect(body.locator("h2")).toHaveText("Heading /shop/app");
  await expect(body.locator('a[href="/shop/app"]')).toHaveText("/shop/app");
  expect(source).not.toBe(draft);
});

test("static image source and empty alt edit together with optimized picture and repeated scope", async ({ page, request }) => {
  // Exercise the real Intro fallback when product images do not supply the row.
  // The static test site has products, so inject that rare source-bound markup
  // before the bridge starts; separate renderer checks cover the production branch.
  const home = JSON.parse(readFileSync(fileURLToPath(new URL("../../../../../packages/static-content/src/documents/home.json", import.meta.url)), "utf8"));
  home.intro_section.fallback_image_2.src = "/content/islands.png";
  await request.post("http://127.0.0.1:5380/__e2e/external-change", { data: { path: "packages/static-content/src/documents/home.json", content: JSON.stringify(home) } });
  await page.route("http://localhost:5341/", async route => {
    const response = await route.fetch();
    const images = Array.from({ length: 3 }, () => '<picture><source data-image-avif="" srcset="/content/islands.avif" type="image/avif"><img data-testid="static-fallback" data-static-media="home.intro_section.fallback_image_2" src="/content/islands.png" alt="" width="120" height="120"></picture>').join("");
    await route.fulfill({ response, body: (await response.text()).replace("</main>", `${images}</main>`) });
  });
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const images = canvas.getByTestId("static-fallback");
  await expect(images).toHaveCount(3);
  await images.first().click();
  const alt = page.getByRole("textbox", { name: "alt", exact: true });
  const src = page.getByRole("textbox", { name: "src", exact: true });
  await expect(alt).toBeEnabled();
  await expect(alt).toHaveValue("");
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-image-source.png", import.meta.url)), fullPage: true });
  await expect.poll(() => images.first().evaluate(image => (image as HTMLImageElement).currentSrc)).toBe("http://localhost:5341/content/islands.avif");
  await alt.fill("Contextual static image description");
  await alt.press("Enter");
  for (const image of await images.all()) await expect(image).toHaveAttribute("alt", "Contextual static image description");
  await src.fill("mailto:unsafe@example.com");
  await src.press("Enter");
  await expect(src).toHaveAttribute("aria-invalid", "true");
  for (const image of await images.all()) await expect(image).toHaveAttribute("src", "/content/islands.png");
  await src.press("Escape");
  await expect(src).toHaveValue("/content/islands.png");
  await src.fill("http://localhost:5341/content/launch-playbook.png");
  await src.press("Enter");
  for (const image of await images.all()) await expect(image).toHaveAttribute("src", "http://localhost:5341/content/launch-playbook.png");
  for (const image of await images.all()) await expect(image.locator("..").locator("source[data-image-avif]")).not.toHaveAttribute("srcset", /.+/);
  await expect.poll(() => images.first().evaluate(image => (image as HTMLImageElement).currentSrc)).toBe("http://localhost:5341/content/launch-playbook.png");
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  for (const image of await images.all()) await expect(image).toHaveAttribute("src", "/content/islands.png");
  for (const image of await images.all()) await expect(image.locator("..").locator("source[data-image-avif]")).toHaveAttribute("srcset", "/content/islands.avif");
  await page.getByRole("button", { name: "Redo edit", exact: true }).click();
  const review = await openReview(page);
  await expect(review).toContainText("intro section / fallback image / alt");
  await expect(review).toContainText("intro section / fallback image / src");
  await review.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByText("Pushed to GitHub", { exact: true })).toBeVisible();
  await page.reload();
  await openDesignerTab(page);
  for (const image of await images.all()) await expect(image).toHaveAttribute("alt", "Contextual static image description");
  for (const image of await images.all()) await expect(image).toHaveAttribute("src", "http://localhost:5341/content/launch-playbook.png");
});

test("Home media and CMS formatted bodies open the exact source controls", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const image = canvas.locator('[data-editor-id="source.hero-section.7"] img');
  const editor = await openBoundCmsSource(page, image, "products", "images.0");
  await expect(editor.locator('[data-cms-field="images"]').getByRole("textbox").first()).toBeVisible();
  await editor.getByRole("button", { name: "Back to canvas" }).click();
  await expect(image).toHaveAttribute("data-editor-selected", "");
  const rowImage = canvas.locator('[data-editor-id="source.intro-section.10"] img').nth(1);
  const rowEditor = await openBoundCmsSource(page, rowImage, "products", "images.0");
  await rowEditor.getByRole("button", { name: "Back to canvas" }).click();
  await choosePage(page, "Product template");
  await choosePreviewItem(page, "Web App (Astro Static Site)");
  const body = canvas.locator('[data-cms-bound="products.description"]');
  const bodyEditor = await openBoundCmsSource(page, body, "products", "description");
  await expect(bodyEditor.locator('[data-cms-field="description"]')).toContainText("HTML stays literal");
  await expect(bodyEditor.locator('[data-cms-field="description"]').getByRole("textbox")).toBeFocused();
});

test("unpublished CMS products render a private saved draft without creating a public route", async ({ page }) => {
  await signInAndOpenDesigner(page);
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("button", { name: "CMS", exact: true }).click();
  await page.getByRole("complementary", { name: "CMS collections" }).getByRole("button", { name: /^Products / }).click();
  await page.getByRole("button", { name: "New Product", exact: true }).click();
  const editor = page.locator('[data-cms-record-editor][data-cms-collection="products"]');
  await expect(editor).toBeVisible();
  const id = await editor.getAttribute("data-cms-record-editor");
  await editor.locator('[data-cms-field="title"]').getByRole("textbox").fill("Unpublished private canvas product");
  await editor.locator('[data-cms-field="slug"]').getByRole("textbox").fill("unpublished-private-canvas-product");
  await editor.locator('[data-cms-field="description"]').getByRole("textbox").fill("## Private draft body\n- First item\n- Second item");
  const saved = page.waitForResponse(response => response.request().method() === "PUT" && new URL(response.url()).pathname.endsWith(`/products/records/${id}`));
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("button", { name: "Designer", exact: true }).click();
  await choosePage(page, "Product template");
  await choosePreviewItem(page, "Unpublished private canvas product");
  const iframe = page.locator('iframe[title="Website canvas"]');
  await expect(iframe).toHaveAttribute("src", /\/editor-preview\/cms\/\?/);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const title = canvas.locator(`h1[data-cms-item-id="${id}"]`);
  await expect(title).toHaveText("Unpublished private canvas product");
  await expect(canvas.locator(`[data-cms-bound="products.description"][data-cms-item-id="${id}"] h2`)).toHaveText("Private draft body");
  await expect(page.getByLabel("CMS preview snapshot", { exact: true })).toHaveText("Saved CMS draft");
  await expect(page.getByRole("link", { name: "View site", exact: true })).toHaveCount(0);
  await expect(canvas.getByRole("button", { name: "Add to cart", exact: true })).toBeDisabled();
  expect((await page.request.get("http://localhost:5341/shop/unpublished-private-canvas-product")).status()).toBe(404);
  expect((await page.request.get(`/api/content/collections/products/records/${id}`)).status()).toBe(404);
  await title.click();
  await expect(page.getByRole("button", { name: "Edit CMS item", exact: true })).toBeEnabled();
});

async function chooseCmsSnapshot(page: import("@playwright/test").Page, version: "published" | "draft") {
  const picker = await openPagePicker(page);
  await picker.getByRole("combobox", { name: "CMS preview snapshot" }).selectOption(version);
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
}

test("saved CMS snapshots refresh after source return while published values and editor preferences remain", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  const originalHero = await page.locator("#selected-text").inputValue();
  await page.locator("#selected-text").fill("Browser draft survives saved CMS preview");
  await choosePage(page, "Product template");
  await choosePreviewItem(page, "Web App (Astro Static Site)");
  const title = canvas.locator('h1[data-cms-bound="products.title"]');
  const publishedTitle = await title.textContent();
  const id = await title.getAttribute("data-cms-item-id");
  const publicUrl = await page.getByRole("link", { name: "View site", exact: true }).getAttribute("href");
  await chooseCmsSnapshot(page, "draft");
  await expect(title).toHaveAttribute("data-cms-item-id", id!);
  await setLogicalWidth(page, 850);
  const zoom = page.getByRole("combobox", { name: "Canvas zoom", exact: true });
  await zoom.selectOption("0.5");
  const editor = await openBoundCmsSource(page, title, "products", "title");
  await editor.locator('[data-cms-field="title"]').getByRole("textbox").fill("Saved preview product title");
  await editor.locator('[data-cms-field="slug"]').getByRole("textbox").fill("saved-preview-new-slug");
  await editor.locator('[data-cms-field="description"]').getByRole("textbox").fill("## Saved preview body\n- Saved list item");
  const saved = page.waitForResponse(response => response.request().method() === "PUT" && new URL(response.url()).pathname.endsWith(`/products/records/${id}`));
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await editor.getByRole("button", { name: "Back to canvas" }).click();
  await expect(title).toHaveText("Saved preview product title");
  await expect(title).toHaveAttribute("data-editor-selected", "");
  await expect(canvas.locator(`[data-cms-bound="products.description"][data-cms-item-id="${id}"] h2`)).toHaveText("Saved preview body");
  await expectLogicalWidth(page, 850);
  await expect(zoom).toHaveValue("0.5");
  await expect(page.getByRole("link", { name: "View site", exact: true })).toHaveAttribute("href", publicUrl!);
  expect((await page.request.get("http://localhost:5341/shop/saved-preview-new-slug")).status()).toBe(404);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-saved-draft-preview.png", import.meta.url)), fullPage: true });
  await chooseCmsSnapshot(page, "published");
  await expect(title).toHaveText(publishedTitle!);
  await expect(page.locator('iframe[title="Website canvas"]')).toHaveAttribute("src", publicUrl!);
  await chooseCmsSnapshot(page, "draft");
  await expect(title).toHaveText("Saved preview product title");
  const image = canvas.locator(`img[data-cms-bound="products.images.0"][data-cms-item-id="${id}"]`).first();
  const imageEditor = await openBoundCmsSource(page, image, "products", "images.0", false);
  const replacementUrl = "http://localhost:5341/content/launch-playbook.png";
  await page.route("**/api/cms/collections/products/assets/images", route => route.fulfill({ contentType: "application/json", json: { ok: true, data: { path: "preview-test/replacement.png", url: replacementUrl, fileName: "replacement.png", size: 68 } } }));
  await imageEditor.locator('[data-cms-field="images"]').locator('input[type="file"][id$="-0"]').setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA3sAAAAASUVORK5CYII=", "base64") });
  await expect(imageEditor.locator('[data-cms-field="images"] img').first()).toHaveAttribute("src", replacementUrl);
  await imageEditor.locator('[data-cms-field="images"]').getByPlaceholder("Alt text…").first().fill("Saved preview image alt");
  const imageSaved = page.waitForResponse(response => response.request().method() === "PUT" && new URL(response.url()).pathname.endsWith(`/products/records/${id}`));
  await imageEditor.getByRole("button", { name: "Save", exact: true }).click();
  expect((await imageSaved).ok()).toBe(true);
  await imageEditor.getByRole("button", { name: "Back to canvas" }).click();
  await expect(image).toHaveAttribute("alt", "Saved preview image alt");
  await expect(image).toHaveAttribute("src", replacementUrl);
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).currentSrc)).toBe(replacementUrl);
  await expect(image).toHaveAttribute("data-editor-selected", "");
  await page.getByRole("button", { name: "Preview mode", exact: true }).click();
  const category = canvas.locator('[data-cms-bound="product-categories.name"]').first();
  const categoryId = await category.getAttribute("data-cms-item-id");
  await category.locator("xpath=ancestor::a[1]").click();
  await expect(canvas.locator(`:is(h1,h2) [data-cms-bound="product-categories.name"][data-cms-item-id="${categoryId}"]`)).toBeVisible();
  await expect(page.getByLabel("CMS preview snapshot", { exact: true })).toHaveText("Saved CMS draft");
  await page.getByRole("button", { name: "Design mode", exact: true }).click();
  await choosePage(page, "Home");
  await expect(hero).toHaveText("Browser draft survives saved CMS preview");
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(hero).toHaveText(originalHero);
  await expectLogicalWidth(page, 850);
  await expect(zoom).toHaveValue("0.5");
});

test("unpublished and incomplete drafts render in every CMS template family", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const families = [
    { collection: "articles", template: "Article template", slug: "/blog/", field: "title", label: "Unpublished draft article" },
    { collection: "authors", template: "Author template", slug: "/authors/", field: "name", label: "Unpublished draft author" },
    { collection: "product-categories", template: "Product category template", slug: "/shop/category/", field: "name", label: "Unpublished draft shop category" },
    { collection: "article-categories", template: "Article category template", slug: "/blog/category/", field: "name", label: "Unpublished draft journal category" },
  ];
  for (const family of families) {
    // Fixture creation uses the same authenticated client as the record editor.
    const id = await page.evaluate(async ({ collection, field, label }) => {
      const { apiFetch } = await import("/src/lib/api-client.ts");
      const record = await apiFetch(`/cms/collections/${collection}/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: { [field]: label, slug: "unpublished-family-fixture" } }) });
      return record.id as string;
    }, family);
    await choosePage(page, family.template);
    await choosePreviewItem(page, family.label);
    const canvas = page.frameLocator('iframe[title="Website canvas"]');
    await expect(canvas.locator(`[data-cms-bound="${family.collection}.${family.field}"][data-cms-item-id="${id}"]`).first()).toHaveText(family.label);
    expect((await page.request.get(`http://localhost:5341${family.slug}unpublished-family-fixture`)).status()).toBe(404);
    expect((await page.request.get(`/api/content/collections/${family.collection}/records/${id}`)).status()).toBe(404);
    const incompleteId = await page.evaluate(async collection => {
      const { apiFetch } = await import("/src/lib/api-client.ts");
      const record = await apiFetch(`/cms/collections/${collection}/records`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: {} }) });
      return record.id as string;
    }, family.collection);
    // Return from CMS refreshes the catalogue without resetting canvas preferences.
    await page.getByRole("navigation", { name: "Workspace" }).getByRole("button", { name: "CMS", exact: true }).click();
    await page.getByRole("navigation", { name: "Workspace" }).getByRole("button", { name: "Designer", exact: true }).click();
    await choosePreviewItem(page, `Untitled item · ${incompleteId}`);
    await expect(canvas.getByRole("status")).toContainText("preview placeholders");
    await expect(canvas.locator(`[data-cms-bound="${family.collection}.${family.field}"][data-cms-item-id="${incompleteId}"]`).first()).toContainText("Untitled");
    await expect(page.getByRole("link", { name: "View site", exact: true })).toHaveCount(0);
  }
});

test("private preview recovers from missing records and a direct shell exposes no draft values", async ({ page, context }) => {
  await signInAndOpenDesigner(page);
  await choosePage(page, "Product template");
  await choosePreviewItem(page, "Web App (Astro Static Site)");
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const title = canvas.locator('h1[data-cms-bound="products.title"]');
  const id = await title.getAttribute("data-cms-item-id");
  await page.route(`**/api/cms/collections/products/records/${id}`, route => route.fulfill({ status: 404, contentType: "application/json", json: { ok: false, error: { code: "record_not_found", message: "The selected draft was removed." } } }));
  await chooseCmsSnapshot(page, "draft");
  await expect(canvas.getByRole("alert")).toContainText("The selected draft was removed");
  await page.unroute(`**/api/cms/collections/products/records/${id}`);
  await canvas.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(title).toBeVisible();
  await expect(title).toHaveAttribute("data-cms-item-id", id!);
  const shell = await context.newPage();
  await shell.goto((await page.locator('iframe[title="Website canvas"]').getAttribute("src"))!);
  await expect(shell.getByText("Open saved CMS drafts from the authenticated designer.")).toBeVisible();
  await expect(shell.locator('[data-cms-item-id]')).toHaveCount(0);
  await shell.close();
  await page.getByRole("button", { name: `Sign out ${email}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Back of house." })).toBeVisible();
  await expect(page.locator('iframe[title="Website canvas"]')).toHaveCount(0);
});

test("private preview rejects sibling, foreign-origin, wrong-session and stale packets", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { __testCmsPackets: CmsDraftPreview[] };
    state.__testCmsPackets = [];
    window.addEventListener("message", event => {
      if (event.data?.type === "three-acts:cms-preview") state.__testCmsPackets.push(event.data.preview);
    });
  });
  await signInAndOpenDesigner(page);
  await choosePage(page, "Product template");
  await choosePreviewItem(page, "Web App (Astro Static Site)");
  await chooseCmsSnapshot(page, "draft");
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const title = canvas.locator('h1[data-cms-bound="products.title"]');
  await expect(title).toBeVisible();
  const expected = await title.textContent();
  const packet = await canvas.locator("body").evaluate(() => (window as unknown as { __testCmsPackets: CmsDraftPreview[] }).__testCmsPackets.at(-1)!);
  expect(packet).toBeTruthy();
  const forged = structuredClone(packet);
  forged.sequence += 100;
  forged.collections.products.find(record => record.id === forged.recordId)!.values.title = "Forged preview title";
  // A message sent from the website itself has the wrong origin and source.
  await canvas.locator("body").evaluate((_body, preview) => window.postMessage({ type: "three-acts:cms-preview", preview }, window.location.origin), forged);
  // A CMS-origin sibling still cannot impersonate the selected frame's parent.
  await page.evaluate(preview => {
    const target = (document.querySelector('iframe[title="Website canvas"]') as HTMLIFrameElement).contentWindow!;
    const sibling = document.createElement("iframe"); document.body.append(sibling);
    sibling.contentWindow!.eval("window.sendPreview = (target, packet) => target.postMessage(packet, 'http://localhost:5341')");
    (sibling.contentWindow as unknown as { sendPreview: (target: Window, packet: unknown) => void }).sendPreview(target, { type: "three-acts:cms-preview", preview });
    sibling.remove();
  }, forged);
  await page.evaluate(preview => {
    const target = (document.querySelector('iframe[title="Website canvas"]') as HTMLIFrameElement).contentWindow!;
    target.postMessage({ type: "three-acts:cms-preview", preview: { ...preview, session: "different-preview-session" } }, "http://localhost:5341");
    target.postMessage({ type: "three-acts:cms-preview", preview: { ...preview, sequence: preview.sequence - 100 } }, "http://localhost:5341");
  }, forged);
  await expect.poll(() => canvas.locator("body").evaluate(() => (window as unknown as { __testCmsPackets: CmsDraftPreview[] }).__testCmsPackets.length)).toBeGreaterThanOrEqual(5);
  await expect(title).toHaveText(expected!);
  await expect(canvas.getByText("Forged preview title", { exact: true })).toHaveCount(0);
});

async function selectLayoutSection(page: import("@playwright/test").Page, label: string) {
  const navigator = page.getByRole("complementary", { name: "Navigator" });
  await navigator.getByRole("searchbox", { name: "Search elements" }).fill(label);
  const item = navigator.getByRole("treeitem", { name: new RegExp(`^Component: ${label}, div`, "i") }).first();
  await item.click();
  await expect(page.getByRole("button", { name: "Section actions", exact: true })).toBeVisible();
  return item;
}

async function sectionAction(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name: "Section actions", exact: true }).click();
  await page.getByRole("menuitem", { name, exact: false }).click();
}

test("approved sections duplicate independent copy, reorder, hide, undo and persist through source review", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const sections = canvas.locator('[data-layout-section]');
  await expect(sections).toHaveCount(9);
  const original = canvas.locator('[data-static-field="home.cta_section.p_1"]');
  const originalText = await original.textContent();
  await selectLayoutSection(page, "CTA Section");
  await expect(page.getByRole("button", { name: "Style panel" })).toHaveCount(0);
  await sectionAction(page, "Duplicate");
  await expect(sections).toHaveCount(10);
  const copy = canvas.locator('[data-layout-section^="section-"]');
  const id = await copy.getAttribute("data-layout-section");
  expect(id).toBeTruthy();
  await expect(copy).toHaveAttribute("data-editor-selected", "");
  const properties = page.getByRole("complementary", { name: "Component properties" });
  const text = properties.getByRole("textbox", { name: "Component Headline", exact: true });
  await text.fill("An independently composed CTA");
  await expect(copy.locator(`[data-static-field="layout.pages.home.sections.${id}.content.p_1"]`)).toHaveText("An independently composed CTA");
  await expect(original).toHaveText(originalText!);
  await expect(properties.getByRole("button", { name: "Reset Headline to source", exact: true })).toBeVisible();
  const originalSection = canvas.locator('[data-layout-section="home-cta"] > section');
  const originalClass = await originalSection.getAttribute("class");
  const copiedSection = canvas.locator(`[data-layout-section="${id}"] > section`);
  await copiedSection.click({ position: { x: 1, y: 1 } });
  await page.getByRole("button", { name: "Style panel", exact: true }).click();
  const styles = page.getByRole("complementary", { name: "Style inspector" });
  await styles.getByRole("combobox", { name: "Style breakpoint" }).selectOption("base");
  await styles.getByRole("combobox", { name: "Padding top", exact: true }).selectOption("pt-12");
  await styles.getByRole("combobox", { name: "Style breakpoint" }).selectOption("tablet");
  await styles.getByRole("combobox", { name: "Padding top", exact: true }).selectOption("pt-16");
  await expect(copiedSection).toHaveClass(/tablet:pt-16/);
  await expect(originalSection).toHaveAttribute("class", originalClass!);
  await page.getByRole("navigation", { name: "Element breadcrumb" }).getByRole("button", { name: "CTA Section", exact: true }).click();
  await sectionAction(page, "Hide section");
  await expect(copy).toBeHidden();
  await expect(copy).toHaveAttribute("data-layout-hidden", "true");
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(copy).toBeVisible();
  await page.getByRole("button", { name: "Redo edit", exact: true }).click();
  await expect(copy).toBeHidden();
  await sectionAction(page, "Show section");
  await expect(copy).toBeVisible();
  await sectionAction(page, "Move up");
  await expect.poll(() => sections.evaluateAll(elements => elements.map(element => element.getAttribute("data-layout-section")))).toEqual(["home-hero", "home-stats", "home-categories", "home-products", "home-intro", "home-journal", "home-testimonials", "home-faq", id, "home-cta"]);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-composition-properties.png", import.meta.url)), fullPage: true });
  await page.reload();
  await openDesignerTab(page);
  await expect(copy).toBeVisible();
  await expect(copy.locator(`[data-static-field="layout.pages.home.sections.${id}.content.p_1"]`)).toHaveText("An independently composed CTA");
  const review = await openReview(page);
  await expect(review).toContainText("Page composition");
  await expect(review).toContainText("An independently composed CTA");
  await review.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByText("Pushed to GitHub", { exact: true })).toBeVisible();
  await page.reload();
  await openDesignerTab(page);
  await expect(copy.locator(`[data-static-field="layout.pages.home.sections.${id}.content.p_1"]`)).toHaveText("An independently composed CTA");
  await expectReviewState(page, false);
  const committed = await page.evaluate(async () => {
    const { apiFetch } = await import("/src/lib/api-client.ts");
    return apiFetch<EditorWorkspace>("/editor/content");
  });
  writeFileSync(fileURLToPath(new URL("../artifacts/composition-committed.json", import.meta.url)), JSON.stringify({ documents: committed.documents.map(document => ({ id: document.id, content: document.content })) }, null, 2));
});

test("approved section insertion supports every type and Navigator keyboard and pointer reordering", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const sections = canvas.locator('[data-layout-section]');
  await expect(sections.first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add element", exact: true })).toBeEnabled();
  const originalCount = await sections.count();
  const types = ["Hero", "Stats", "Shop by category", "Featured products", "Intro", "Journal", "Testimonials", "FAQ teaser", "CTA"];
  for (const [index, label] of types.entries()) {
    await page.getByRole("button", { name: "Add element", exact: true }).click();
    await page.getByRole("menuitem", { name: label, exact: true }).click();
    await expect(sections).toHaveCount(originalCount + index + 1);
    await expect(canvas.locator('[data-layout-section][data-editor-selected]')).toHaveCount(1);
  }
  await expect(canvas.locator("h1")).toHaveCount(1);
  const order = await sections.evaluateAll(elements => elements.map(element => element.getAttribute("data-layout-section")));
  const navigator = page.getByRole("complementary", { name: "Navigator" });
  const selected = navigator.getByRole("treeitem", { selected: true });
  await selected.focus();
  await selected.press("Alt+ArrowUp");
  const keyboardOrder = [...order];
  [keyboardOrder[keyboardOrder.length - 1], keyboardOrder[keyboardOrder.length - 2]] = [keyboardOrder[keyboardOrder.length - 2], keyboardOrder[keyboardOrder.length - 1]];
  await expect.poll(() => sections.evaluateAll(elements => elements.map(element => element.getAttribute("data-layout-section")))).toEqual(keyboardOrder);
  const dragSource = navigator.getByRole("treeitem", { name: /^Component: CTA Section, div/i }).last();
  const target = navigator.getByRole("treeitem", { name: /^Component: Stats Section, div/i }).last();
  const sourceId = keyboardOrder.at(-2)!;
  const targetId = order[originalCount + 1]!;
  await dragSource.dragTo(target);
  const pointerOrder = keyboardOrder.filter(id => id !== sourceId);
  pointerOrder.splice(keyboardOrder.indexOf(targetId), 0, sourceId);
  await expect.poll(() => sections.evaluateAll(elements => elements.map(element => element.getAttribute("data-layout-section")))).toEqual(pointerOrder);
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect.poll(() => sections.evaluateAll(elements => elements.map(element => element.getAttribute("data-layout-section")))).toEqual(keyboardOrder);
  await setLogicalWidth(page, 390);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-composition-mobile.png", import.meta.url)), fullPage: true });
});

test("composed section utilities and variants are independent and main-component styles remain shared", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const original = canvas.locator('[data-layout-section="home-cta"] > section');
  await original.click({ position: { x: 1, y: 1 } });
  await page.getByRole("button", { name: "Style panel", exact: true }).click();
  const styles = page.getByRole("complementary", { name: "Style inspector" });
  await styles.getByRole("combobox", { name: "Style breakpoint" }).selectOption("base");
  await styles.getByRole("combobox", { name: "Padding top", exact: true }).selectOption("pt-4");
  const originalButton = canvas.locator('[data-editor-instance="home.cta_section.href_2"]');
  await originalButton.click();
  const properties = page.getByRole("complementary", { name: "Component properties" });
  await properties.getByRole("combobox", { name: "Component size" }).selectOption("sm");
  await page.getByRole("navigation", { name: "Element breadcrumb" }).getByRole("button", { name: "Show parent elements", exact: true }).click();
  await page.getByRole("dialog", { name: "Parent elements" }).getByRole("button", { name: "CTA Section", exact: true }).click();
  const before = await canvas.locator('[data-layout-section]').count();
  await sectionAction(page, "Duplicate");
  await expect(canvas.locator('[data-layout-section]')).toHaveCount(before + 1);
  const copy = canvas.locator('[data-layout-section][data-editor-selected]');
  const id = await copy.getAttribute("data-layout-section");
  const copiedSection = canvas.locator(`[data-layout-section="${id}"] > section`);
  const copiedButton = canvas.locator(`[data-editor-instance="composition.${id}.home.cta_section.href_2"]`);
  await expect(copiedSection).toHaveClass(/pt-4/);
  await expect(copiedButton).toHaveClass(/px-\[17px\]/);
  await copiedSection.click({ position: { x: 1, y: 1 } });
  await page.getByRole("button", { name: "Style panel", exact: true }).click();
  await styles.getByRole("combobox", { name: "Padding top", exact: true }).selectOption("pt-12");
  await expect(copiedSection).toHaveClass(/pt-12/);
  await expect(original).toHaveClass(/pt-4/);
  await copiedButton.click();
  await properties.getByRole("combobox", { name: "Component size" }).selectOption("lg");
  await expect(copiedButton).toHaveClass(/px-7/);
  await expect(originalButton).toHaveClass(/px-\[17px\]/);
  await properties.getByRole("button", { name: "Edit main component" }).click();
  await copiedButton.locator('[data-editor-part="label"]').click();
  await styles.getByRole("combobox", { name: "Font size", exact: true }).selectOption("text-h2");
  await expect(copiedButton.locator('[data-editor-part="label"]')).toHaveClass(/text-h2/);
  await expect(originalButton.locator('[data-editor-part="label"]')).toHaveClass(/text-h2/);
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(copiedButton.locator('[data-editor-part="label"]')).not.toHaveClass(/text-h2/);
  await expect(originalButton.locator('[data-editor-part="label"]')).not.toHaveClass(/text-h2/);
  await page.getByRole("button", { name: "Done editing component", exact: true }).click();
  await selectLayoutSection(page, "Hero Section");
  await sectionAction(page, "Duplicate");
  const copiedHero = canvas.locator('[data-layout-section][data-editor-selected]');
  await expect(copiedHero).toHaveAttribute("data-layout-type", "hero");
  const heroId = await copiedHero.getAttribute("data-layout-section");
  const image = canvas.locator(`[data-layout-section="${heroId}"] img[data-cms-bound="products.images.0"]`);
  const editor = await openBoundCmsSource(page, image, "products", "images.0");
  await editor.getByRole("button", { name: "Back to canvas" }).click();
  await expect(image).toHaveAttribute("data-editor-selected", "");
  await expect(canvas.locator(`[data-layout-section="${heroId}"]`)).toBeVisible();
});

test("publication reviews source and exact CMS records, deploys the committed revision and verifies live after reload", async ({ page }) => {
  await signInAndOpenDesigner(page);
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const heroButton = canvas.locator('[data-editor-component="Button.Link"][data-editor-instance="home.hero_section.href_3"]');
  await heroButton.click();
  await page.getByRole("complementary", { name: "Component properties" }).getByRole("combobox", { name: "Component variant" }).selectOption("secondary");
  await selectLayoutSection(page, "CTA Section");
  await sectionAction(page, "Duplicate");
  const copy = canvas.locator('[data-layout-section^="section-"]').last();
  const copiedId = await copy.getAttribute("data-layout-section");
  await page.getByRole("complementary", { name: "Component properties" }).getByRole("textbox", { name: "Component Headline", exact: true }).fill("A reviewed composed section");
  const copiedSection = canvas.locator(`[data-layout-section="${copiedId}"] > section`);
  await copiedSection.click({ position: { x: 1, y: 1 } });
  await page.getByRole("button", { name: "Style panel", exact: true }).click();
  const styles = page.getByRole("complementary", { name: "Style inspector" });
  await styles.getByRole("combobox", { name: "Style breakpoint" }).selectOption("base");
  await styles.getByRole("combobox", { name: "Padding top", exact: true }).selectOption("pt-12");
  await styles.getByRole("combobox", { name: "Style breakpoint" }).selectOption("tablet");
  await styles.getByRole("combobox", { name: "Padding top", exact: true }).selectOption("pt-16");
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  await page.getByRole("button",{name:"Content panel",exact:true}).click();
  await page.locator("#selected-text").fill("A reviewed publication headline");
  const requests: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (request.method() === "POST" && ["/api/editor/push", "/api/cms/publish", "/api/editor/deploy"].includes(path)) requests.push(path); });
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Review & publish", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review publication", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Publishing" }).getByText("A reviewed publication headline", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Publishing" })).toContainText("A reviewed composed section");
  await expect(page.getByRole("dialog", { name: "Publishing" })).toContainText("Page composition");
  await expect(page.getByRole("region", { name: "Reviewed CMS records" })).toBeVisible();
  await page.getByRole("button", { name: "Publish reviewed changes", exact: true }).click();
  await expect(page.getByRole("region", { name: "Publication status" })).toContainText("Deploying committed revision");
  expect(requests).toEqual(["/api/editor/push", "/api/cms/publish", "/api/editor/deploy"]);
  const head = (await (await page.request.get("http://127.0.0.1:5380/repos/test/site/git/ref/heads/content")).json()).object.sha;
  const provider = await (await page.request.get("http://127.0.0.1:5381/__e2e/status")).json();
  expect(provider.deployments[0].gitSource.sha).toBe(head);
  await page.request.post("http://127.0.0.1:5381/__e2e/control", { data: { state: "READY", markerMatches: false } });
  await expect(page.getByRole("region", { name: "Publication status" })).toContainText("Verifying production revision");
  await expect(page.getByRole("region", { name: "Publication status" })).not.toContainText("Live revision verified");
  await page.reload();
  await openDesignerTab(page);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("region", { name: "Publication status" })).toContainText(head.slice(0, 8));
  await page.request.post("http://127.0.0.1:5381/__e2e/control", { data: { state: "READY", markerMatches: true } });
  await expect(page.getByRole("region", { name: "Publication status" })).toContainText("Live revision verified");
  await expect(page.getByLabel("Draft save state")).toContainText(`Live · ${head.slice(0, 8)}`);
  expect((await (await page.request.get("http://127.0.0.1:5381/__e2e/status")).json()).creates).toBe(provider.creates);
  const snapshot = await page.evaluate(async () => {
    const { apiFetch } = await import("/src/lib/api-client.ts");
    return apiFetch<EditorWorkspace>("/editor/content");
  });
  expect(snapshot.headSha).toBe(head);
  expect(snapshot.documents.find(doc => doc.id === "home")!.content.hero_section).toMatchObject({ display_1: "A reviewed publication headline" });
  expect(snapshot.documents.find(doc => doc.id === "layout")!.content).toHaveProperty(`pages.home.sections.${copiedId}.content.p_1`, "A reviewed composed section");
  expect(JSON.stringify(snapshot.documents.find(doc => doc.id === "design")!.content)).toContain("pt-12");
  expect(JSON.stringify(snapshot.documents.find(doc => doc.id === "design")!.content)).toContain("secondary");
  writeFileSync(fileURLToPath(new URL("../artifacts/publication-committed.json", import.meta.url)), JSON.stringify({ revision: head, documents: snapshot.documents.map(doc => ({ id: doc.id, content: doc.content })) }, null, 2));
  await page.screenshot({ path: "apps/cms/tests/designer/artifacts/publication-live.png" });
});

test("direct source styling supports arbitrary Tailwind, remembers the inspector, and adds elements on Privacy", async ({ page }) => {
  test.setTimeout(90_000);
  await signInAndOpenDesigner(page);
  await choosePage(page, "Privacy");
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const footerText = canvas.locator("footer p").first();
  await footerText.click();
  await page.getByRole("button", {name:"Style panel"}).click();
  const style = page.getByRole("complementary", {name:"Style inspector"});
  await expect(style.getByRole("combobox", {name:"Padding bottom",exact:true})).toBeEnabled();
  await expect(style.getByRole("tab")).toHaveCount(0);
  await style.getByRole("combobox", {name:"Style breakpoint"}).selectOption("base");
  await style.getByRole("combobox", {name:"Padding bottom",exact:true}).selectOption("__custom__");
  await style.getByRole("textbox", {name:"Padding bottom value",exact:true}).fill("7");
  await style.getByRole("textbox", {name:"Padding bottom value",exact:true}).press("Enter");
  await expect(footerText).toHaveClass(/pb-7/);
  await expect(footerText).toHaveCSS("padding-bottom","28px");
  await style.getByRole("combobox", {name:"Padding bottom",exact:true}).selectOption("__custom__");
  await style.getByRole("textbox", {name:"Padding bottom value",exact:true}).fill("999px");
  await style.getByRole("textbox", {name:"Padding bottom value",exact:true}).press("Escape");
  await expect(footerText).toHaveCSS("padding-bottom","28px");
  await style.getByRole("combobox", {name:"Padding bottom",exact:true}).selectOption("__custom__");
  await style.getByRole("textbox", {name:"Padding bottom value",exact:true}).fill("calc(3rem + 2px)");
  await style.getByRole("textbox", {name:"Padding bottom value",exact:true}).press("Enter");
  await expect(footerText).toHaveCSS("padding-bottom","50px");
  await style.getByRole("combobox", {name:"Style breakpoint"}).selectOption("desktop");
  await style.getByRole("combobox", {name:"Padding bottom",exact:true}).selectOption("__custom__");
  await style.getByRole("textbox", {name:"Padding bottom value",exact:true}).fill("calc(4rem + 8px)");
  await style.getByRole("textbox", {name:"Padding bottom value",exact:true}).press("Enter");
  await expect(footerText).toHaveCSS("padding-bottom","72px");
  await canvas.locator("footer p").nth(1).click();
  await expect(style).toBeVisible();
  await footerText.click();
  await page.getByRole("button", {name:"Content panel"}).click();
  await canvas.locator("footer p").nth(1).click();
  await expect(page.getByRole("complementary", {name:"Content inspector"})).toBeVisible();
  await footerText.click();
  await page.getByRole("button", {name:"Style panel"}).click();
  await page.getByRole("button", {name:"Navigator panel",exact:true}).click();
  await page.getByRole("button", {name:"Add element",exact:true}).click();
  await page.getByRole("menuitem", {name:"Heading 1",exact:true}).click();
  const heading = canvas.locator('h1[data-editor-added]');
  await expect(heading).toHaveCount(1);
  await heading.click();
  await page.getByRole("button", {name:"Content panel"}).click();
  await page.locator("#selected-text").fill("A heading added on Privacy");
  await expect(heading).toHaveText("A heading added on Privacy");
  await page.getByRole("button", {name:"Add element",exact:true}).click();
  await page.getByRole("menuitem", {name:"Button link",exact:true}).click();
  const button = canvas.locator('[data-editor-added][data-editor-component="Button.Link"]');
  await expect(button).toHaveCount(1);
  await button.click();
  await page.getByRole("complementary", {name:"Component properties"}).getByRole("combobox", {name:"Component variant"}).selectOption("secondary");
  await expect(button).toHaveClass(/border-line-strong/);
  await heading.click();
  await page.getByRole("button",{name:"Element actions",exact:true}).click();
  await page.getByRole("menuitem",{name:"Duplicate",exact:true}).click();
  await expect(heading).toHaveCount(2);
  await expect(button).toHaveCount(1);
  const duplicateHeading = heading.nth(1);
  await duplicateHeading.click();
  const duplicateId = await duplicateHeading.getAttribute("data-editor-id");
  await page.getByRole("button",{name:"Element actions",exact:true}).click();
  await page.getByRole("menuitem",{name:"Move up",exact:true}).click();
  await expect(heading.first()).toHaveAttribute("data-editor-id",duplicateId!);
  await page.getByRole("button",{name:"Element actions",exact:true}).click();
  await page.getByRole("menuitem",{name:"Remove element",exact:true}).click();
  await expect(heading).toHaveCount(1);
  await expect(button).toHaveCount(1);
  await footerText.click();
  await page.getByRole("button",{name:"Add element",exact:true}).click();
  await page.getByRole("menuitem",{name:"Div",exact:true}).click();
  const addedDiv = canvas.locator('div[data-editor-added]');
  await expect(addedDiv).toHaveCount(1);
  await (await outlineItem(page,addedDiv)).click();
  await page.getByRole("button",{name:"Add element",exact:true}).click();
  await page.getByRole("menuitem",{name:"Heading 2",exact:true}).click();
  const nestedHeading=addedDiv.locator('h2[data-editor-added]');
  await expect(nestedHeading).toHaveCount(1);
  await nestedHeading.click();
  await page.getByRole("button",{name:"Content panel"}).click();
  await page.locator("#selected-text").fill("Nested content persists in source");
  await expect(nestedHeading).toHaveText("Nested content persists in source");
  await page.reload();
  await openDesignerTab(page);
  await choosePage(page,"Privacy");
  await expect(heading).toHaveCount(1);
  await expect(heading).toHaveText("A heading added on Privacy");
  await expect(button).toHaveCount(1);
  await footerText.click();
  await expect(footerText).toHaveCSS("padding-bottom","72px");
  const review = await openReview(page);
  await review.getByRole("textbox", {name:"Commit message"}).fill("Add Privacy elements and direct Tailwind styling");
  await review.getByRole("button", {name:"Push to GitHub"}).click();
  await expect(page.getByText("Pushed to GitHub", {exact:true})).toBeVisible();
  const committed = await page.evaluate(async () => {
    const {apiFetch}=await import("/src/lib/api-client.ts"); return apiFetch<EditorWorkspace>("/editor/content");
  });
  writeFileSync(fileURLToPath(new URL("../artifacts/direct-authoring-committed.json", import.meta.url)), JSON.stringify({documents:committed.documents.map(doc=>({id:doc.id,content:doc.content}))},null,2));
  await page.screenshot({path:fileURLToPath(new URL("../artifacts/direct-authoring-privacy.png",import.meta.url)),fullPage:true});
});

test("zoom keeps Privacy viewport height fixed and a canvas drag stays centered", async ({page}) => {
  await signInAndOpenDesigner(page);
  await choosePage(page,"Privacy");
  await setLogicalWidth(page,600);
  const canvas=page.frameLocator('iframe[title="Website canvas"]');
  const zoom=page.getByRole("combobox",{name:"Canvas zoom",exact:true});
  const heights:number[]=[];
  for (const scale of ["0.25","0.5","1","2"]) {
    await zoom.selectOption(scale);
    heights.push(await canvas.locator("html").evaluate(el=>el.ownerDocument.defaultView!.innerHeight));
  }
  expect(new Set(heights).size).toBe(1);
  await expect(zoom.locator('option[value="0.1"]')).toHaveCount(0);
  await zoom.selectOption("0.5");
  const grip=page.getByRole("separator",{name:"Resize canvas width"});
  const frame=page.locator('iframe[title="Website canvas"]');
  const center=async()=>{const rect=(await frame.boundingBox())!;return rect.x+rect.width/2;};
  const originalCenter=await center();
  const bounds=(await grip.boundingBox())!;
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width/2+35,bounds.y+bounds.height/2,{steps:5});
  await expectLogicalWidth(page,740);
  expect(Math.abs(await center()-originalCenter)).toBeLessThan(2);
  await page.mouse.up();
  expect(Math.abs(await center()-originalCenter)).toBeLessThan(2);
});

test("media belongs to Resources and site settings stay separate", async ({page}) => {
  await signInAndOpenDesigner(page);
  const workspace=page.getByRole("navigation",{name:"Workspace"});
  await workspace.getByRole("button",{name:"Resources",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Media Library",exact:true})).toBeVisible();
  await workspace.getByRole("button",{name:"Site",exact:true}).click();
  await expect(page.getByRole("navigation",{name:"Site settings sections"}).getByRole("button",{name:"Media",exact:true})).toHaveCount(0);
  await workspace.getByRole("button",{name:"CMS",exact:true}).click();
  await expect(page.getByRole("complementary").getByRole("button",{name:"Media Library",exact:true})).toHaveCount(0);
});
