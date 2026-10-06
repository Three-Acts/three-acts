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

async function openCurrentPageDetails(page: import("@playwright/test").Page) {
  await (await openPagePicker(page)).getByRole("button", { name: "Current page details", exact: true }).click();
}

async function openDesignerTab(page: import("@playwright/test").Page) {
  const workspace = page.getByRole("navigation", { name: "Workspace" });
  await expect(workspace.getByRole("button")).toHaveText(["Designer", "CMS", "Site"]);
  await expect(workspace.getByRole("button", { name: "Designer", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Choose page" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Preview item" })).toHaveCount(0);
  await expect(page.getByText("Preview item", { exact: true })).toHaveCount(0);
}

async function signInAndOpenDesigner(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await expect(page.getByRole("heading", { name: "Back of house." })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("navigation", { name: "Workspace" })).toBeVisible();
  await openDesignerTab(page);
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Home");
}

test("canvas hover previews selection types and click opens the correct docked field editor", async ({ page }) => {
  await signInAndOpenDesigner(page);

  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const hero = canvas.locator('[data-static-field="home.hero_section.display_1"]');
  const overlay = canvas.locator("#three-acts-editor-selection");

  // Hover is only a visual affordance. It should not open the field editor.
  await hero.hover();
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute("data-category", "component");
  await expect(overlay).toHaveAttribute("data-label", /.+/);
  await expect(overlay).toHaveCSS("--editor-selection-color", "#16a34a");
  await expect(page.getByRole("complementary", { name: "Selected field editor" })).toHaveCount(0);

  // Clicking the same registered field opens an editable docked panel and
  // browser-saved drafts survive a reload.
  await hero.click();
  const panel = page.getByRole("complementary", { name: "Selected field editor" });
  await expect(panel).toBeVisible();
  const selectedField = panel.locator("#selected-field");
  await expect(selectedField).toHaveValue("The client website template that ships production-ready.");
  const edited = "An intentionally selected and browser-saved headline.";
  await selectedField.fill(edited);
  await expect(hero).toHaveText(edited);
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
  const cmsPanel = page.getByRole("complementary", { name: "Selected field editor" });
  await expect(cmsPanel).toBeVisible();
  await expect(cmsPanel.getByText("CMS field", { exact: true })).toBeVisible();
  await expect(cmsPanel.locator("#selected-field")).toHaveAttribute("aria-readonly", "true");
  await expect(cmsPanel.getByText(/managed in the CMS/i)).toBeVisible();

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
  await expect(cmsPanel.getByText("CMS field", { exact: true })).toBeVisible();
  await unbound.click();
  const elementPanel = page.getByRole("complementary", { name: "Selected field editor" });
  await expect(elementPanel.getByText("Element", { exact: true })).toBeVisible();
  await expect(elementPanel.locator("#selected-field")).toHaveAttribute("aria-readonly", "true");
  await expect(elementPanel.getByText(/not set up for editing yet/i)).toBeVisible();
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
  await expect(page.locator("#selected-field")).toHaveValue("Shop");

  await hero.click();
  await expect(page.locator("#selected-field")).toHaveValue("The client website template that ships production-ready.");
  await page.locator("#selected-field").fill(firstEdit);
  await expect(hero).toHaveText(firstEdit);
  await expect(page.getByRole("button", { name: "Review & push" })).toBeEnabled();
  await page.getByLabel("Search fields").fill("display");
  await expect(page.getByRole("button", { name: /display/i })).toBeVisible();

  await page.reload();
  await openDesignerTab(page);
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Home");
  const reloadedCanvas = page.frameLocator('iframe[title="Website canvas"]');
  const reloadedHero = reloadedCanvas.locator('[data-static-field="home.hero_section.display_1"]');
  await expect(reloadedHero).toHaveText(firstEdit);

  await page.getByLabel("mobile preview").click();
  await expect(page.getByLabel("mobile preview")).toHaveAttribute("aria-pressed", "true");
  const canvasWidth = await page.locator('iframe[title="Website canvas"]').evaluate((element) => Math.round(element.parentElement!.getBoundingClientRect().width));
  expect(canvasWidth).toBe(390);
  await page.getByLabel("desktop preview").click();

  const aboutPicker = await openPagePicker(page);
  await aboutPicker.getByRole("searchbox").fill("About");
  await aboutPicker.getByRole("button", { name: "Open page About", exact: true }).click();
  await expect(page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="about.about.title_5"]')).toBeVisible();
  await page.getByLabel("Search fields").fill("story");
  await expect(page.getByRole("button", { name: /story/i }).first()).toBeVisible();

  const homePicker = await openPagePicker(page);
  await homePicker.getByRole("searchbox").fill("Home");
  await homePicker.getByRole("button", { name: "Open page Home", exact: true }).click();
  const homeHero = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]');
  await homeHero.click();
  const directField = page.locator("#selected-field");
  await expect(directField).toHaveValue(firstEdit);
  await directField.fill(directEdit);
  await expect(homeHero).toHaveText(directEdit);

  await page.getByRole("button", { name: "Discard page draft" }).click();
  const discard = page.getByRole("alertdialog", { name: "Discard this page’s draft?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Cancel" }).click();
  await expect(homeHero).toHaveText(directEdit);
  await page.getByRole("button", { name: "Discard page draft" }).click();
  await page.getByRole("alertdialog", { name: "Discard this page’s draft?" }).getByRole("button", { name: "Discard draft" }).click();
  await expect(homeHero).toHaveText("The client website template that ships production-ready.");
  await expect(page.getByRole("button", { name: "Review & push" })).toBeDisabled();

  await homeHero.click();
  await page.locator("#selected-field").fill(pushedEdit);
  await expect(homeHero).toHaveText(pushedEdit);
  await expect(page.getByRole("button", { name: "Review & push" })).toBeEnabled();
  await page.getByRole("button", { name: "Review & push" }).click();
  await expect(page.getByRole("dialog", { name: "Review changes" })).toBeVisible();
  await expect(page.getByText("One commit to test/site on content.")).toBeVisible();
  await page.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByText("Pushed to GitHub. Your hosting service can now rebuild the site.")).toBeVisible();
  await expect(homeHero).toHaveText(pushedEdit);
  await expect(page.getByRole("button", { name: "Review & push" })).toBeDisabled();

  // A full reload reads the committed file back from the local GitHub REST stub.
  await page.reload();
  await openDesignerTab(page);
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Home");
  await expect(page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]')).toHaveText(pushedEdit);

  expect(failedRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-designer-after-push.png", import.meta.url)), fullPage: true });
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
  await expect(canvas.locator('[data-static-field="home.hero_section.display_1"]')).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Content inspector" })).toBeVisible();
  await expect.poll(() => iframe.evaluate((element) => Math.round(element.parentElement!.getBoundingClientRect().width))).toBeLessThan(initialCanvasWidth);
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
  const selectedField = page.locator("#selected-field");
  await expect(selectedField).toHaveValue("What you get");

  const boundTitle = canvas.locator('[data-cms-bound="products.title"]');
  await expect(boundTitle).toBeVisible();
  await boundTitle.click();
  await boundTitle.dblclick();
  await expect(selectedField).toHaveValue("Web App (Astro Static Site)");
  await expect(selectedField).toHaveAttribute("aria-readonly", "true");
  await expect(boundTitle).not.toHaveAttribute("contenteditable");

  const editedCopy = "What the product page includes (E2E draft)";
  await templateCopy.click();
  await expect(selectedField).toHaveValue("What you get");
  await selectedField.fill(editedCopy);
  await expect(templateCopy).toHaveText(editedCopy);

  await openCurrentPageDetails(page);
  const panel = page.getByRole("complementary", { name: "Page details" });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/Collection fields are managed in CMS\./)).toBeVisible();
  const detailCopy = panel.getByLabel(/what you get/i);
  await expect(detailCopy).toHaveValue(editedCopy);
  const editedDetail = "What the product page includes after details editing (E2E)";
  await detailCopy.fill(editedDetail);
  await expect(templateCopy).toHaveText(editedDetail);
  await expect(page.getByRole("button", { name: "Review & push" })).toBeEnabled();
  await canvas.locator("body").evaluate((element) => element.ownerDocument.getSelection()?.removeAllRanges());
  await page.screenshot({ path: fileURLToPath(new URL("../artifacts/cms-template-details.png", import.meta.url)), fullPage: true });

  await page.getByRole("button", { name: "Review & push" }).click();
  await expect(page.getByRole("dialog", { name: "Review changes" })).toBeVisible();
  await expect(page.getByText("One commit to test/site on content.")).toBeVisible();
  await page.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByText("Pushed to GitHub. Your hosting service can now rebuild the site.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Review & push" })).toBeDisabled();
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

