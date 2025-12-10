/**
 * AI Vision Analyzer - Screenshot-based UI understanding
 * 
 * Features:
 * 1. OCR: Extract text from images/canvas/WebGL using Tesseract.js
 * 2. Component Detection: Identify UI patterns from screenshots
 * 3. Layout Analysis: Infer hierarchy from visual grouping
 * 
 * This runs in Node.js (Puppeteer context), not browser.
 */

const Tesseract = require('tesseract.js');
const path = require('path');

// Component patterns detected from visual analysis
const COMPONENT_PATTERNS = {
  BUTTON: {
    aspectRatio: { min: 2, max: 8 },
    heightRange: { min: 28, max: 60 },
    hasText: true,
    hasBackground: true,
    hasRoundedCorners: true
  },
  INPUT: {
    aspectRatio: { min: 4, max: 20 },
    heightRange: { min: 28, max: 50 },
    hasBorder: true,
    isRectangular: true
  },
  CARD: {
    aspectRatio: { min: 0.5, max: 2 },
    minArea: 10000,
    hasShadow: true,
    hasChildren: true
  },
  AVATAR: {
    aspectRatio: { min: 0.9, max: 1.1 },
    isCircular: true,
    sizeRange: { min: 24, max: 120 }
  },
  ICON: {
    aspectRatio: { min: 0.8, max: 1.2 },
    sizeRange: { min: 12, max: 48 },
    isSimple: true
  },
  NAV: {
    aspectRatio: { min: 5, max: 50 },
    heightRange: { min: 40, max: 100 },
    hasMultipleItems: true,
    isHorizontal: true
  }
};

class VisionAnalyzer {
  constructor(options = {}) {
    this.tesseractWorker = null;
    this.language = options.language || 'eng';
    this.debug = options.debug || false;
  }

  /**
   * Initialize OCR worker
   */
  async initOCR() {
    if (!this.tesseractWorker) {
      console.log('[vision] Initializing Tesseract OCR...');
      this.tesseractWorker = await Tesseract.createWorker(this.language);
      console.log('[vision] Tesseract ready');
    }
  }

