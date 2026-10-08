import { expect, test, type Page } from "@playwright/test";
import type { CmsRecord } from "@three-acts/cms-schema";

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("publication-browser@example.com");
  await page.getByLabel("Password").fill("local-publication-test");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Choose page" })).toContainText("Home");
  await expect(page.getByRole("button",{name:"Add element",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Content panel",exact:true}).click();
  await page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]').click();
  await expect(page.locator("#selected-text")).toBeVisible();
}

async function cms<T>(page: Page, path: string, method = "GET", body?: unknown): Promise<T> {
  return page.evaluate(async ({ path, method, body }) => {
    const token = JSON.parse(localStorage.getItem("three-acts:cms-session:v1")!).session.token;
    const response = await fetch(`/api/cms${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? "Fixture setup failed");
    return result.data;
  }, { path, method, body }) as Promise<T>;
}

async function review(page: Page, headline: string) {
  await page.locator("#selected-text").fill(headline);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Review & publish", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review publication", exact: true })).toBeVisible();
}

function mutationLog(page: Page) {
  const calls: string[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && ["/api/editor/push", "/api/cms/publish", "/api/editor/deploy"].includes(path)) calls.push(path);
  });
  return calls;
}

test("publication resumes a lost commit response and failed deployment without publishing a newly queued record or resetting later undo", async ({ page }) => {
  await page.request.post("http://127.0.0.1:5381/__e2e/control", { data: { state: "ERROR", markerMatches: false } });
  await signIn(page);
  const calls = mutationLog(page);
  await review(page, "A recoverable local release");
  const sample = (await cms<{ records: CmsRecord[] }>(page, "/collections/articles/records?publishStatus=published&limit=100")).records[0];
  const created = await cms<CmsRecord>(page, "/collections/articles/records", "POST", { values: { ...sample.values, title: "Queued after review", slug: "queued-after-publication-review" } });
  await cms(page, "/collections/articles/status", "POST", { recordIds: [created.id], publishStatus: "queued_to_publish" });
  let lost = false;
  await page.route("**/api/editor/push", async route => {
    if (lost) return route.continue();
    lost = true;
    const committed = await route.fetch();
    expect(committed.status()).toBe(200);
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Publish reviewed changes", exact: true }).click();
  const status = page.getByRole("region", { name: "Publication status" });
  await expect(status).toContainText("Publication paused");
  expect(calls).toEqual(["/api/editor/push"]);
  const head = (await (await page.request.get("http://127.0.0.1:5380/repos/test/site/git/ref/heads/content")).json()).object.sha;
  await page.reload();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Resume publication", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Publishing" }).getByRole("alert")).toContainText("deployment failed");
  expect(calls).toEqual(["/api/editor/push", "/api/editor/push", "/api/cms/publish", "/api/editor/deploy"]);
  await expect(page.getByText(/changed on GitHub. Your drafts are preserved/)).toHaveCount(0);
  expect((await (await page.request.get("http://127.0.0.1:5380/repos/test/site/git/ref/heads/content")).json()).object.sha).toBe(head);
  expect((await cms<CmsRecord>(page, `/collections/articles/records/${created.id}`)).publishStatus).toBe("queued_to_publish");
  const failedDeployments = (await (await page.request.get("http://127.0.0.1:5381/__e2e/status")).json()).creates;
  await page.request.post("http://127.0.0.1:5381/__e2e/control", { data: { futureState: "BUILDING" } });
  await page.getByRole("button", { name: "Resume publication", exact: true }).click();
  await expect(status).toContainText("Deploying committed revision");
  expect((await (await page.request.get("http://127.0.0.1:5381/__e2e/status")).json()).creates).toBe(failedDeployments + 1);
  expect(calls.filter(call => call === "/api/editor/push")).toHaveLength(2);
  expect(calls.filter(call => call === "/api/cms/publish")).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Review & publish", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Close publishing" }).click();
  const hero = page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]');
  await hero.click();
  await page.locator("#selected-text").fill("An edit after this commit");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Check publication status", exact: true }).click();
  await expect(page.getByRole("button", { name: "Check publication status", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Close publishing" }).click();
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(hero).toHaveText("A recoverable local release");
  await page.getByRole("button", { name: "Redo edit", exact: true }).click();
  await expect(hero).toHaveText("An edit after this commit");
  await page.request.post("http://127.0.0.1:5381/__e2e/control", { data: { state: "READY", markerMatches: true } });
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(status).toContainText("Live revision verified");
  await expect(page.getByLabel("Draft save state")).toContainText("Saved");
});

test("an unreviewed branch update stops publication before CMS or deployment and preserves draft undo", async ({ page }) => {
  await signIn(page);
  const original = await page.locator("#selected-text").inputValue();
  const calls = mutationLog(page);
  await review(page, "A source review that must stop");
  const response = await page.request.get("http://127.0.0.1:5380/repos/test/site/contents/packages/static-content/src/documents/faq.json");
  const file = await response.json();
  const content = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  content.faq.title_2 = "A teammate changed an untouched document";
  await page.request.post("http://127.0.0.1:5380/__e2e/external-change", { data: { path: "packages/static-content/src/documents/faq.json", content: JSON.stringify(content) } });
  await page.getByRole("button", { name: "Publish reviewed changes", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("source branch changed");
  expect(calls).toEqual(["/api/editor/push"]);
  await page.getByRole("button", { name: "Close publishing" }).click();
  await expect(page.locator("#selected-text")).toHaveValue("A source review that must stop");
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await expect(page.locator("#selected-text")).toHaveValue(original);
});

test("a reviewed CMS record changed elsewhere pauses after source commit without deploying newer values", async ({ page }) => {
  await signIn(page);
  const queued = await cms<{ records: CmsRecord[] }>(page, "/collections/articles/records?publishStatus=queued_to_publish&limit=100");
  const record = queued.records[0];
  expect(record).toBeTruthy();
  const calls = mutationLog(page);
  await review(page, "A release with a concurrent CMS edit");
  const newer = { ...record, values: { ...record.values, title: "A newer unreviewed record value" } };
  await cms(page, `/collections/articles/records/${record.id}`, "PUT", { record: newer, expectedModifiedAt: record.modifiedAt });
  await page.getByRole("button", { name: "Publish reviewed changes", exact: true }).click();
  await expect(page.getByRole("region", { name: "Publication status" })).toContainText("conflict");
  expect(calls).toEqual(["/api/editor/push", "/api/cms/publish"]);
  const stored = await cms<CmsRecord>(page, `/collections/articles/records/${record.id}`);
  expect(stored.publishStatus).toBe("queued_to_publish");
  expect(stored.values.title).toBe("A newer unreviewed record value");
  expect(stored.liveValues).toEqual(record.liveValues);
  await page.getByRole("button", { name: "Close publishing" }).click();
  await expect(page.getByLabel("Draft save state")).toContainText("Committed");
});

test("unavailable publication recovery storage prevents every publish mutation and preserves browser drafts", async ({ page }) => {
  await signIn(page);
  const calls = mutationLog(page);
  await review(page, "A draft kept when release storage fails");
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key.startsWith("three-acts:publication:")) throw new Error("Publication storage is unavailable");
      return set.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Publish reviewed changes", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Publication storage is unavailable");
  expect(calls).toEqual([]);
  await page.getByRole("button", { name: "Close publishing" }).click();
  await expect(page.locator("#selected-text")).toHaveValue("A draft kept when release storage fails");
  await page.reload();
  await page.frameLocator('iframe[title="Website canvas"]').locator('[data-static-field="home.hero_section.display_1"]').click();
  await expect(page.locator("#selected-text")).toHaveValue("A draft kept when release storage fails");
});
