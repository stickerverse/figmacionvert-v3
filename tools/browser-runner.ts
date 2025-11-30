import express from "express";
import puppeteer, { Browser } from "puppeteer";
import path from "path";
import bodyParser from "body-parser";

// Fix for TS2304: Cannot find name 'window' in Node context
declare const window: any;

const app = express();
app.use(bodyParser.json());

const PORT = 5070;
let browser: Browser | null = null;

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;

  const extensionPath = path.resolve(process.cwd(), "chrome-extension/dist");
  console.log(`[BROWSER-RUNNER] Loading extension from: ${extensionPath}`);

  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--disable-features=site-per-process`, 
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  return browser;
}

app.post("/run-capture", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "url required" });
  }

  console.log(`[BROWSER-RUNNER] Received request to capture: ${url}`);

  try {
    const browser = await getBrowser();
    
    // Reuse the first page if available, or create new
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    console.log(`[BROWSER-RUNNER] Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    console.log(`[BROWSER-RUNNER] Page loaded.`);

    // Wait for extension initialization
    await new Promise(r => setTimeout(r, 2000));

    // Trigger capture via postMessage
    console.log('[BROWSER-RUNNER] Triggering capture via postMessage...');
    
    // Setup listener for start confirmation
    const captureStartedPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        (window as any).addEventListener('message', (event: any) => {
          if (event.data && event.data.type === 'CAPTURE_STARTED') {
            resolve('started');
          }
        });
      });
    });

    await page.evaluate(() => {
      (window as any).postMessage({ 
        type: 'START_CAPTURE_TEST',
        viewports: [{ width: 1280, height: 800 }]
      }, '*');
    });

    let captureStatus = "triggered";
    // Wait for confirmation
    try {
      await Promise.race([
        captureStartedPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      console.log('[BROWSER-RUNNER] Capture started successfully.');
      captureStatus = "started";
    } catch (e) {
      console.warn('[BROWSER-RUNNER] Capture start confirmation missing, but proceeding.');
      captureStatus = "confirmation_missing";
    }

    // We return success immediately to the agent-runner.
    // The actual data flow is: Browser -> Extension -> Figma -> Agent Runner (/figma-report)
    res.json({ ok: true, status: captureStatus });

  } catch (e) {
    console.error("[BROWSER-RUNNER] Capture run failed", e);
    res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`[BROWSER-RUNNER] Listening on http://localhost:${PORT}`);
  console.log(`[BROWSER-RUNNER] Run this in a separate terminal to bypass sandbox issues.`);
});
