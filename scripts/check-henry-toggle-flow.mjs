import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.UI_AUDIT_BASE_URL ?? "http://127.0.0.1:3000";
const login = process.env.COWORKER_SMOKE_LOGIN ?? "admin@easa.local";
const password = process.env.COWORKER_SMOKE_PASSWORD ?? "EasaTest123!";

async function signIn(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 45_000 });
  await page.getByRole("button", { name: "Sign In" }).evaluate((button) => button.click());
  await page.locator("#ll-email").fill(login);
  await page.locator("#ll-pw").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL(/\/(?:dashboard|updates)(?:\/|$)/, { timeout: 10_000 });
}

async function verifyViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport });
  await signIn(page);

  const open = page.getByRole("button", { name: "Open Henry" }).last();
  await open.waitFor({ timeout: 10_000 });
  await open.click();

  const dialog = page.getByRole("dialog", { name: "Henry compliance coworker" });
  await dialog.waitFor();
  await page.screenshot({ path: `/private/tmp/henry-toggle-${name}.png`, fullPage: false });

  const hide = page.getByRole("button", { name: "Hide Henry" });
  await hide.click();
  await dialog.waitFor({ state: "hidden" });
  await page.close();

  return {
    status: "PASS",
    viewport: name,
    evidence: "Top-right toggle opened and hid Henry.",
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  results.push(await verifyViewport(browser, "desktop", { width: 1440, height: 1100 }));
  results.push(await verifyViewport(browser, "mobile", { width: 390, height: 844 }));
  console.log(JSON.stringify({ baseUrl, results }, null, 2));
} finally {
  await browser.close();
}
