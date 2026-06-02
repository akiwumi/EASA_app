import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.UI_AUDIT_BASE_URL ?? "http://127.0.0.1:3000";
const login = process.env.COWORKER_SMOKE_LOGIN ?? "admin@easa.local";
const password = process.env.COWORKER_SMOKE_PASSWORD ?? "EasaTest123!";

function result(status, step, evidence) {
  return { status, step, evidence };
}

async function run() {
  const results = [];
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 45_000 });
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.locator("#ll-email").fill(login);
    await page.locator("#ll-pw").fill(password);
    await page.getByRole("button", { name: "Login" }).click();
    await page.waitForURL(/\/(?:dashboard|updates)(?:\/|$)/, { timeout: 10_000 }).catch(() => {});
    if (!/\/(?:dashboard|updates)(?:\/|$)/.test(page.url())) {
      results.push(result("NEEDS DATA/ENV", "Login", `Authenticated app route did not open. Current URL: ${page.url()}`));
      return;
    }
    results.push(result("PASS", "Login", `Authenticated at ${page.url()}.`));

    const welcome = page.getByRole("button", { name: "Open Henry welcome message" });
    await welcome.waitFor({ timeout: 10_000 });
    if (!(await welcome.innerText()).includes("Hello, how can I help you?")) {
      results.push(result("FAIL", "Welcome bubble", "Henry greeting text was not visible."));
      return;
    }
    await welcome.click();
    const dialog = page.getByRole("dialog", { name: "Henry compliance coworker" });
    await dialog.waitFor();
    results.push(result("PASS", "Welcome bubble", "Greeting opened Henry."));

    await page.getByRole("button", { name: "Toggle Henry chat history" }).click();
    const createResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/coworker/conversations") && response.request().method() === "POST",
      { timeout: 45_000 },
    );
    await page.getByRole("button", { name: "New chat" }).click();
    const createResponse = await createResponsePromise;
    if (!createResponse.ok()) {
      results.push(result("NEEDS DATA/ENV", "Create chat", `Conversation API returned ${createResponse.status()}. Apply coworker migrations and rerun.`));
      return;
    }
    const created = await createResponse.json();
    const createdId = created?.conversation?.id;
    if (typeof createdId !== "string") throw new Error("Created Henry conversation ID unavailable.");
    results.push(result("PASS", "Create chat", "New private Henry conversation created."));

    await page.getByLabel("Message Henry").fill("What does our PPL manual say about solo flights?");
    const sendResponsePromise = page.waitForResponse(
      (response) => /\/api\/coworker\/conversations\/[^/]+\/messages$/.test(response.url())
        && response.request().method() === "POST",
      { timeout: 45_000 },
    );
    await page.getByRole("button", { name: "Send message" }).click();
    const sendResponse = await sendResponsePromise;
    if (!sendResponse.ok()) {
      results.push(result("FAIL", "Send message", `Message API returned ${sendResponse.status()}.`));
      return;
    }
    await dialog.locator('[data-role="assistant"] .whitespace-pre-wrap').last().waitFor({ timeout: 45_000 });
    results.push(result("PASS", "Send message", "Henry saved the question and assistant response."));

    await page.getByRole("link", { name: "Flight books" }).first().click();
    await page.waitForURL(/\/flightbooks/, { timeout: 45_000 });
    if (!(await dialog.isVisible())) {
      results.push(result("FAIL", "Navigation persistence", "Henry closed during signed-in navigation."));
      return;
    }
    results.push(result("PASS", "Navigation persistence", "Henry stayed open on Flight books."));

    const beforeDrag = await dialog.boundingBox();
    const dragHandle = dialog.locator("[data-henry-drag-handle]");
    const handleBox = await dragHandle.boundingBox();
    if (!beforeDrag || !handleBox) throw new Error("Henry drag geometry unavailable.");
    await page.mouse.move(handleBox.x + 140, handleBox.y + 24);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 80, handleBox.y + 84, { steps: 4 });
    await page.mouse.up();
    const afterDrag = await dialog.boundingBox();
    if (!afterDrag || (afterDrag.x === beforeDrag.x && afterDrag.y === beforeDrag.y)) {
      results.push(result("FAIL", "Drag Henry", "Henry position did not change."));
      return;
    }
    results.push(result("PASS", "Drag Henry", "Henry moved on screen."));

    const resize = page.getByRole("button", { name: "Resize Henry" });
    const resizeBox = await resize.boundingBox();
    const beforeResize = await dialog.boundingBox();
    if (!resizeBox || !beforeResize) throw new Error("Henry resize geometry unavailable.");
    await page.mouse.move(resizeBox.x + 12, resizeBox.y + 12);
    await page.mouse.down();
    await page.mouse.move(resizeBox.x - 52, resizeBox.y - 52, { steps: 4 });
    await page.mouse.up();
    const afterResize = await dialog.boundingBox();
    if (!afterResize || (afterResize.width === beforeResize.width && afterResize.height === beforeResize.height)) {
      results.push(result("FAIL", "Resize Henry", "Henry size did not change."));
      return;
    }
    results.push(result("PASS", "Resize Henry", "Henry resized on screen."));

    const archiveResponsePromise = page.waitForResponse(
      (response) => /\/api\/coworker\/conversations\/[^/]+$/.test(response.url())
        && response.request().method() === "PATCH",
      { timeout: 45_000 },
    );
    await dialog.locator(`[data-conversation-id="${createdId}"]`).getByRole("button", { name: /^Archive / }).click();
    const archiveResponse = await archiveResponsePromise;
    if (!archiveResponse.ok()) {
      results.push(result("NEEDS DATA/ENV", "Archive chat", `Archive API returned ${archiveResponse.status()}. Apply archive migration and rerun.`));
      return;
    }
    results.push(result("PASS", "Archive chat", "Henry conversation moved out of the active list."));

    await dialog.getByRole("link", { name: "Open Henry archive" }).click();
    await page.waitForURL(/\/coworker\/archive$/, { timeout: 45_000 });
    const restore = page.locator(`[data-conversation-id="${createdId}"]`).getByRole("button", { name: "Restore" });
    await restore.waitFor({ timeout: 10_000 });
    const restoreResponsePromise = page.waitForResponse(
      (response) => /\/api\/coworker\/conversations\/[^/]+$/.test(response.url())
        && response.request().method() === "PATCH",
      { timeout: 45_000 },
    );
    const activeRefreshPromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/coworker/conversations")
        && response.request().method() === "GET",
      { timeout: 45_000 },
    );
    await restore.click();
    const restoreResponse = await restoreResponsePromise;
    if (!restoreResponse.ok()) {
      results.push(result("FAIL", "Restore chat", `Restore API returned ${restoreResponse.status()}.`));
      return;
    }
    await activeRefreshPromise;
    await page.locator(`[data-conversation-id="${createdId}"]`).waitFor({ state: "hidden", timeout: 10_000 });
    await page.getByRole("button", { name: "Open Henry" }).last().click();
    await dialog.waitFor({ timeout: 10_000 });
    const restoredConversation = dialog.locator(`[data-conversation-id="${createdId}"]`);
    if (!(await dialog.getByText("Active conversations", { exact: true }).isVisible())) {
      await dialog.getByRole("button", { name: "Toggle Henry chat history" }).click();
    }
    await restoredConversation.waitFor({ timeout: 10_000 });
    results.push(result("PASS", "Restore chat", "Archived Henry conversation returned to the active list."));
  } catch (error) {
    results.push(result("FAIL", "Smoke flow", error instanceof Error ? error.message : String(error)));
  } finally {
    await browser?.close().catch(() => {});
    console.log(JSON.stringify({ baseUrl, results }, null, 2));
  }
}

await run();
