import { StatusOverlay } from './utils/status-overlay';
import { PageScroller } from './utils/page-scroller';

console.log('🌐 Content script loaded');

const overlay = new StatusOverlay();
const scroller = new PageScroller();
let isCapturing = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received message:', message.type);

  if (message.type === 'START_CAPTURE' && !isCapturing) {
    console.log('🚀 Starting capture...');
    isCapturing = true;

    // Get current viewport dimensions more accurately
  const currentViewport = {
    width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
  };
  
  const viewports: CaptureViewportTarget[] = message.viewports || [{ 
    name: 'Current', 
    width: currentViewport.width, 
    height: currentViewport.height,
    deviceScaleFactor: window.devicePixelRatio || 1
  }];
    console.log(`📐 Will capture ${viewports.length} viewport(s):`, viewports);

    handleMultiViewportCapture(viewports)
      .then(() => {
        console.log('✅ All viewport captures finished');
      })
      .catch((error) => {
        console.error('❌ Capture failed:', error);
      })
      .finally(() => {
        isCapturing = false;
      });

    sendResponse({ started: true });
  }
  return false;
});

type CaptureViewportTarget = {
  name?: string;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
};

async function handleMultiViewportCapture(viewports: CaptureViewportTarget[]) {
  const captures: any[] = [];

  try {
    console.log('💉 Injecting script once for all viewports...');
    overlay.show('📦 Preparing capture...');

    chrome.runtime.sendMessage({
      type: 'CAPTURE_PROGRESS',
      status: 'Preparing capture script...',
      current: 0,
      total: viewports.length
    });

    await injectScript();
    await wait(500);

    for (let i = 0; i < viewports.length; i++) {
      const viewport = viewports[i];
      console.log(`📐 Capturing viewport ${i + 1}/${viewports.length}: ${viewport.name} (${viewport.width}x${viewport.height})`);

      overlay.show(`🔄 Capturing ${viewport.name} (${i + 1}/${viewports.length})...`);

      chrome.runtime.sendMessage({
        type: 'CAPTURE_PROGRESS',
        status: `Resizing to ${viewport.name} (${viewport.width}x${viewport.height})...`,
        current: i + 1,
        total: viewports.length,
        viewport: viewport.name
      });

      await wait(300);

      const captureResult = await handleCapture(viewport, true);

      if (captureResult && captureResult.data) {
        captures.push({
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          data: captureResult.data,
          validationReport: captureResult.validationReport,
          previewWithOverlay: captureResult.previewWithOverlay
        });

        chrome.runtime.sendMessage({
          type: 'CAPTURE_PROGRESS',
          status: `${viewport.name} captured ✓`,
          current: i + 1,
          total: viewports.length,
          viewport: viewport.name,
          completed: true
        });
      }

      if (i < viewports.length - 1) {
        await wait(500);
      }
    }

    console.log(`📦 Sending ${captures.length} viewport captures to popup`);
    const captureData = {
      version: '2.0.0',
      multiViewport: true,
      captures
    };

    const totalSize = JSON.stringify(captureData).length;
    const totalSizeKB = (totalSize / 1024).toFixed(1);
    const maxSizeKB = 32768;

    if (totalSize / 1024 > maxSizeKB) {
      console.warn(`⚠️ Capture data is ${totalSizeKB}KB, exceeding ${maxSizeKB}KB limit. Attempting chunked transfer.`);
      chrome.runtime.sendMessage({
        type: 'CAPTURE_SIZE_WARNING',
        sizeKB: totalSizeKB,
        maxSizeKB: maxSizeKB
      });
      await sendLargeCaptureData(captureData, totalSize, totalSizeKB);
      return;
    }

    await chrome.runtime.sendMessage({
      type: 'CAPTURE_COMPLETE',
      data: captureData,
      dataSize: totalSize,
      dataSizeKB: totalSizeKB
    });

    overlay.update(`✅ All ${captures.length} viewports captured! (${totalSizeKB} KB)`);
    await wait(2000);
    overlay.hide();
  } finally {
    try {
      await chrome.runtime.sendMessage({ type: 'RESET_VIEWPORT' });
    } catch (error) {
      console.warn('Viewport reset request failed:', error);
    }
  }
}

