import puppeteer from "puppeteer";
import path from "path";

const EXT_PATH = "/Users/skirk92/figmacionvert-2/chrome-extension/dist";
const YT_URL = "https://www.youtube.com/watch?v=LrC9IGf1Qm0";

async function run() {
  const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const userDataDir = path.join(process.cwd(), ".chrome-user-data");

  console.log(`🚀 Launching Chrome with extension (UserData: ${userDataDir})...`);
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--start-maximized",
      `--load-extension=${EXT_PATH}`,
      `--user-data-dir=${userDataDir}`,
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

    console.log("🌐 Navigating to YouTube...");
    await page.goto(YT_URL, { waitUntil: "networkidle2", timeout: 60000 });
    console.log("✅ YouTube loaded");

    // Get extension ID - wait for it
    console.log("🔍 Looking for extension service worker...");
    let extensionId = "";
    for (let i = 0; i < 20; i++) {
        const targets = browser.targets();
        const extensionTarget = targets.find(t => t.url().startsWith('chrome-extension://') && t.type() === 'service_worker');
        if (extensionTarget) {
            extensionId = extensionTarget.url().split('/')[2];
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    if (!extensionId) {
      console.log("❌ Targets seen:");
      browser.targets().forEach(t => console.log(`   - ${t.type()}: ${t.url()}`));
      throw new Error("Extension service worker not found after 20 seconds!");
    }
    console.log("🆔 Extension ID:", extensionId);


    // Open Popup
    console.log("📂 Opening extension popup...");
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`, { waitUntil: "domcontentloaded" });
    
    console.log("🎯 Triggering capture...");
    // Wait for the capture button and click it
    await popupPage.waitForSelector("#capture-full-page");
    await popupPage.click("#capture-full-page");
    
    console.log("⏳ Capture started. Monitoring progress...");
    
    // Poll for success or progress
    let captured = false;
    for (let i = 0; i < 60; i++) {
        const dialogVisible = await popupPage.evaluate(() => {
            const dialog = document.querySelector("#capture-dialog");
            return dialog && !dialog.classList.contains("hidden");
        });
        
        if (dialogVisible) {
            console.log("✅ Capture complete dialog seen!");
            captured = true;
            break;
        }
        
        const progressPhase = await popupPage.evaluate(() => {
            const phase = document.querySelector("#progress-phase");
            return phase ? phase.textContent : "";
        });
        if (progressPhase) {
            console.log(`📊 Progress: ${progressPhase}`);
        }
        
        await new Promise(r => setTimeout(r, 2000));
    }

    if (!captured) {
        console.log("⚠️ Capture timed out or failed to show success dialog.");
    }

    console.log("Press Ctrl+C to exit. Browser stays open for inspection.");
    await new Promise(() => {});

  } catch (err) {
    console.error("💥 Error during capture:", err);
  }
}

run();
