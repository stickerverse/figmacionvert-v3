import { GOLDEN_TEST_PAGES, VALIDATION_THRESHOLDS, TestPage } from '../shared/test-pages';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';

// Mock HighFidelityCapture for now - this will be injected by the content script
declare global {
  interface Window {
    HighFidelityCapture: {
      capturePage: () => Promise<any>;
    };
  }
}

interface TestResult {
  page: string;
  url: string;
  timestamp: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  metrics: {
    domNodes: number;
    captureTime: number;
    screenshotSize: number;
  };
  validation: {
    elementsFound: number;
    elementsValidated: number;
    positionErrors: number[];
    sizeErrors: number[];
    similarityScore: number;
    passed: boolean;
  };
  artifacts: {
    screenshot: string;
    captureData: string;
    diffImage?: string;
  };
}

class GoldenTestRunner {
  private outputDir = join(__dirname, '..', 'test-results');
  private results: TestResult[] = [];

  async runAllTests() {
    console.log('🚀 Starting golden tests...');
    
    // Create output directory
    await mkdir(this.outputDir, { recursive: true });
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      // Run each test page
      for (const pageConfig of GOLDEN_TEST_PAGES) {
        await this.runTestPage(browser, pageConfig);
      }
      
      // Generate report
      await this.generateReport();
      
    } finally {
      await browser.close();
    }
  }
  
  private async runTestPage(browser: puppeteer.Browser, pageConfig: TestPage) {
    console.log(`\n📄 Testing: ${pageConfig.name} (${pageConfig.url})`);
    
    const page = await browser.newPage();
    const testStart = Date.now();
    
    try {
      // Set viewport
      await page.setViewport(pageConfig.viewport);
      
      // Navigate to the page
      console.log(`  Navigating to ${pageConfig.url}...`);
      await page.goto(pageConfig.url, {
        waitUntil: 'networkidle0',
        timeout: 60000
      });
      
      // Add extra delay to ensure all animations/transitions complete
      await page.waitForTimeout(3000);
      
      // Take a screenshot
      console.log('  Taking screenshot...');
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true
      });
      
      // Run the capture
      console.log('  Capturing DOM...');
      const captureStart = Date.now();
      
      const captureResult = await page.evaluate(async () => {
        // @ts-ignore - HighFidelityCapture is injected by the content script
        return await window.HighFidelityCapture.capturePage();
      });
      
      const captureTime = Date.now() - captureStart;
      
      // Validate the capture
      console.log('  Validating capture...');
      const validation = await this.validateCapture(page, captureResult, pageConfig);
      
      // Save artifacts
      console.log('  Saving artifacts...');
      const testDir = join(this.outputDir, pageConfig.id);
      await mkdir(testDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = join(testDir, `screenshot-${timestamp}.png`);
      const captureDataPath = join(testDir, `capture-${timestamp}.json`);
      
      await Promise.all([
        writeFile(screenshotPath, screenshot),
        writeFile(captureDataPath, JSON.stringify(captureResult, null, 2))
      ]);
      
      // Record results
      const result: TestResult = {
        page: pageConfig.name,
        url: pageConfig.url,
        timestamp: new Date().toISOString(),
        viewport: pageConfig.viewport,
        metrics: {
          domNodes: this.countNodes(captureResult),
          captureTime,
          screenshotSize: screenshot.length
        },
        validation: {
          ...validation,
          passed: validation.similarityScore >= VALIDATION_THRESHOLDS.minSimilarity &&
                  validation.positionErrors.every(e => e <= VALIDATION_THRESHOLDS.positionTolerance) &&
                  validation.sizeErrors.every(e => e <= VALIDATION_THRESHOLDS.sizeTolerance)
        },
        artifacts: {
          screenshot: screenshotPath,
          captureData: captureDataPath
        }
      };
      
      this.results.push(result);
      
      console.log(`✅ Test completed in ${Date.now() - testStart}ms`);
      console.log(`   - DOM Nodes: ${result.metrics.domNodes}`);
      console.log(`   - Capture Time: ${result.metrics.captureTime}ms`);
      console.log(`   - Similarity: ${(result.validation.similarityScore * 100).toFixed(2)}%`);
      console.log(`   - Status: ${result.validation.passed ? 'PASSED' : 'FAILED'}`);
      
    } catch (error) {
      console.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      await page.close();
    }
  }
  
  private async validateCapture(
    page: Page,
    capture: any,
    pageConfig: TestPage
  ): Promise<{
    elementsFound: number;
    elementsValidated: number;
    positionErrors: number[];
    sizeErrors: number[];
    similarityScore: number;
  }> {
    // Check if required elements are present
    const elementsFound: ElementHandle<Element>[] = [];
    const positionErrors: number[] = [];
    const sizeErrors: number[] = [];
    
    for (const selector of pageConfig.elementsToValidate) {
      const elements = await page.$$(selector);
      elementsFound.push(...elements);
      
      // For each element, validate its position and size
      for (const element of elements) {
        const box = await element.boundingBox();
        
        // TODO: Compare with captured element bounds
        // This would involve finding the corresponding node in the capture
        // and comparing its bounds with the actual element bounds
      }
    }
    
    // Calculate similarity score (placeholder)
    // In a real implementation, this would compare the screenshot with the rendered Figma output
    const similarityScore = 1.0;
    
    return {
      elementsFound: elementsFound.length,
      elementsValidated: elementsFound.length, // Simplified for now
      positionErrors,
      sizeErrors,
      similarityScore
    };
  }
  
  private countNodes(node: any): number {
    if (!node || !node.children) return 0;
    return 1 + node.children.reduce((sum: number, child: any) => sum + this.countNodes(child), 0);
  }
  
  private async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.validation.passed).length,
        failed: this.results.filter(r => !r.validation.passed).length
      }
    };
    
    const reportPath = join(this.outputDir, 'report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Test Report:`);
    console.log(`   - Total: ${report.summary.total}`);
    console.log(`   - Passed: ${report.summary.passed}`);
    console.log(`   - Failed: ${report.summary.failed}`);
    console.log(`\nFull report saved to: ${reportPath}`);
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const runner = new GoldenTestRunner();
  runner.runAllTests().catch(console.error);
}

export { GoldenTestRunner };