async function handleCapture(viewport?: CaptureViewportTarget, skipInject?: boolean): Promise<any> {
  try {
    // Inject script only if not already injected
    if (!skipInject) {
      console.log('📍 Step 1: Inject script');
      await injectScript();
      await wait(300);
    }

    // Set viewport first to match requested size
    const viewportConfig = getViewportDimensions(viewport);
    if (viewportConfig) {
      console.log('🪟 Resizing viewport to', viewportConfig.width, 'x', viewportConfig.height);
      await chrome.runtime.sendMessage({
        type: 'SET_VIEWPORT',
        width: viewportConfig.width,
        height: viewportConfig.height,
        deviceScaleFactor: viewportConfig.deviceScaleFactor
      });
      await wait(250);
    }

    // Scroll page
    console.log('📍 Step 2: Scroll page');
    overlay.update('📜 Scrolling page...');
    await scroller.scrollPage();
    await wait(300);

    // Capture screenshot
    console.log('📍 Step 3: Capture screenshot');
    overlay.update('📸 Taking screenshot...');
    const screenshot = await captureScreenshot();
    const optimizedScreenshot = await optimizeScreenshot(screenshot);
    console.log('📸 Screenshot captured:', screenshot ? 'yes' : 'no');
    // Wait longer to respect Chrome's MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota (2 per second)
    await wait(600);

    // Extract DOM
    console.log('📍 Step 4: Extract DOM');
    overlay.update('🌳 Extracting page structure...');
    const result = await extractPage(optimizedScreenshot || screenshot, viewportConfig || undefined);
    console.log('🌳 DOM extracted:', result.data ? 'yes' : 'no');

    if (viewport?.name && result.data?.metadata) {
      result.data.metadata.viewportName = viewport.name;
    }
    if (viewportConfig?.width && result.data?.metadata) {
      result.data.metadata.viewportWidth = viewportConfig.width;
    }
    if (viewportConfig?.height && result.data?.metadata) {
      result.data.metadata.viewportHeight = viewportConfig.height;
    }

    return result;

  } catch (error) {
    console.error('❌ Capture failed:', error);
    overlay.update('❌ Capture failed: ' + String(error));
    await wait(2000);
    throw error;
  }
}

function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('💉 Creating script element...');
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected-script.js');
    script.onload = () => {
      console.log('✅ Injected script loaded');
      script.remove();
      resolve();
    };
    script.onerror = (error) => {
      console.error('❌ Failed to inject script:', error);
      reject(new Error('Failed to inject script'));
    };
    (document.head || document.documentElement).appendChild(script);
  });
}

async function captureScreenshot(): Promise<string> {
  try {
    console.log('📸 Requesting screenshot...');
    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
    console.log('📸 Screenshot response:', response ? 'received' : 'empty');
    return response.screenshot || '';
  } catch (e) {
    console.error('❌ Screenshot failed:', e);
    return '';
  }
}

function extractPage(screenshot: string, viewport?: CaptureViewportTarget | null): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log('🌳 Setting up extraction listener...');
    let timeoutId: number | null = null;
    const timeoutMs = 600000; // 10 minutes, refreshed on progress
    const extractionStartTime = Date.now();

    const cleanup = () => {
      window.removeEventListener('message', handler);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;

      console.log('📨 Received message from injected script:', event.data.type);

      if (event.data.type === 'EXTRACTION_PROGRESS') {
        lastProgressTime = Date.now();
        progressCount++;
        scheduleTimeout(); // keep extraction alive while progress arrives

        // Forward extraction progress to popup
        chrome.runtime.sendMessage({
          type: 'EXTRACTION_PROGRESS',
          phase: event.data.phase,
          message: event.data.message,
          percent: event.data.percent,
          stats: event.data.stats
        }).catch(() => {
          // Ignore errors if popup is closed
        });

        // Update overlay with progress and diagnostic info
        const diagnostics = `(${progressCount} updates, ${((Date.now() - extractionStartTime) / 1000).toFixed(1)}s)`;
        const messageWithDiagnostics = `${event.data.message} ${diagnostics}`;
        if (event.data.message) {
          overlay.update(messageWithDiagnostics);
        }
      } else if (event.data.type === 'EXTRACTION_COMPLETE') {
        console.log('✅ Extraction complete');
        cleanup();
        resolve({
          data: event.data.data,
          validationReport: event.data.validationReport,
          previewWithOverlay: event.data.previewWithOverlay
        });
      } else if (event.data.type === 'EXTRACTION_HEARTBEAT') {
        lastProgressTime = Date.now();
        scheduleTimeout();
      } else if (event.data.type === 'EXTRACTION_ERROR') {
        console.error('❌ Extraction error:', event.data.error);
        cleanup();
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener('message', handler);
    
    console.log('📤 Posting START_EXTRACTION message...');
    window.postMessage({
      type: 'START_EXTRACTION',
      screenshot,
      viewport
    }, '*');

    let lastProgressTime = Date.now();
    let progressCount = 0;

    const scheduleTimeout = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        const timeSinceLastProgress = Date.now() - lastProgressTime;
        const timeoutMinutes = Math.floor(timeoutMs / 60000);
        
        console.log(`⏰ Extraction timeout after ${timeoutMinutes} minutes`);
        console.log(`📊 Progress events received: ${progressCount}`);
        console.log(`🕐 Time since last progress: ${(timeSinceLastProgress / 1000).toFixed(1)}s`);
        
        cleanup();
        reject(new Error(`Extraction timeout after ${timeoutMinutes} minutes - received ${progressCount} progress updates, ${(timeSinceLastProgress / 1000).toFixed(1)}s since last progress`));
      }, timeoutMs);
    };

    scheduleTimeout();
  });
}

