import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.UI_AUDIT_BASE_URL ?? "http://127.0.0.1:3000";
const login = process.env.COWORKER_SMOKE_LOGIN ?? "admin@easa.local";
const password = process.env.COWORKER_SMOKE_PASSWORD ?? "EasaTest123!";
const screenshotPath = "/private/tmp/run-ai-reduced.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

try {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Sign In" }).evaluate((button) => button.click());
  await page.locator("#ll-email").fill(login);
  await page.locator("#ll-pw").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL(/\/(?:dashboard|updates)/);
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });

  const action = page.locator(".fl-run-ai-btn-primary");
  await action.waitFor();
  const bounds = await action.boundingBox();

  if (!bounds || bounds.width > 230 || bounds.height > 60) {
    throw new Error(`Run AI action remains oversized: ${JSON.stringify(bounds)}`);
  }

  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(JSON.stringify({ status: "PASS", bounds, screenshotPath }, null, 2));
} finally {
  await browser.close();
}
