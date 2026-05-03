import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.UI_AUDIT_BASE_URL ?? "http://127.0.0.1:3001";
const mode = process.argv[2] ?? "public";

async function runPublicAudit() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const routes = [
    "/",
    "/login",
    "/dashboard",
    "/results",
    "/updates",
    "/changes",
    "/flightbooks",
    "/settings",
    "/history",
    "/notifications",
    "/profile",
  ];

  const report = [];

  for (const route of routes) {
    const errors = [];
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    page.removeAllListeners("requestfailed");
    page.on("console", (m) => {
      if (["error", "warning"].includes(m.type())) {
        errors.push({ type: `console:${m.type()}`, text: m.text() });
      }
    });
    page.on("pageerror", (e) => errors.push({ type: "pageerror", text: e.message }));
    page.on("requestfailed", (req) =>
      errors.push({
        type: "requestfailed",
        text: `${req.method()} ${req.url()} ${req.failure()?.errorText || ""}`.trim(),
      }),
    );

    let status = "ok";
    let finalUrl = "";
    let h1 = "";

    try {
      const resp = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      status = String(resp?.status?.() ?? "no-response");
      finalUrl = page.url();
      h1 = await page.locator("h1").first().innerText().catch(() => "");
    } catch (error) {
      status = "NAV_ERROR";
      errors.push({
        type: "nav",
        text: error instanceof Error ? error.message : String(error),
      });
    }

    const anchors = await page
      .locator("a[href]")
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          text: (n.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
          href: n.getAttribute("href") || "",
        })),
      )
      .catch(() => []);

    const buttons = await page
      .locator("button")
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          text: (n.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
          disabled: n.disabled,
        })),
      )
      .catch(() => []);

    report.push({
      route,
      status,
      finalUrl,
      h1,
      anchorCount: anchors.length,
      buttonCount: buttons.length,
      anchors: anchors.slice(0, 12),
      buttons: buttons.slice(0, 12),
      errors,
    });
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

async function runAuthedAudit() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const log = [];
  const errors = [];
  const routes = [
    "/dashboard",
    "/updates",
    "/changes",
    "/flightbooks",
    "/search",
    "/training/programmes",
    "/flightbooks/upload",
    "/history",
    "/results",
    "/profile",
    "/settings",
    "/notifications",
  ];

  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type())) {
      errors.push({ type: m.type(), text: m.text() });
    }
  });
  page.on("pageerror", (e) => errors.push({ type: "pageerror", text: e.message }));
  page.on("requestfailed", (req) =>
    errors.push({
      type: "requestfailed",
      text: `${req.method()} ${req.url()} ${req.failure()?.errorText || ""}`.trim(),
    }),
  );

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle", timeout: 45000 });
  await page.locator('input[placeholder="admin or name@school.org"]').fill("admin");
  await page.locator('input[type="password"]').fill("EasaTest123");
  await page.getByRole("button", { name: /login/i }).click();
  await page.waitForTimeout(5000);

  const loginMessage = page.url().includes("/login")
    ? await page
        .locator("text=/invalid|error|credentials|failed|incorrect/i")
        .first()
        .innerText()
        .catch(() => "")
    : "";

  log.push({
    step: "after-login",
    url: page.url(),
    h1: await page.locator("h1").first().innerText().catch(() => ""),
    loginMessage,
  });

  if (page.url().includes("/login")) {
    await browser.close();
    console.log(JSON.stringify({ log, errors }, null, 2));
    return;
  }

  for (const route of routes) {
    try {
      await page.goto(`${baseUrl}${route}`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      log.push({
        step: `route:${route}`,
        url: page.url(),
        h1: await page.locator("h1").first().innerText().catch(() => ""),
      });
    } catch (error) {
      log.push({
        step: `route:${route}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (page.url().includes("/settings")) {
    const tabs = ["Users", "Flight books", "RSS feeds", "AI settings"];
    for (const tab of tabs) {
      const btn = page.getByRole("button", { name: tab }).first();
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(200);
        log.push({ step: `tab:${tab}`, url: page.url() });
      }
    }
  }

  await browser.close();
  console.log(JSON.stringify({ log, errors }, null, 2));
}

if (mode === "authed") {
  await runAuthedAudit();
} else {
  await runPublicAudit();
}