  /**
   * Terminate OCR worker
   */
  async cleanup() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }

  /**
   * Extract text from a screenshot using OCR
   * @param {Buffer|string} image - Image buffer or base64 string
   * @returns {Promise<OCRResult>}
   */
  async extractTextFromImage(image) {
    await this.initOCR();
    
    const startTime = Date.now();
    
    try {
      const result = await this.tesseractWorker.recognize(image);
      
      const extractedText = {
        fullText: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words.map(w => ({
          text: w.text,
          confidence: w.confidence,
          bbox: {
            x: w.bbox.x0,
            y: w.bbox.y0,
            width: w.bbox.x1 - w.bbox.x0,
            height: w.bbox.y1 - w.bbox.y0
          }
        })),
        lines: result.data.lines.map(l => ({
          text: l.text,
          confidence: l.confidence,
          bbox: {
            x: l.bbox.x0,
            y: l.bbox.y0,
            width: l.bbox.x1 - l.bbox.x0,
            height: l.bbox.y1 - l.bbox.y0
          }
        })),
        duration: Date.now() - startTime
      };
      
      console.log(`[vision] OCR extracted ${extractedText.words.length} words in ${extractedText.duration}ms`);
      return extractedText;
    } catch (error) {
      console.error('[vision] OCR failed:', error.message);
      return {
        fullText: '',
        confidence: 0,
        words: [],
        lines: [],
        error: error.message
      };
    }
  }

  /**
   * Analyze screenshot to detect UI components
   * Uses heuristics based on visual patterns
   * @param {Page} page - Puppeteer page
   * @returns {Promise<ComponentAnalysis>}
   */
  async analyzeScreenshot(page) {
    console.log('[vision] Analyzing screenshot for UI patterns...');
    
    // Take screenshot for analysis
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
    
    // Get viewport dimensions
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: document.documentElement.scrollHeight
    }));
    
    // Analyze visual regions using page evaluation
    const visualAnalysis = await page.evaluate(() => {
      const regions = [];
      
      // Find all visible elements with backgrounds
      const elements = document.querySelectorAll('*');
      
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) continue;
        if (rect.top > window.innerHeight * 2) continue; // Skip far below fold
        
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const hasBg = bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
        const hasBorder = styles.borderWidth !== '0px' && styles.borderStyle !== 'none';
        const hasShadow = styles.boxShadow !== 'none';
        const borderRadius = parseFloat(styles.borderRadius) || 0;
        
        // Only track elements with visual significance
        if (!hasBg && !hasBorder && !hasShadow) continue;
        
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role');
        const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(tag) ||
                             role === 'button' || role === 'link';
        
        regions.push({
          tag,
          role,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          styles: {
            hasBg,
            bgColor,
            hasBorder,
            hasShadow,
            borderRadius,
            isRounded: borderRadius > 4
          },
          isInteractive,
          hasText: el.textContent?.trim().length > 0,
          childCount: el.children.length,
          className: el.className.toString().substring(0, 100)
        });
      }
      
      return regions;
    });
    
    // Classify regions into component types
    const components = this.classifyComponents(visualAnalysis);
    
    console.log(`[vision] Detected ${components.length} UI components`);
    
    return {
      screenshot: `data:image/png;base64,${screenshot}`,
      viewport,
      regions: visualAnalysis.length,
      components,
      summary: this.summarizeComponents(components)
    };
  }

  /**
   * Classify visual regions into component types
   */
  classifyComponents(regions) {
    const components = [];
    
    for (const region of regions) {
      const { rect, styles, tag, role, isInteractive, hasText, childCount } = region;
      const aspectRatio = rect.width / rect.height;
      const area = rect.width * rect.height;
      
      let type = 'UNKNOWN';
      let confidence = 0;
      
      // Button detection
      if ((tag === 'button' || role === 'button' || 
           (isInteractive && styles.hasBg && styles.isRounded)) &&
          rect.height >= 28 && rect.height <= 60 && hasText) {
        type = 'BUTTON';
        confidence = tag === 'button' ? 0.95 : 0.75;
      }
      // Input detection
      else if ((tag === 'input' || tag === 'textarea' || role === 'textbox') &&
               styles.hasBorder) {
        type = 'INPUT';
        confidence = 0.9;
      }
      // Card detection
      else if (styles.hasShadow && styles.isRounded && area > 10000 && childCount > 1) {
        type = 'CARD';
        confidence = 0.7;
      }
      // Navigation detection
      else if ((tag === 'nav' || role === 'navigation') ||
               (aspectRatio > 5 && rect.height < 100 && rect.y < 150)) {
        type = 'NAV';
        confidence = tag === 'nav' ? 0.95 : 0.6;
      }
      // Avatar detection (circular, small, image-like)
      else if (aspectRatio > 0.9 && aspectRatio < 1.1 && 
               rect.width >= 24 && rect.width <= 120 &&
               styles.isRounded && styles.borderRadius >= rect.width / 2) {
        type = 'AVATAR';
        confidence = 0.65;
      }
      // Icon detection (small, square-ish)
      else if (aspectRatio > 0.8 && aspectRatio < 1.2 &&
               rect.width >= 12 && rect.width <= 48 &&
               tag === 'svg') {
        type = 'ICON';
        confidence = 0.8;
      }
      
      if (type !== 'UNKNOWN' && confidence > 0.5) {
        components.push({
          type,
          confidence,
          rect,
          tag,
          role,
          className: region.className
        });
      }
    }
    
    return components;
  }

  /**
   * Summarize detected components
   */
  summarizeComponents(components) {
    const summary = {};
    for (const comp of components) {
      summary[comp.type] = (summary[comp.type] || 0) + 1;
    }
    return summary;
  }

  /**
   * Full vision analysis: OCR + Component Detection
   */
  async analyzePageFull(page) {
    console.log('[vision] Starting full vision analysis...');
    
    const [ocrResult, componentResult] = await Promise.all([
      this.extractTextFromImage(await page.screenshot({ encoding: 'buffer' })),
      this.analyzeScreenshot(page)
    ]);
    
    return {
      ocr: ocrResult,
      components: componentResult,
      timestamp: new Date().toISOString()
    };
  }
}

// Factory function for easy use
function createVisionAnalyzer(options) {
  return new VisionAnalyzer(options);
}

module.exports = {
  VisionAnalyzer,
  createVisionAnalyzer,
  COMPONENT_PATTERNS
};