test("a CMS template stays editable when its collection has no published preview items", async ({ page }) => {
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
  await expect(page.getByRole("complementary", { name: "Content inspector" })).toBeVisible();
  const copyField = page.getByRole("button", { name: /Edit what you get:/i });
  await expect(copyField).toBeVisible();
  await copyField.click();
  const selectedField = page.locator("#selected-field");
  await expect(selectedField).toBeVisible();
  await selectedField.fill(`${await selectedField.inputValue()} (edited without a preview)`);
  await expect(page.getByRole("button", { name: "Review & push" })).toBeEnabled();
});

test("a GitHub update during a browser draft blocks a stale push", async ({ page, request }) => {
  await signInAndOpenDesigner(page);
  const hero = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]');
  await expect(hero).toBeVisible();
  await hero.click();
  await page.locator("#selected-field").fill(firstEdit);

  const homePath = "packages/static-content/src/documents/home.json";
  const updatedContent = JSON.parse(readFileSync(new URL(`../../../../../${homePath}`, import.meta.url), "utf8")) as Record<string, unknown>;
  const heroSection = updatedContent.hero_section as Record<string, string>;
  heroSection.display_1 = "Changed from GitHub while this draft was open.";
  const externalChange = await request.post("http://127.0.0.1:5380/__e2e/external-change", {
    data: { path: homePath, content: `${JSON.stringify(updatedContent, null, 2)}\n` }
  });
  expect(externalChange.ok()).toBeTruthy();

  await page.getByRole("button", { name: "Review & push" }).click();
  await page.getByRole("button", { name: "Push to GitHub" }).click();
  await expect(page.getByRole("alert")).toContainText("A page changed on GitHub since you started editing");
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByRole("button", { name: "Review & push" })).toBeEnabled();
  await expect(hero).toHaveText(firstEdit);
});

test("disconnected GitHub workspace lets editors review but disables pushing", async ({ page }) => {
  await page.route("**/api/editor/content", async (route) => {
    const response = await route.fetch();
    const payload = await response.json() as { ok: boolean; data: { connected: boolean; repository: string | null; branch: string | null } };
    payload.data.connected = false;
    payload.data.repository = null;
    payload.data.branch = null;
    await route.fulfill({ response, json: payload });
  });
  await signInAndOpenDesigner(page);
  await expect(page.getByText("GitHub not connected", { exact: true })).toBeVisible();
  const hero = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  await page.locator("#selected-field").fill(firstEdit);
  await page.getByRole("button", { name: "Review & push" }).click();
  await expect(page.getByRole("dialog", { name: "Review changes" })).toContainText("GitHub is not connected.");
  await expect(page.getByRole("button", { name: "Push to GitHub" })).toBeDisabled();
});
