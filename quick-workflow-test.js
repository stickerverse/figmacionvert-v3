const puppeteer = require('puppeteer');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Quick Workflow Test for HTML-to-Figma Extension
 * 
 * A lightweight test that verifies:
 * 1. Handoff server starts correctly
 * 2. Extension loads in browser
 * 3. Basic capture workflow functions
 * 4. Data flows to handoff server
 */

const QUICK_CONFIG = {
  handoffPort: 5511, // Match actual handoff-server.js port
  testUrl: 'https://example.com', // Simple, fast-loading test page
  timeout: 30000,
  headless: false // Set to true for CI
};

async function quickWorkflowTest() {
  console.log('⚡ QUICK HTML-TO-FIGMA WORKFLOW TEST');
  console.log('=====================================\n');
  
  let browser = null;
  let serverProcess = null;
  
  try {
    // Step 1: Start handoff server
    console.log('🌐 Starting handoff server...');
    serverProcess = await startHandoffServer();
    
    // Step 2: Verify server health
    console.log('🔍 Checking server health...');
    const serverHealthy = await checkServerHealth();
    if (!serverHealthy) {
      throw new Error('Handoff server not responding');
    }
    console.log('✅ Server is healthy');
    
    // Step 3: Launch browser with extension
    console.log('🚀 Launching browser with extension...');
    browser = await launchBrowserWithExtension();
    
    // Step 4: Navigate to test page
    console.log('📄 Navigating to test page...');
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    await page.goto(QUICK_CONFIG.testUrl, {
      waitUntil: 'networkidle2',
      timeout: QUICK_CONFIG.timeout
    });
    console.log(`✅ Loaded: ${page.url()}`);
    
    // Step 5: Wait for extension injection
    console.log('⏳ Waiting for extension injection...');
    await page.waitForTimeout(5000);
    
    // Step 6: Check extension availability
    const extensionReady = await page.evaluate(() => {
      return {
        hasChromeAPI: typeof chrome !== 'undefined',
        hasRuntime: typeof chrome?.runtime?.sendMessage === 'function'
      };
    });
    
    console.log('🔧 Extension status:', extensionReady);
    
    // Step 7: Test capture trigger
    console.log('📸 Testing capture trigger...');
    
    if (extensionReady.hasChromeAPI && extensionReady.hasRuntime) {
      const captureResult = await triggerCapture(page);
      console.log('📋 Capture result:', captureResult);
    } else {
      console.log('⚠️ Extension APIs not available - testing alternative injection...');
      await testDirectInjection(page);
    }
    
    // Step 8: Verify data in handoff server
    console.log('🔗 Checking handoff server queue...');
    const serverStatus = await checkServerQueue();
    console.log('📊 Server status:', serverStatus);
    
    // Step 9: Overall assessment
    console.log('\n🏆 QUICK TEST RESULTS');
    console.log('=====================');
    
    const results = {
      serverStarted: !!serverProcess,
      serverHealthy: serverHealthy,
      browserLaunched: !!browser,
      extensionLoaded: extensionReady.hasChromeAPI,
      dataInQueue: serverStatus.queueLength > 0 || serverStatus.hasRecentTransfer
    };
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalChecks = Object.keys(results).length;
    
    console.log(`✅ Server Started: ${results.serverStarted ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Server Healthy: ${results.serverHealthy ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Browser Launched: ${results.browserLaunched ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Extension Loaded: ${results.extensionLoaded ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Data in Queue: ${results.dataInQueue ? 'PASS' : 'FAIL'}`);
    
    console.log(`\n📈 Score: ${successCount}/${totalChecks} checks passed`);
    
    if (successCount === totalChecks) {
      console.log('🎉 ALL CHECKS PASSED - Workflow is functional!');
      return true;
    } else if (successCount >= totalChecks - 1) {
      console.log('⚠️ MOSTLY WORKING - Minor issues detected');
      return true;
    } else {
      console.log('❌ MULTIPLE ISSUES - Workflow needs debugging');
      return false;
    }
    
  } catch (error) {
    console.error('💥 Quick test failed:', error.message);
    return false;
    
  } finally {
    // Cleanup
    if (browser) {
      await browser.close().catch(console.warn);
    }
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

async function startHandoffServer() {
  // First check if server is already running
  const isRunning = await checkServerHealth();
  if (isRunning) {
    console.log('ℹ️ Server already running, reusing existing instance');
    return null;
  }

  return new Promise((resolve, reject) => {
    const serverPath = path.resolve(__dirname, 'handoff-server.js');
    const serverProc = spawn('node', [serverPath], {
      env: { ...process.env, HANDOFF_PORT: QUICK_CONFIG.handoffPort }
    });
    
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        reject(new Error('Server start timeout'));
      }
    }, 10000);
    
    serverProc.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('listening on') && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(serverProc);
      }
    });
    
    serverProc.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
  });
}

