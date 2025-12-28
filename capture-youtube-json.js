/**
 * Automated YouTube JSON capture script
 * Captures the exact JSON schema that gets sent to Figma
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const EXTENSION_PATH = path.join(__dirname, "chrome-extension", "dist");
const TEST_URL = "https://www.youtube.com/watch?v=NIk_0AW5hFU";
const OUTPUT_DIR = path.join(__dirname, "test-output");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureYouTubeJSON() {
  console.log("🎯 YouTube JSON Capture Script\n");
  console.log("=".repeat(80));
  console.log(`📺 URL: ${TEST_URL}\n`);

  if (!fs.existsSync(EXTENSION_PATH)) {
    console.error(
      "❌ Extension not built. Run: cd chrome-extension && npm run build"
    );
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--start-maximized",
    ],
    defaultViewport: { width: 1920, height: 1080 },
    timeout: 60000,
  });

  try {
    const page = await browser.newPage();
    let capturedJSON = null;

    // Intercept messages from the page
    await page.exposeFunction("__saveCapture", (data) => {
      console.log("✅ Captured JSON data!");
      capturedJSON = data;
    });

    // Inject script to listen for capture completion
    await page.evaluateOnNewDocument(() => {
      window.addEventListener("message", (event) => {
        if (event.data.type === "EXTRACTION_COMPLETE") {
          console.log("🎯 EXTRACTION_COMPLETE detected, saving data...");
          window.__saveCapture(event.data.data);
        }
      });
    });

    console.log("📍 Loading YouTube page...");
    await page.goto(TEST_URL, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("✅ Page loaded, waiting for page to settle...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Trigger capture programmatically
    console.log("📍 Triggering capture programmatically...");

    // Method 1: Try to click extension icon via DevTools Protocol
    // Note: This might not work due to Chrome security, so we'll use postMessage fallback

    // Method 2: Post message to trigger capture
    await page.evaluate(() => {
      console.log("📤 Posting START_EXTRACTION message...");
      window.postMessage(
        { type: "START_EXTRACTION", allowNavigation: false },
        "*"
      );
    });

    console.log(
      "✅ Capture triggered, waiting for completion (up to 120s)...\n"
    );

    // Wait for capture to complete
    const startTime = Date.now();
    const maxWait = 120000; // 120 seconds

    while (Date.now() - startTime < maxWait && !capturedJSON) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      if (elapsed % 10 === 0) {
        console.log(`   ⏳ ${elapsed}s elapsed, waiting for capture...`);
      }

      // Check if we captured data
      if (capturedJSON) {
        console.log("✅ Capture completed!");
        break;
      }
    }

    if (!capturedJSON) {
      console.error("❌ Capture did not complete within 120 seconds");
      console.error("   This could mean:");
      console.error("   - Extension is not loaded");
      console.error("   - Content script is not injected");
      console.error("   - Capture failed or timed out");
      console.error("\n   Checking page state...");

      // Try to extract any capture data from window object
      const windowData = await page.evaluate(() => {
        return {
          hasCaptureData: !!window.lastCaptureData,
          extensionLoaded: !!document.documentElement.getAttribute(
            "data-web-to-figma-installed"
          ),
          captureStatus: document.body?.getAttribute("data-capture-status"),
        };
      });

      console.log("   Window state:", windowData);

      if (windowData.hasCaptureData) {
        console.log("   ℹ️ Found capture data in window, extracting...");
        capturedJSON = await page.evaluate(() => window.lastCaptureData);
      }
    }

    if (capturedJSON) {
      const outputFile = path.join(
        OUTPUT_DIR,
        `youtube-capture-${Date.now()}.json`
      );

      // Pretty-print the JSON
      fs.writeFileSync(outputFile, JSON.stringify(capturedJSON, null, 2));

      console.log("\n" + "=".repeat(80));
      console.log("✅ SUCCESS - JSON Captured!");
      console.log("=".repeat(80));
      console.log(`📁 Output: ${outputFile}`);

      // Print summary
      const tree =
        capturedJSON?.captures?.[0]?.data?.root || capturedJSON?.root;
      const assets =
        capturedJSON?.captures?.[0]?.data?.assets || capturedJSON?.assets;
      const metadata =
        capturedJSON?.captures?.[0]?.data?.metadata || capturedJSON?.metadata;

      if (tree) {
        console.log(`\n📊 Capture Summary:`);
        console.log(`   Root node type: ${tree.type}`);
        console.log(`   Children: ${tree.children?.length || 0}`);
        console.log(`   Layout: ${tree.layout?.width}x${tree.layout?.height}`);

        if (tree.fills) {
          console.log(`   Fills: ${tree.fills.length}`);
          tree.fills.forEach((fill, i) => {
            console.log(
              `     ${i + 1}. ${fill.type}${
                fill.color
                  ? ` - rgba(${fill.color.r}, ${fill.color.g}, ${fill.color.b}, ${fill.color.a})`
                  : ""
              }${fill.imageRef ? ` - image: ${fill.imageRef}` : ""}`
            );
          });
        }
      }

      if (assets?.images) {
        console.log(`   Images: ${Object.keys(assets.images).length}`);
      }

      if (metadata) {
        console.log(
          `   Viewport: ${metadata.viewportWidth}x${metadata.viewportHeight}`
        );
      }

      console.log(
        "\n✅ You can now analyze the JSON to diagnose rendering issues"
      );
      return 0;
    } else {
      console.error("\n" + "=".repeat(80));
      console.error("❌ FAILED - No JSON data captured");
      console.error("=".repeat(80));
      return 1;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    return 1;
  } finally {
    console.log("\n⏳ Keeping browser open for 5s for inspection...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await browser.close();
  }
}

captureYouTubeJSON()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
