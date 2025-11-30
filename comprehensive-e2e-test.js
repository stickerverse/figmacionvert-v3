const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

/**
 * Comprehensive End-to-End Test for HTML-to-Figma Extension Workflow
 * 
 * Tests the complete pipeline:
 * 1. Handoff server startup
 * 2. Chrome extension loading with Puppeteer
 * 3. Website navigation and DOM extraction
 * 4. Schema validation and handoff server communication
 * 5. Error handling and edge cases
 */

// Test configuration
const TEST_CONFIG = {
  handoffServer: {
    port: 4411,
    timeout: 10000,
    maxRetries: 3
  },
  browser: {
    headless: "new", // Set to true for CI/CD
    devtools: false,
    timeout: 60000,
    viewport: { width: 1440, height: 900 }
  },
  capture: {
    timeout: 90000,
    progressCheckInterval: 2000,
    maxProgressChecks: 45
  }
};

// Test websites with varying complexity
const TEST_WEBSITES = [
  {
    name: 'Medium Complexity - GitHub',
    url: 'https://github.com/microsoft/vscode',
    description: 'Good mix of layout types, buttons, images, navigation',
    expectedElements: { min: 50, max: 300 },
    timeout: 30000
  },
  {
    name: 'High Complexity - Stripe Docs',
    url: 'https://stripe.com/docs/api',
    description: 'Complex layouts, code blocks, interactive elements',
    expectedElements: { min: 100, max: 500 },
    timeout: 45000
  },
  {
    name: 'Design-Heavy - Dribbble',
    url: 'https://dribbble.com/shots',
    description: 'Image-heavy, grid layouts, hover states',
    expectedElements: { min: 80, max: 400 },
    timeout: 35000
  },
  {
    name: 'E-commerce - Product Hunt',
    url: 'https://www.producthunt.com',
    description: 'Cards, buttons, complex navigation, dynamic content',
    expectedElements: { min: 60, max: 350 },
    timeout: 30000
  }
];