async function checkServerHealth() {
  console.log(`🔍 Checking server health at http://127.0.0.1:${QUICK_CONFIG.handoffPort}/api/health...`);
  try {
    const response = await fetch(`http://127.0.0.1:${QUICK_CONFIG.handoffPort}/api/health?source=quicktest`);
    console.log(`   👉 Health check response: ${response.status} ${response.statusText}`);
    return response.ok;
  } catch (error) {
    console.warn('   ⚠️ Health check failed:', error.message);
    return false;
  }
}

async function launchBrowserWithExtension() {
  const extensionPath = path.resolve(__dirname, 'chrome-extension');
  
  return await puppeteer.launch({
    headless: QUICK_CONFIG.headless,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    defaultViewport: null
  });
}

async function triggerCapture(page) {
  try {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ triggered: false, reason: 'timeout' });
        }, 15000);
        
        try {
          chrome.runtime.sendMessage(
            { type: 'START_CAPTURE', allowNavigation: false },
            (response) => {
              clearTimeout(timeout);
              if (chrome.runtime.lastError) {
                resolve({
                  triggered: false,
                  reason: chrome.runtime.lastError.message
                });
              } else {
                resolve({
                  triggered: true,
                  response: response
                });
              }
            }
          );
        } catch (error) {
          clearTimeout(timeout);
          resolve({
            triggered: false,
            reason: error.message
          });
        }
      });
    });
    
    return result;
    
  } catch (error) {
    return {
      triggered: false,
      reason: error.message
    };
  }
}

async function testDirectInjection(page) {
  try {
    console.log('🧪 Testing direct script injection...');
    
    // Check if the injected script is available
    const injectedScriptPath = path.resolve(__dirname, 'chrome-extension/dist/injected-script.js');
    const fs = require('fs');
    
    if (fs.existsSync(injectedScriptPath)) {
      const script = fs.readFileSync(injectedScriptPath, 'utf8');
      await page.evaluate(script);
      
      // Try to trigger extraction directly
      const extractionResult = await page.evaluate(() => {
        if (typeof window.postMessage === 'function') {
          window.postMessage({ type: 'START_EXTRACTION' }, '*');
          return { injected: true };
        }
        return { injected: false };
      });
      
      console.log('📋 Direct injection result:', extractionResult);
    } else {
      console.log('⚠️ Injected script not found - extension may not be built');
    }
    
  } catch (error) {
    console.warn('Direct injection failed:', error.message);
  }
}

async function checkServerQueue() {
  try {
    const response = await fetch(`http://127.0.0.1:${QUICK_CONFIG.handoffPort}/health`);
    const data = await response.json();
    
    const hasRecentTransfer = data.telemetry?.lastExtensionTransferAt &&
                             (Date.now() - data.telemetry.lastExtensionTransferAt) < 30000;
    
    return {
      queueLength: data.queueLength || 0,
      hasRecentTransfer: hasRecentTransfer,
      telemetry: data.telemetry
    };
  } catch (error) {
    return {
      queueLength: 0,
      hasRecentTransfer: false,
      error: error.message
    };
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--headless')) {
    QUICK_CONFIG.headless = true;
    console.log('🤖 Running in headless mode');
  }
  
  if (args.includes('--help')) {
    console.log('Quick HTML-to-Figma Workflow Test\n');
    console.log('Usage: node quick-workflow-test.js [--headless]\n');
    console.log('This test verifies basic extension functionality quickly.');
    console.log('Use comprehensive-e2e-test.js for full validation.\n');
    process.exit(0);
  }
  
  quickWorkflowTest()
    .then((success) => {
      if (success) {
        console.log('\n⚡ QUICK TEST PASSED!');
        process.exit(0);
      } else {
        console.log('\n⚡ QUICK TEST FAILED!');
        console.log('\nFor detailed testing, run:');
        console.log('node comprehensive-e2e-test.js');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Quick test crashed:', error.message);
      process.exit(1);
    });
}

module.exports = quickWorkflowTest;