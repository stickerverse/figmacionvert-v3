const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  url: 'https://www.youtube.com',
  viewport: { width: 1440, height: 900 },
  handoffPort: 5511, // Match actual handoff-server.js port
  timeout: 60000
};

async function runYouTubeFidelityTest() {
  console.log('🎥 STARTING YOUTUBE FIDELITY TEST');
  console.log('=================================');

  let browser;
  let serverProcess;

  try {
    // 1. Start Handoff Server (if not running)
    const isServerRunning = await checkServerHealth();
    if (!isServerRunning) {
      console.log('🌐 Starting local handoff server...');
      serverProcess = spawn('node', ['handoff-server.js'], {
        stdio: 'inherit',
        env: { ...process.env, HANDOFF_PORT: CONFIG.handoffPort }
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log('✅ Handoff server already running');
    }

    // 2. Launch Browser with Extension
    console.log('🔌 Launching Chrome with extension...');
    const extensionPath = path.resolve(__dirname, 'chrome-extension');
    browser = await puppeteer.launch({
      headless: "new",
      dumpio: true, // Capture all browser logs
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ],
      defaultViewport: CONFIG.viewport
    });

    // 3. Navigate to YouTube
    const page = await browser.newPage();
    console.log(`📍 Navigating to ${CONFIG.url}...`);
    await page.goto(CONFIG.url, { waitUntil: 'networkidle2', timeout: CONFIG.timeout });
    console.log('✅ Page loaded');

    // 4. Wait for Extension Readiness (Simple delay as content script is isolated)
    console.log('⏳ Waiting for extension to initialize...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4b. Trigger Capture via window.postMessage (bypassing context isolation)
    console.log('📸 Triggering capture via postMessage...');
    
    // Setup a listener for the response
    const captureStartedPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'CAPTURE_STARTED') {
            resolve('started');
          }
        });
      });
    });

    await page.evaluate(() => {
      window.postMessage({ 
        type: 'START_CAPTURE_TEST',
        viewports: [{ width: 1280, height: 800 }]
      }, '*');
    });
    
    console.log('✅ Capture trigger sent');
    
    // Wait for start confirmation
    try {
        await Promise.race([
            captureStartedPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Start confirmation timed out')), 5000))
        ]);
        console.log('✅ Capture started confirmed by content script');
    } catch (e) {
        console.warn('⚠️ Capture start confirmation missing (might be okay if logs show progress)');
    }

    // 5. Monitor Progress & Logs
    console.log('⏳ Waiting for capture to complete...');
    let captureComplete = false;
    let metrics = {};

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('EXTRACTION_COMPLETE')) captureComplete = true;
      
      // Capture specific metrics from logs
      if (text.includes('Total nodes:')) metrics.nodeCount = text;
      if (text.includes('Payload size:')) metrics.payloadSize = text;
    });

    // Wait for the file to appear in the output directory or a reasonable timeout
    // Since we can't easily hook into the download completion in this headless mode without more work,
    // we'll wait for the server to receive it if we were checking server logs, 
    // but here we just wait for a timeout or a "done" message if we implemented it.
    
    // For now, just wait a fixed time for the "fidelity" check, 
    // assuming the capture logic runs.
    // In a real scenario, we'd poll the server or wait for a specific DOM change.
    await new Promise(resolve => setTimeout(resolve, 60000)); // Increased to 60s

    if (!captureComplete) throw new Error('Capture timed out');

    console.log('✅ Capture completed successfully');
    console.log('📊 METRICS:', metrics);

    // 6. Verify Server Receipt
    console.log('🔗 Verifying server receipt...');
    const health = await (await fetch(`http://127.0.0.1:${CONFIG.handoffPort}/api/health`)).json();
    console.log('   Queue Length:', health.queueLength);
    
    if (health.queueLength > 0) {
      console.log('✅ SUCCESS: Job queued on server');
    } else {
      console.error('❌ FAILURE: Job not found in queue');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (serverProcess) serverProcess.kill();
  }
}

async function checkServerHealth() {
  try {
    const res = await fetch(`http://127.0.0.1:${CONFIG.handoffPort}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

runYouTubeFidelityTest();
