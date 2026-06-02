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
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 45_000 });
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.locator("#ll-email").fill(login);
    await page.locator("#ll-pw").fill(password);
    await page.getByRole("button", { name: "Login" }).click();
    await page.waitForURL(/\/(?:dashboard|updates)(?:\/|$)/, { timeout: 10_000 }).catch(() => {});
    if (!/\/(?:dashboard|updates)(?:\/|$)/.test(page.url())) {
      const loginError = await page.locator(".ll-login-panel").innerText().catch(() => "");
      results.push(result(
        "NEEDS DATA/ENV",
        "Login",
        loginError.includes("Invalid login credentials")
          ? "Smoke credentials did not authenticate."
          : `Authenticated app route did not open. Current URL: ${page.url()}`,
      ));
      return;
    }
    results.push(result("PASS", "Login", `Authenticated at ${page.url()}.`));

    await page.getByRole("button", { name: /(?:Open )?Compliance coworker/i }).first().click();
    await page.getByRole("dialog", { name: "Compliance coworker" }).waitFor();
    results.push(result("PASS", "Open drawer", "Compliance coworker drawer is visible."));

    await page.getByRole("button", { name: "Toggle chat history" }).click();
    const createChatResponse = page.waitForResponse(
      (response) => response.url().endsWith("/api/coworker/conversations") && response.request().method() === "POST",
      { timeout: 45_000 },
    );
    await page.getByRole("button", { name: "New chat" }).click();
    const createResponse = await createChatResponse;
    if (!createResponse.ok()) {
      const createBody = await createResponse.json().catch(() => ({}));
      results.push(result(
        createResponse.status() === 500 ? "NEEDS DATA/ENV" : "FAIL",
        "Create chat",
        createResponse.status() === 500
          ? "Conversation API returned 500. Inspect server logs; if coworker tables are missing, apply the Supabase migration and rerun."
          : `Conversation API returned ${createResponse.status()}: ${JSON.stringify(createBody)}`,
      ));
      return;
    }
    results.push(result("PASS", "Create chat", "New private conversation created."));

    await page.getByLabel("Message compliance coworker").fill(
      "What does our PPL manual say about solo flights?",
    );
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

    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"][aria-label="Compliance coworker"]');
      return Boolean(dialog?.querySelector('[data-role="assistant"] .whitespace-pre-wrap'));
    }, { timeout: 45_000 });
    const dialog = page.getByRole("dialog", { name: "Compliance coworker" });
    const timelineMessages = await dialog.locator(".whitespace-pre-wrap").allInnerTexts();
    const assistantMessages = await dialog.locator('[data-role="assistant"] .whitespace-pre-wrap').allInnerTexts();
    if (
      !timelineMessages.includes("What does our PPL manual say about solo flights?") ||
      assistantMessages.length < 1
    ) {
      results.push(result("FAIL", "Send message", "Saved timeline did not contain both the user question and assistant reply."));
      return;
    }
    results.push(result("PASS", "Send message", "Saved chat timeline contains the user question and an assistant response."));

    await page.getByRole("link", { name: "Flight books" }).first().click();
    await page.waitForURL(/\/flightbooks/, { timeout: 45_000 });
    const drawerStillVisible = await page.getByRole("dialog", { name: "Compliance coworker" }).isVisible();
    results.push(drawerStillVisible
      ? result("PASS", "Navigation persistence", "Drawer stayed open while navigating to Flight books.")
      : result("FAIL", "Navigation persistence", "Drawer closed during signed-in navigation."));
  } catch (error) {
    results.push(result("FAIL", "Smoke flow", error instanceof Error ? error.message : String(error)));
  } finally {
    await browser?.close().catch(() => {});
    console.log(JSON.stringify({ baseUrl, results }, null, 2));
  }
}

await run();
