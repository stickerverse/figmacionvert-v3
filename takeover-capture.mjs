import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const EXT_PATH = "/Users/skirk92/figmacionvert-2/chrome-extension/dist";
const YT_URL = "https://www.youtube.com/watch?v=LrC9IGf1Qm0";
const USER_DATA_DIR = path.join(process.cwd(), ".chrome-user-data");

async function run() {
  const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  console.log(`🚀 Launching Chrome (UserData: ${USER_DATA_DIR})...`);
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--start-maximized",
      `--load-extension=${EXT_PATH}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  try {
    // 1. Wait for Extension Service Worker
    console.log("🔍 Looking for extension service worker...");
    let extensionId = "";
    for (let i = 0; i < 30; i++) {
        const targets = browser.targets();
        const extensionTarget = targets.find(t => t.url().startsWith('chrome-extension://') && t.type() === 'service_worker');
        if (extensionTarget) {
            extensionId = extensionTarget.url().split('/')[2];
            break;
        }
        
        // Also check for background pages (MV2 style or just in case)
        const backgroundTarget = targets.find(t => t.url().startsWith('chrome-extension://') && t.type() === 'background_page');
        if (backgroundTarget) {
            extensionId = backgroundTarget.url().split('/')[2];
            break;
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    if (!extensionId) {
      console.log("❌ Targets seen:");
      browser.targets().forEach(t => console.log(`   - ${t.type()}: ${t.url()}`));
      console.log("\n@USER: Extension still not found automatically.");
      console.log("Please ensure the extension is loaded in the browser that just opened.");
      console.log("I will wait another 60 seconds for it to appear...");
      
      for (let i = 0; i < 60; i++) {
          const targets = browser.targets();
          const found = targets.find(t => t.url().startsWith('chrome-extension://'));
          if (found) {
              extensionId = found.url().split('/')[2];
              break;
          }
          await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!extensionId) {
        throw new Error("Could not find extension ID.");
    }

    console.log("🆔 Extension ID:", extensionId);

    // 2. Navigate to YouTube
    const page = await browser.newPage();
    page.on("console", (msg) => console.log(`[PAGE ${msg.type()}] ${msg.text()}`));
    
    console.log("🌐 Navigating to YouTube...");
    await page.goto(YT_URL, { waitUntil: "networkidle2", timeout: 60000 });
    console.log("✅ YouTube loaded");

    // 3. Open Popup and Trigger Capture
    console.log("📂 Opening extension popup...");
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`, { waitUntil: "domcontentloaded" });
    
    console.log("🎯 Triggering capture...");
    await popupPage.waitForSelector("#capture-full-page");
    await popupPage.click("#capture-full-page");
    
    console.log("⏳ Capture started. Monitoring progress...");
    
    let captured = false;
    for (let i = 0; i < 120; i++) {
        const status = await popupPage.evaluate(() => {
            const dialog = document.querySelector("#capture-dialog");
            const isVisible = dialog && !dialog.classList.contains("hidden");
            const phase = document.querySelector("#progress-phase")?.textContent || "Unknown";
            const percent = document.querySelector(".progress-percent")?.textContent || "0%";
            return { isVisible, phase, percent };
        });
        
        if (status.isVisible) {
            console.log("✅ Capture complete dialog seen!");
            captured = true;
            break;
        }
        
        console.log(`📊 Progress: ${status.phase} (${status.percent})`);
        await new Promise(r => setTimeout(r, 2000));
    }

    if (!captured) {
        console.log("⚠️ Capture timed out or failed.");
    }

    console.log("🏁 Automation finished. Browser stays open for inspection.");
    await new Promise(() => {});

  } catch (err) {
    console.error("💥 Error:", err);
  }
}

run();
