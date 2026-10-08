import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
  await expect(workspace.getByRole("button")).toHaveText(["Designer", "CMS", "Site"]);
  await expect(workspace.getByRole("button", { name: "Designer", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Choose page" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Preview item" })).toHaveCount(0);
  await expect(page.getByText("Preview item", { exact: true })).toHaveCount(0);
  // Start these workflows on Content; new leaf selections also choose Content automatically.
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
  const productTitle = productCanvas.locator('[data-cms-bound="products.title"]');
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

  // A nested content leaf cannot receive an instance-only style override.
  await expect(style.getByText(/no registered design source/)).toBeVisible();
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
  const canvasWidth = await page.locator('iframe[title="Website canvas"]').evaluate((element) => Math.round(element.parentElement!.getBoundingClientRect().width));
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
  const cmsImage = canvas.locator('[data-cms-bound="articles.coverImage"]');
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

  const boundTitle = canvas.locator('[data-cms-bound="products.title"]');
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

test("content stays selection-only when a CMS template has no published preview items", async ({ page }) => {
  await page.route("**/api/cms/collections/products/records**", async (route) => {
    const response = await route.fetch();
    const payload = await response.json() as { data: { records: unknown[]; total: number } };
    payload.data.records = [];
    payload.data.total = 0;
    await route.fulfill({ response, json: payload });
  });
  await signInAndOpenDesigner(page);
  await choosePage(page, "Product template");
  await expect(page.getByRole("heading", { name: "No published items to preview" })).toBeVisible();
  await expect(page.locator('iframe[title="Website canvas"]')).toHaveCount(0);
  const picker = await openPagePicker(page);
  await picker.getByRole("button", { name: "Browse collection items", exact: true }).click();
  await expect(picker.getByText("No published items.", { exact: true })).toBeVisible();
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
  await expect(menu.getByRole("button", { name: "Publish site" })).toBeVisible();
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

test("global publish refreshes page statuses without replacing dirty page details", async ({ page }) => {
  let aboutStatus = "queued_to_publish";
  await page.route("**/api/cms/collections/page-settings/records**", async (route) => {
    const response = await route.fetch();
    const payload = await response.json() as { data?: { records?: Array<{ values: Record<string, unknown>; publishStatus: string }> } };
    for (const record of payload.data?.records ?? []) {
      if (record.values.pagePath === "/") record.publishStatus = "published";
      if (record.values.pagePath === "/about") record.publishStatus = aboutStatus;
    }
    await route.fulfill({ response, json: payload });
  });
  await page.route("**/api/cms/publish", async (route) => {
    aboutStatus = "published";
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: { published: 1 } }) });
  });
  await page.route("**/api/deploy", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, data: { triggered: false, message: "E2E deploy stub." } }) });
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
  await publishing.getByRole("button", { name: "Publish site" }).click();
  await expect(page.getByText("Publishing not configured", { exact: true })).toBeVisible();
  await expect(homeName).toHaveValue("Home details draft preserved through publish");
  await expectPageState(home, "changed", "Changes", "rgb(32, 100, 236)");
  await expectPageState(about, "published", "Published", "rgb(239, 239, 238)");

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
  await styles.getByRole("tab", { name: "Custom CSS" }).click();
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
  await styles.getByRole("tab", { name: "Custom CSS" }).click();
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
