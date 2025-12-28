import fs from "fs";
import path from "path";
import puppeteer from "puppeteer"; // IMPORTANT: use puppeteer, not puppeteer-core

const EXT_PATH = "/Users/skirk92/figmacionvert-2/chrome-extension/dist"; // folder containing manifest.json
const YT_URL =
  "https://www.youtube.com/watch?v=LrC9IGf1Qm0&list=RDLrC9IGf1Qm0&start_radio=1";

function assertExtensionPath(extPath) {
  const manifestPath = path.join(extPath, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Extension path invalid. Expected manifest.json at: ${manifestPath}`
    );
  }
}

async function waitForExtensionServiceWorker(browser, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const targets = browser.targets();
    const sw = targets.find(
      (t) =>
        t.type() === "service_worker" &&
        t.url().startsWith("chrome-extension://")
    );
    if (sw) return sw;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

async function run() {
  // Use system Chrome on macOS.
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  console.log("🚀 Launching Chrome...");
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--start-maximized",
      `--load-extension=${EXT_PATH}`, // Try to load it anyway
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Page console logs
    page.on("console", (msg) => {
      console.log(`[PAGE ${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (err) => {
      console.log("[PAGEERROR]", err?.message || String(err));
    });

    console.log("📂 Opening Extensions page...");
    await page.goto("chrome://extensions/", { waitUntil: "domcontentloaded" });

    console.log("\n@USER: Chrome is now open.");
    console.log("1. Please ensure 'Developer mode' is ON (top right).");
    console.log("2. If the extension 'HTML2DESIGN' is not there, click 'Load unpacked' and select:");
    console.log(`   ${EXT_PATH}`);
    console.log("3. Once loaded, please let me know so I can take over.");

    // Keep process alive
    await new Promise(() => {});
  } finally {
    // Intentionally not closing browser
  }
}

run().catch((e) => {
  console.error("💥 Test failed:", e?.stack || String(e));
  process.exit(1);
});