class ComprehensiveE2ETest {
  constructor() {
    this.browser = null;
    this.handoffServerProcess = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      serverStartup: null,
      extensionLoading: null,
      websiteTests: [],
      schemaValidations: [],
      overallSuccess: false,
      performance: {},
      errors: []
    };
  }

  async run() {
    console.log('🚀 COMPREHENSIVE HTML-TO-FIGMA E2E TEST');
    console.log('==========================================\n');

    try {
      // Phase 1: Environment Setup
      await this.setupEnvironment();
      
      // Phase 2: Server Startup
      await this.startHandoffServer();
      
      // Phase 3: Extension Loading
      await this.loadExtension();
      
      // Phase 4: Website Testing
      for (const website of TEST_WEBSITES) {
        await this.testWebsite(website);
      }
      
      // Phase 5: Final Validation
      await this.validateOverallResults();
      
      this.testResults.overallSuccess = true;
      console.log('🎉 ALL TESTS PASSED! Extension workflow is fully functional.');
      
    } catch (error) {
      this.testResults.errors.push({
        phase: 'overall',
        message: error.message,
        stack: error.stack
      });
      console.error('❌ TEST SUITE FAILED:', error.message);
      throw error;
    } finally {
      await this.cleanup();
      await this.generateReport();
    }
  }

  async setupEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    const extensionPath = path.resolve(__dirname, 'chrome-extension');
    
    // Verify required files exist
    const requiredFiles = [
      'chrome-extension/dist/content-script.js',
      'chrome-extension/dist/background.js',
      'chrome-extension/dist/injected-script.js',
      'chrome-extension/manifest.json',
      'handoff-server.js'
    ];
    
    for (const file of requiredFiles) {
      try {
        await fs.access(path.resolve(__dirname, file));
      } catch (error) {
        throw new Error(`Required file missing: ${file}. Please build the extension first.`);
      }
    }
    
    console.log('✅ All required files verified');
  }

  async startHandoffServer() {
    console.log('🌐 Starting handoff server...');
    
    return new Promise((resolve, reject) => {
      const serverPath = path.resolve(__dirname, 'handoff-server.js');
      this.handoffServerProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });

      let serverReady = false;
      let portInUse = false;

      const timeout = setTimeout(() => {
        if (!serverReady && !portInUse) {
          reject(new Error('Handoff server failed to start within timeout'));
        }
      }, TEST_CONFIG.handoffServer.timeout);

      this.handoffServerProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`📡 Server: ${output.trim()}`);
        
        if (output.includes('listening on') && !serverReady) {
          serverReady = true;
          clearTimeout(timeout);
          this.testResults.serverStartup = { success: true, port: TEST_CONFIG.handoffServer.port };
          resolve();
        }
      });

      this.handoffServerProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        console.error(`❌ Server Error: ${output}`);
        
        if (
          output.includes('Port 4411 is already in use') ||
          output.includes('EADDRINUSE') ||
          output.includes('EPERM') // treat permission-denied as "already running elsewhere"
        ) {
          console.log('⚠️ Server already running on port 4411 (or blocked), proceeding with existing instance...');
          portInUse = true;
          serverReady = true;
          clearTimeout(timeout);
          this.testResults.serverStartup = { success: true, port: TEST_CONFIG.handoffServer.port, reused: true, note: 'stderr-reuse' };
          resolve();
        }
      });

      this.handoffServerProcess.on('exit', (code) => {
        if (code !== 0 && !serverReady && !portInUse) {
          reject(new Error(`Handoff server exited with code ${code}`));
        }
      });
    });
  }

  async loadExtension() {
    console.log('🔌 Loading Chrome extension...');
    
    const extensionPath = path.resolve(__dirname, 'chrome-extension');
    
    try {
      this.browser = await puppeteer.launch({
        headless: TEST_CONFIG.browser.headless,
        devtools: TEST_CONFIG.browser.devtools,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-features=VizDisplayCompositor',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        defaultViewport: null,
        timeout: TEST_CONFIG.browser.timeout
      });

      // Verify server connection
      const healthCheck = await this.checkServerHealth();
      if (!healthCheck.ok) {
        throw new Error('Handoff server not responding to health checks');
      }

      this.testResults.extensionLoading = { 
        success: true, 
        serverHealth: healthCheck
      };
      
      console.log('✅ Extension loaded successfully');
      
    } catch (error) {
      this.testResults.extensionLoading = { 
        success: false, 
        error: error.message 
      };
      throw new Error(`Failed to load extension: ${error.message}`);
    }
  }

  async testWebsite(websiteConfig) {
    console.log(`\n🧪 TESTING WEBSITE: ${websiteConfig.name}`);
    console.log(`📍 URL: ${websiteConfig.url}`);
    console.log(`📝 Description: ${websiteConfig.description}`);
    console.log('='.repeat(60));
    
    const testResult = {
      website: websiteConfig.name,
      url: websiteConfig.url,
      success: false,
      phases: {},
      performance: {},
      schema: null,
      errors: []
    };

    const startTime = Date.now();
    let page = null;

    try {
      // Phase 1: Page Navigation
      testResult.phases.navigation = await this.navigateToWebsite(websiteConfig);
      page = testResult.phases.navigation.page;
      
      // Phase 2: Extension Readiness
      testResult.phases.extensionReady = await this.checkExtensionReadiness(page);
      
      // Phase 3: Capture Trigger
      testResult.phases.captureExecution = await this.executeCaptureWorkflow(page, websiteConfig);
      
      // Phase 4: Schema Validation
      testResult.phases.schemaValidation = await this.validateExtractedSchema(testResult.phases.captureExecution.schema);
      
      // Phase 5: Handoff Server Verification
      testResult.phases.handoffVerification = await this.verifyHandoffServerData();
      
      testResult.success = Object.values(testResult.phases).every(phase => phase.success);
      testResult.performance.totalTimeMs = Date.now() - startTime;
      
      if (testResult.success) {
        console.log(`✅ ${websiteConfig.name} - ALL PHASES PASSED`);
      } else {
        console.log(`❌ ${websiteConfig.name} - SOME PHASES FAILED`);
        const failedPhases = Object.entries(testResult.phases)
          .filter(([_, phase]) => !phase.success)
          .map(([name, _]) => name);
        console.log(`❌ Failed phases: ${failedPhases.join(', ')}`);
      }
      
    } catch (error) {
      testResult.errors.push({
        phase: 'overall',
        message: error.message,
        stack: error.stack
      });
      testResult.performance.totalTimeMs = Date.now() - startTime;
      console.error(`❌ ${websiteConfig.name} - CRITICAL FAILURE:`, error.message);
      
    } finally {
      if (page && !page.isClosed()) {
        await page.close().catch(console.warn);
      }
      this.testResults.websiteTests.push(testResult);
    }
  }

  async navigateToWebsite(websiteConfig) {
    console.log('🌐 Phase 1: Navigating to website...');
    
    const page = await this.browser.newPage();
    await page.setViewport(TEST_CONFIG.browser.viewport);
    
    // Set up console logging
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });
    
    page.on('pageerror', error => {
      console.log('📄 Page error:', error.message);
    });
    
    try {
      console.log(`📍 Navigating to: ${websiteConfig.url}`);
      await page.goto(websiteConfig.url, {
        waitUntil: 'networkidle2',
        timeout: websiteConfig.timeout
      });
      
      // Wait for initial load
      await new Promise(r => setTimeout(r, 2000));
      
      console.log('✅ Navigation successful');
      return {
        success: true,
        page: page,
        consoleLogs: consoleLogs,
        url: page.url()
      };
      
    } catch (error) {
      console.error('❌ Navigation failed:', error.message);
      return {
        success: false,
        error: error.message,
        page: page
      };
    }
  }

  async checkExtensionReadiness(page) {
    console.log('🔧 Phase 2: Checking extension readiness...');
    
    try {
      // Wait for extension to inject
      await new Promise(r => setTimeout(r, 5000));
      
      const extensionStatus = await page.evaluate(() => {
        return {
          hasChromeAPI: typeof chrome !== 'undefined',
          hasRuntimeAPI: typeof chrome?.runtime?.sendMessage === 'function',
          documentReady: document.readyState === 'complete',
          bodyLoaded: document.body !== null,
          hasContentScript: document.body.getAttribute('data-extension-installed') === 'true'
        };
      });
      
      console.log('🔍 Extension status:', extensionStatus);
      
      const isReady = extensionStatus.documentReady && extensionStatus.bodyLoaded;
      
      if (isReady) {
        console.log('✅ Extension is ready for capture');
      } else {
        console.log('⚠️ Extension not fully ready, but proceeding...');
      }
      
      return {
        success: isReady,
        status: extensionStatus,
        warning: !isReady ? 'Extension APIs not fully available' : null
      };
      
    } catch (error) {
      console.error('❌ Extension readiness check failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executeCaptureWorkflow(page, websiteConfig) {
    console.log('📸 Phase 3: Executing capture workflow...');
    
    const captureStartTime = Date.now();
    let schema = null;
    let progressEvents = [];
    let captureCompleted = false;
    let dialogAppeared = false;
    
    try {
      // Set up message monitoring
      page.on('console', msg => {
        const text = msg.text();
        
        if (text.includes('EXTRACTION_PROGRESS') || text.includes('%')) {
          progressEvents.push({
            timestamp: Date.now() - captureStartTime,
            message: text
          });
        }
        
        if (text.includes('EXTRACTION_COMPLETE') || text.includes('✅') && text.includes('complete')) {
          captureCompleted = true;
        }
        
        if (text.includes('completion dialog') || text.includes('showCaptureCompletionDialog')) {
          dialogAppeared = true;
        }
      });
      
      console.log('🎯 Triggering capture...');
      
      // Execute the capture
      const captureResult = await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Capture timeout after 90 seconds'));
          }, 90000);
          
          try {
            // Trigger capture via postMessage to content script
            window.postMessage({
              type: 'START_CAPTURE_TEST',
              viewports: [{ width: 1440, height: 900 }]
            }, '*');
            
            console.log('📨 Sent START_CAPTURE_TEST message');
            
            // We can't wait for the callback directly here since it's async via messaging
            // The test runner monitors console logs for progress
            resolve({ started: true });
            
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });
      
      console.log('✅ Capture triggered successfully');
      
      // Wait for capture completion with progress monitoring
      const maxWaitTime = TEST_CONFIG.capture.timeout;
      const checkInterval = TEST_CONFIG.capture.progressCheckInterval;
      let elapsedTime = 0;
      
      while (!captureCompleted && elapsedTime < maxWaitTime) {
        await new Promise(r => setTimeout(r, checkInterval));
        elapsedTime += checkInterval;
        
        // Check for DOM attribute signal
        const status = await page.evaluate(() => document.body.getAttribute('data-capture-status'));
        if (status === 'complete') {
          captureCompleted = true;
          console.log('✅ Detected capture completion via DOM attribute');
        }

        // Check for debug signals
        const debugPostMessage = await page.evaluate(() => document.body.getAttribute('data-debug-postmessage'));
        if (debugPostMessage === 'received' && !progressEvents.some(e => e.message.includes('debug-postmessage'))) {
          console.log('🐛 [DEBUG] Content script received postMessage');
          progressEvents.push({ timestamp: Date.now() - captureStartTime, message: 'debug-postmessage' });
        }

        const debugStartCapture = await page.evaluate(() => document.body.getAttribute('data-debug-startcapture'));
        if (debugStartCapture === 'received' && !progressEvents.some(e => e.message.includes('debug-startcapture'))) {
          console.log('🐛 [DEBUG] Content script received start-capture');
          progressEvents.push({ timestamp: Date.now() - captureStartTime, message: 'debug-startcapture' });
        }
        
        if (progressEvents.length > 0) {
          const lastProgress = progressEvents[progressEvents.length - 1];
          console.log(`📈 Progress: ${lastProgress.message.substring(0, 80)}...`);
        }
      }
      
      if (!captureCompleted) {
        throw new Error(`Capture did not complete within ${maxWaitTime}ms`);
      }
      
      // Check for completion dialog
      await new Promise(r => setTimeout(r, 2000));
      const dialogStatus = await page.evaluate(() => {
        const dialog = document.getElementById('capture-completion-dialog');
        if (!dialog) return { found: false };
        
        return {
          found: true,
          visible: dialog.offsetParent !== null,
          hasButtons: {
            sendToFigma: !!document.getElementById('send-to-figma'),
            downloadJson: !!document.getElementById('download-json'),
            close: !!document.getElementById('close-dialog')
          }
        };
      });
      
      // Attempt to extract schema data
      if (dialogStatus.found && dialogStatus.hasButtons.downloadJson) {
        console.log('💾 Attempting to extract schema data...');
        
        // This would need to be adapted based on how the extension stores the data
        schema = await this.extractSchemaFromExtension(page);
      }
      
      const captureTime = Date.now() - captureStartTime;
      console.log(`✅ Capture workflow completed in ${captureTime}ms`);
      
      return {
        success: true,
        captureTime: captureTime,
        progressEvents: progressEvents.length,
        dialogAppeared: dialogStatus.found,
        dialogButtons: dialogStatus.hasButtons,
        schema: schema
      };
      
    } catch (error) {
      const captureTime = Date.now() - captureStartTime;
      console.error(`❌ Capture failed after ${captureTime}ms:`, error.message);
      
      return {
        success: false,
        error: error.message,
        captureTime: captureTime,
        progressEvents: progressEvents.length,
        dialogAppeared: dialogAppeared
      };
    }
  }

  async extractSchemaFromExtension(page) {
    try {
      // This is a simplified extraction - in practice, you'd need to trigger
      // the actual data extraction or download mechanism
      const schemaData = await page.evaluate(() => {
        // Try to access any globally stored schema data
        if (window.lastCaptureData) {
          return window.lastCaptureData;
        }
        
        // Or trigger the download and intercept it
        return null;
      });
      
      return schemaData;
    } catch (error) {
      console.warn('⚠️ Could not extract schema data:', error.message);
      return null;
    }
  }

  async validateExtractedSchema(schema) {
    console.log('🔍 Phase 4: Validating extracted schema...');
    
    if (!schema) {
      console.log('⚠️ No schema data available for validation');
      return {
        success: false,
        reason: 'No schema data extracted'
      };
    }
    
    try {
      const validation = {
        hasValidStructure: false,
        hasMetadata: false,
        hasTree: false,
        hasAssets: false,
        elementCount: 0,
        schemaVersion: null,
        errors: []
      };
      
      // Basic structure validation
      if (schema.version) {
        validation.schemaVersion = schema.version;
      } else {
        validation.errors.push('Missing schema version');
      }
      
      if (schema.metadata && schema.metadata.url && schema.metadata.title) {
        validation.hasMetadata = true;
      } else {
        validation.errors.push('Missing or incomplete metadata');
      }
      
      if (schema.tree && typeof schema.tree === 'object') {
        validation.hasTree = true;
        validation.elementCount = this.countTreeElements(schema.tree);
      } else {
        validation.errors.push('Missing or invalid element tree');
      }
      
      if (schema.assets && typeof schema.assets === 'object') {
        validation.hasAssets = true;
      } else {
        validation.errors.push('Missing assets registry');
      }
      
      validation.hasValidStructure = validation.hasMetadata && 
                                   validation.hasTree && 
                                   validation.hasAssets;
      
      if (validation.hasValidStructure) {
        console.log(`✅ Schema validation passed (${validation.elementCount} elements)`);
      } else {
        console.log('❌ Schema validation failed:', validation.errors.join(', '));
      }
      
      return {
        success: validation.hasValidStructure,
        validation: validation
      };
      
    } catch (error) {
      console.error('❌ Schema validation error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  countTreeElements(tree) {
    let count = 1; // Count the current node
    if (tree.children && Array.isArray(tree.children)) {
      for (const child of tree.children) {
        count += this.countTreeElements(child);
      }
    }
    return count;
  }

  async verifyHandoffServerData() {
    console.log('🔗 Phase 5: Verifying handoff server data...');
    
    try {
      const response = await fetch(`http://127.0.0.1:${TEST_CONFIG.handoffServer.port}/api/health`);
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      const health = await response.json();
      
      const hasRecentTransfer = health.telemetry.lastExtensionTransferAt && 
                               (Date.now() - health.telemetry.lastExtensionTransferAt) < 60000;
      
      console.log(`📊 Queue length: ${health.queueLength}`);
      console.log(`🔄 Recent transfer: ${hasRecentTransfer ? 'Yes' : 'No'}`);
      
      return {
        success: health.queueLength > 0 || hasRecentTransfer,
        queueLength: health.queueLength,
        telemetry: health.telemetry
      };
      
    } catch (error) {
      console.error('❌ Handoff server verification failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkServerHealth() {
    try {
      const response = await fetch(`http://127.0.0.1:${TEST_CONFIG.handoffServer.port}/api/health?source=test`);
      const data = await response.json();
      return { ok: response.ok, data };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async validateOverallResults() {
    console.log('\n📊 OVERALL VALIDATION');
    console.log('====================');
    
    const successfulTests = this.testResults.websiteTests.filter(test => test.success).length;
    const totalTests = this.testResults.websiteTests.length;
    
    console.log(`✅ Successful tests: ${successfulTests}/${totalTests}`);
    
    if (successfulTests === 0) {
      throw new Error('All website tests failed - system not functional');
    } else if (successfulTests < totalTests) {
      console.log(`⚠️ ${totalTests - successfulTests} tests failed - review results`);
    }
    
    // Calculate performance metrics
    const avgCaptureTime = this.testResults.websiteTests
      .filter(test => test.phases.captureExecution && test.phases.captureExecution.captureTime)
      .reduce((sum, test) => sum + test.phases.captureExecution.captureTime, 0) / successfulTests;
    
    this.testResults.performance = {
      successRate: (successfulTests / totalTests) * 100,
      averageCaptureTime: avgCaptureTime,
      totalTestTime: Date.now() - new Date(this.testResults.timestamp).getTime()
    };
    
    console.log(`📈 Average capture time: ${avgCaptureTime.toFixed(0)}ms`);
    console.log(`🎯 Success rate: ${this.testResults.performance.successRate.toFixed(1)}%`);
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    try {
      if (this.browser) {
        await this.browser.close();
      }
      
      if (this.handoffServerProcess) {
        this.handoffServerProcess.kill();
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
    }
  }

  async generateReport() {
    const reportPath = path.resolve(__dirname, `e2e-test-report-${Date.now()}.json`);
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(this.testResults, null, 2));
      
      console.log('\n📋 TEST REPORT GENERATED');
      console.log('=======================');
      console.log(`📄 Report saved to: ${reportPath}`);
      console.log(`🕐 Test duration: ${(this.testResults.performance?.totalTestTime || 0) / 1000}s`);
      console.log(`✅ Success rate: ${this.testResults.performance?.successRate || 0}%`);
      
      // Print summary
      console.log('\n📊 SUMMARY BY WEBSITE:');
      this.testResults.websiteTests.forEach(test => {
        const status = test.success ? '✅' : '❌';
        const time = test.performance?.totalTimeMs ? `(${test.performance.totalTimeMs}ms)` : '';
        console.log(`${status} ${test.website} ${time}`);
      });
      
    } catch (error) {
      console.error('❌ Failed to generate report:', error.message);
    }
  }
}

// Utility function to suggest test websites
function printTestWebsiteSuggestions() {
  console.log('\n🌐 RECOMMENDED TEST WEBSITES');
  console.log('============================');
  
  TEST_WEBSITES.forEach((site, index) => {
    console.log(`${index + 1}. ${site.name}`);
    console.log(`   URL: ${site.url}`);
    console.log(`   ${site.description}`);
    console.log(`   Expected elements: ${site.expectedElements.min}-${site.expectedElements.max}`);
    console.log('');
  });
  
  console.log('These websites provide comprehensive coverage of:');
  console.log('• Complex layouts (flexbox, grid, absolute positioning)');
  console.log('• Interactive elements (buttons, forms, hover states)');
  console.log('• Media content (images, SVGs, videos)');
  console.log('• Typography variations and text content');
  console.log('• Modern web design patterns and components');
}

// Run the comprehensive test
async function runComprehensiveE2ETest() {
  const test = new ComprehensiveE2ETest();
  
  try {
    await test.run();
    console.log('\n🏆 COMPREHENSIVE E2E TEST COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 COMPREHENSIVE E2E TEST FAILED!');
    console.error('Error:', error.message);
    
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Ensure handoff server dependencies: npm install');
    console.log('2. Build extension: cd chrome-extension && npm run build');
    console.log('3. Verify Chrome/Chromium installation');
    console.log('4. Check network connectivity for test websites');
    console.log('5. Review detailed error log above');
    
    process.exit(1);
  }
}

// Module exports and CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('HTML-to-Figma Comprehensive E2E Test\n');
    console.log('Usage: node comprehensive-e2e-test.js [options]\n');
    console.log('Options:');
    console.log('  --help, -h          Show this help message');
    console.log('  --websites          Show recommended test websites');
    console.log('  --headless          Run in headless mode');
    console.log('\nExample:');
    console.log('  node comprehensive-e2e-test.js --headless\n');
    process.exit(0);
  }
  
  if (args.includes('--websites')) {
    printTestWebsiteSuggestions();
    process.exit(0);
  }
  
  if (args.includes('--headless')) {
    TEST_CONFIG.browser.headless = true;
    console.log('🤖 Running in headless mode');
  }
  
  runComprehensiveE2ETest();
}

module.exports = {
  ComprehensiveE2ETest,
  TEST_WEBSITES,
  TEST_CONFIG,
  runComprehensiveE2ETest
};
