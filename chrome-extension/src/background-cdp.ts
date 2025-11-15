/**
 * CDP (Chrome DevTools Protocol) Integration for html.to.design-level accuracy
 *
 * This module uses chrome.debugger API to access CDP's DOMSnapshot.captureSnapshot,
 * which provides the most accurate DOM, layout, and computed style information
 * - exactly like html.to.design does.
 */

export interface CDPCaptureResult {
  domSnapshot: any;
  layoutData: any;
  computedStyles: Record<string, any>;
  screenshot?: string;
}

export class CDPCapture {
  private tabId: number;
  private debuggerAttached: boolean = false;

  constructor(tabId: number) {
    this.tabId = tabId;
  }

  /**
   * Attach debugger to tab
   */
  async attach(): Promise<void> {
    if (this.debuggerAttached) return;

    return new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId: this.tabId }, '1.3', () => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to attach debugger: ${chrome.runtime.lastError.message}`));
          return;
        }
        this.debuggerAttached = true;
        console.log(`✅ CDP debugger attached to tab ${this.tabId}`);
        resolve();
      });
    });
  }

  /**
   * Detach debugger from tab
   */
  async detach(): Promise<void> {
    if (!this.debuggerAttached) return;

    return new Promise((resolve) => {
      chrome.debugger.detach({ tabId: this.tabId }, () => {
        this.debuggerAttached = false;
        console.log(`🔌 CDP debugger detached from tab ${this.tabId}`);
        resolve();
      });
    });
  }

  /**
   * Send CDP command
   */
  private async sendCommand<T = any>(method: string, params?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId: this.tabId }, method, params, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`CDP ${method} failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        resolve(result as T);
      });
    });
  }

  /**
   * Capture DOM snapshot using CDP (like html.to.design)
   *
   * This captures:
   * - Full DOM tree (including shadow DOM, iframes)
   * - ALL computed styles for every element
   * - Layout information (bounding boxes, paint orders)
   * - Blended background colors
   */
  async captureDOMSnapshot(): Promise<CDPCaptureResult> {
    console.log('📸 Starting CDP DOMSnapshot.captureSnapshot...');

    // Enable DOM domain
    await this.sendCommand('DOM.enable');
    await this.sendCommand('CSS.enable');

    // Capture complete DOM snapshot with ALL computed styles
    const snapshot = await this.sendCommand('DOMSnapshot.captureSnapshot', {
      computedStyles: [
        // Layout
        'position', 'top', 'right', 'bottom', 'left',
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding-top', 'padding-right', 'padding-bottom', 'padding-left',

        // Flexbox/Grid
        'display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content',
        'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'align-self',
        'gap', 'row-gap', 'column-gap',
        'grid-template-columns', 'grid-template-rows', 'grid-auto-flow',

        // Typography
        'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
        'text-align', 'text-decoration', 'text-transform', 'white-space', 'word-break',
        'color', 'text-shadow',

        // Visual
        'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
        'border-width', 'border-style', 'border-color', 'border-radius',
        'box-shadow', 'opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y',

        // Transform/Animation
        'transform', 'transform-origin', 'transition', 'animation',
        'z-index', 'filter', 'backdrop-filter',

        // Other
        'cursor', 'pointer-events', 'user-select', 'object-fit', 'object-position'
      ],
      includePaintOrder: true,
      includeBlendedBackgroundColors: true,
      includeDOMRects: true,
      includeTextColorOpacities: true
    });

    console.log(`✅ CDP snapshot captured: ${snapshot.documents?.length || 0} documents`);

    // Get layout metrics for accurate positioning
    const layoutMetrics = await this.sendCommand('Page.getLayoutMetrics');

    return {
      domSnapshot: snapshot,
      layoutData: layoutMetrics,
      computedStyles: this.extractComputedStyles(snapshot)
    };
  }

  /**
   * Extract computed styles into a usable format
   */
  private extractComputedStyles(snapshot: any): Record<string, any> {
    const styles: Record<string, any> = {};

    if (!snapshot.documents || !Array.isArray(snapshot.documents)) {
      return styles;
    }

    for (const doc of snapshot.documents) {
      if (!doc.nodes || !doc.nodes.nodeIndex) continue;

      const nodeCount = doc.nodes.nodeIndex.length;

      for (let i = 0; i < nodeCount; i++) {
        const nodeIndex = doc.nodes.nodeIndex[i];
        const computedStyleIndex = doc.nodes.computedStyleIndex?.[i];

        if (computedStyleIndex !== undefined && doc.computedStyles) {
          styles[`node-${nodeIndex}`] = doc.computedStyles[computedStyleIndex];
        }
      }
    }

    return styles;
  }

  /**
   * Capture screenshot via CDP (higher quality than chrome.tabs.captureVisibleTab)
   */
  async captureScreenshot(): Promise<string> {
    console.log('📸 Capturing screenshot via CDP...');

    const result = await this.sendCommand<{ data: string }>('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 85,
      fromSurface: true,
      captureBeyondViewport: false
    });

    return `data:image/jpeg;base64,${result.data}`;
  }

  /**
   * Full capture workflow - DOM snapshot + screenshot
   */
  async captureComplete(): Promise<CDPCaptureResult> {
    try {
      await this.attach();

      const result = await this.captureDOMSnapshot();
      result.screenshot = await this.captureScreenshot();

      return result;
    } finally {
      await this.detach();
    }
  }
}

/**
 * Transform CDP DOM snapshot into our schema format
 */
export function transformCDPSnapshotToSchema(cdpResult: CDPCaptureResult): any {
  console.log('🔄 Transforming CDP snapshot to schema...');

  const { domSnapshot, computedStyles, layoutData } = cdpResult;

  if (!domSnapshot.documents || !Array.isArray(domSnapshot.documents)) {
    throw new Error('Invalid CDP snapshot: no documents');
  }

  // The first document is the main document
  const mainDoc = domSnapshot.documents[0];

  return {
    version: '2.0.0',
    metadata: {
      captureMethod: 'CDP',
      captureTime: new Date().toISOString(),
      url: mainDoc.baseURL || window.location.href,
      title: mainDoc.title || document.title,
      viewport: {
        width: layoutData.visualViewport?.clientWidth || window.innerWidth,
        height: layoutData.visualViewport?.clientHeight || window.innerHeight,
        devicePixelRatio: layoutData.visualViewport?.scale || window.devicePixelRatio
      }
    },
    cdpSnapshot: domSnapshot,
    computedStyles,
    layoutMetrics: layoutData
  };
}