async function sendLargeCaptureData(captureData: any, totalSize: number, totalSizeKB: string): Promise<void> {
  try {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const jsonString = JSON.stringify(captureData);
    const chunks: string[] = [];
    
    // Split into chunks
    for (let i = 0; i < jsonString.length; i += chunkSize) {
      chunks.push(jsonString.slice(i, i + chunkSize));
    }
    
    console.log(`📦 Splitting large capture into ${chunks.length} chunks`);
    
    // Send metadata first
    await chrome.runtime.sendMessage({
      type: 'CAPTURE_CHUNKED_START',
      totalChunks: chunks.length,
      totalSize: totalSize,
      totalSizeKB: totalSizeKB
    });
    
    // Send chunks sequentially
    for (let i = 0; i < chunks.length; i++) {
      await chrome.runtime.sendMessage({
        type: 'CAPTURE_CHUNKED_DATA',
        chunkIndex: i,
        chunkData: chunks[i],
        totalChunks: chunks.length
      });
      
      // Small delay between chunks to avoid overwhelming the background script
      await wait(50);
    }
    
    // Send completion signal
    await chrome.runtime.sendMessage({
      type: 'CAPTURE_CHUNKED_COMPLETE',
      totalChunks: chunks.length
    });
    
  } catch (error) {
    console.error('❌ Failed to send large capture data:', error);
    // Fallback to regular send (may fail due to size)
    chrome.runtime.sendMessage({
      type: 'CAPTURE_COMPLETE',
      data: captureData,
      dataSize: totalSize,
      dataSizeKB: totalSizeKB,
      sizeLimitExceeded: true
    });
  }
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getViewportDimensions(target?: CaptureViewportTarget) {
  if (!target) return null;
  if (target.width && target.height) {
    return {
      width: target.width,
      height: target.height,
      deviceScaleFactor: target.deviceScaleFactor ?? 1
    };
  }

  if (target.name) {
    const normalized = target.name.toLowerCase();
    if (normalized === 'mobile') {
      return { width: 375, height: 812, deviceScaleFactor: 2 };
    }
    if (normalized === 'tablet') {
      return { width: 768, height: 1024, deviceScaleFactor: 2 };
    }
    if (normalized === 'desktop') {
      // Auto-detect current screen dimensions instead of hardcoded values
      const currentWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      const currentHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      
      // Use screen dimensions if available, fallback to viewport dimensions
      const desktopWidth = screen.width || currentWidth || 1440; // fallback to 1440 if detection fails
      const desktopHeight = screen.height || currentHeight || 900; // fallback to 900 if detection fails
      
      return { 
        width: desktopWidth, 
        height: desktopHeight, 
        deviceScaleFactor: window.devicePixelRatio || 1 
      };
    }
  }
  return null;
}

async function optimizeScreenshot(dataUrl: string): Promise<string | null> {
  if (!dataUrl) return null;
  try {
    const image = await loadImage(dataUrl);
    const maxSide = 1400;
    let { width, height } = image;

    if (width <= 0 || height <= 0) return dataUrl;

    if (width > maxSide || height > maxSide) {
      const scale = Math.min(maxSide / width, maxSide / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.55);
  } catch (error) {
    console.warn('⚠️ Failed to optimize screenshot, using original.', error);
    return dataUrl;
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}
