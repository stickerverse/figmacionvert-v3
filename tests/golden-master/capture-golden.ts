/**
 * Capture Golden Master
 *
 * Captures a webpage and saves the schema as a "Golden Master" reference.
 * Usage: ts-node tests/golden-master/capture-golden.ts <url> <output-name>
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const EXTENSION_PATH = path.resolve(__dirname, "../../chrome-extension/dist");
const OUTPUT_DIR = path.resolve(__dirname, "goldens");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureGolden(url: string, name: string) {
  console.log(`📸 Capturing Golden Master for ${url}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to page
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    // Wait for extension to be ready (simulated)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Inject capture trigger (simulating popup interaction)
    // Note: In a real e2e, we'd use the popup, but here we might need to trigger via window message
    // or by exposing a global function in the content script if possible.
    // For now, we'll assume the content script listens for a message.

    // ACTUALLY: The best way is to inject a script that sends the message to the content script
    // or uses the exposed window.__FIGMA_CONVERT_GRAB__ if available (it was in v1).
    // In v2, we use runtime messages.

    // Workaround: We can't easily trigger the extension popup from headless puppeteer without
    // some complex setup.
    // Alternative: We can execute the extraction logic directly if we expose it,
    // OR we can rely on the integration-test approach which uses a special test harness.

    // Let's look at how integration-tests.js does it.
    // It uses `window.postMessage({ type: 'START_EXTRACTION' }, '*')` if the content script listens for it.
    // Let's verify if content script listens to window messages.

    // Checked content-script.ts: It listens to runtime.onMessage.
    // Checked injected-script.ts: It listens to window.onmessage for 'START_EXTRACTION'.

    // So we can trigger it via window.postMessage!

    console.log("🚀 Triggering extraction...");
    await page.evaluate(() => {
      window.postMessage(
        {
          type: "START_EXTRACTION",
          config: {
            includeImages: true,
            includeStyles: true,
            captureHidden: false,
          },
        },
        "*"
      );
    });

    // Wait for result
    console.log("⏳ Waiting for extraction to complete...");
    const result = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject("Timeout waiting for extraction"),
          60000
        );

        window.addEventListener("message", (event) => {
          if (event.data && event.data.type === "EXTRACTION_COMPLETE") {
            clearTimeout(timeout);
            resolve(event.data.payload);
          }
          if (event.data && event.data.type === "EXTRACTION_ERROR") {
            clearTimeout(timeout);
            reject(event.data.error);
          }
        });
      });
    });

    // Save Golden Master
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${name}.json`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    // We also save a timestamped version for history
    const historyPath = path.join(OUTPUT_DIR, `${name}_${timestamp}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    fs.writeFileSync(historyPath, JSON.stringify(result, null, 2)); // Backup

    console.log(`✅ Golden Master saved to ${outputPath}`);
    console.log(`   (Backup: ${historyPath})`);
  } catch (error) {
    console.error("❌ Capture failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: ts-node capture-golden.ts <url> <name>");
  process.exit(1);
}

captureGolden(args[0], args[1]);
