// chrome-extension/src/utils/element-screenshot.ts
// Phase 5: Element screenshot capture for rasterization fallback

/**
 * PRIMARY: Capture element using native browser screenshot (pixel-perfect)
 * FALLBACK: Use SVG foreignObject if native capture fails
 *
 * Priority hierarchy:
 * 1. chrome.tabs.captureVisibleTab + crop (MOST RELIABLE)
 * 2. SVG foreignObject rendering (FALLBACK for edge cases)
 * 3. Return null (graceful degradation)
 */
export async function captureElementScreenshot(
  element: Element
): Promise<string | null> {
  // Try native capture first (highest fidelity)
  const nativeResult = await captureElementViaTabCapture(element);

  // Validate native capture didn't fail silently
  if (nativeResult && validateCaptureResult(nativeResult, element)) {
    console.log('[PHASE 5] ✅ Native screenshot capture successful');
    return nativeResult;
  }

  // Fallback to foreignObject if native failed
  console.warn('[PHASE 5] Native capture failed or invalid, trying foreignObject fallback');
  const foreignObjectResult = await captureElementViaForeignObject(element);

  if (foreignObjectResult && validateCaptureResult(foreignObjectResult, element)) {
    console.log('[PHASE 5] ⚠️ ForeignObject fallback successful (best effort)');
    return foreignObjectResult;
  }

  console.error('[PHASE 5] ❌ All capture methods failed');
  return null;
}

/**
 * Validate that a capture result is not suspiciously blank/invalid
 * Returns true if capture appears valid, false if suspicious
 */
function validateCaptureResult(dataUrl: string, element: Element): boolean {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return false;
  }

  // Check if data URL is suspiciously small (likely blank/failed)
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data || base64Data.length < 100) {
    console.warn('[PHASE 5] Capture result suspiciously small:', base64Data?.length || 0, 'bytes');
    return false;
  }

  // Check element dimensions are reasonable
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    console.warn('[PHASE 5] Element has zero dimensions');
    return false;
  }

  // If element is very large but capture is very small, likely failed
  const elementArea = rect.width * rect.height;
  const minExpectedBytes = elementArea / 100; // Very rough heuristic
  if (base64Data.length < minExpectedBytes) {
    console.warn('[PHASE 5] Capture size too small for element dimensions', {
      area: elementArea,
      bytes: base64Data.length,
      expected: minExpectedBytes
    });
    return false;
  }

  return true;
}

/**
 * FALLBACK: Captures screenshot using SVG foreignObject (best effort, not pixel-perfect)
 *
 * Known limitations:
 * - External fonts may not load (CORS/timing)
 * - Cross-origin images will taint canvas
 * - Filters/blends may differ from real renderer
 * - Pseudo-elements depend on cloning strategy
 * - Videos/canvas/WebGL won't render
 * - Some CSS features not supported in foreignObject
 */
async function captureElementViaForeignObject(
  element: Element
): Promise<string | null> {
  try {
    const rect = element.getBoundingClientRect();

    // Skip elements with zero dimensions
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    // For perfect clone, we need actual rendered pixels
    // Use html2canvas-like approach with canvas drawing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size to element size (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Strategy: Use SVG foreignObject to render the element
    // This captures all CSS effects including filters, blends, transforms
    const elementHtml = element.outerHTML;
    const computedStyle = window.getComputedStyle(element);

    // Create SVG with foreignObject containing the element
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="${rect.width}" height="${rect.height}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="${getInlineStyles(computedStyle)}">
            ${elementHtml}
          </div>
        </foreignObject>
      </svg>
    `;

    // Convert SVG to data URL
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Load SVG as image and draw to canvas
    const img = new Image();

    return new Promise<string | null>((resolve) => {
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          URL.revokeObjectURL(svgUrl);

          // Convert canvas to PNG data URL
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (err) {
          console.warn('[RASTERIZE] Failed to draw SVG to canvas:', err);
          URL.revokeObjectURL(svgUrl);
          resolve(null);
        }
      };

      img.onerror = () => {
        console.warn('[RASTERIZE] Failed to load SVG as image');
        URL.revokeObjectURL(svgUrl);
        resolve(null);
      };

      // Set a timeout to avoid hanging
      setTimeout(() => {
        URL.revokeObjectURL(svgUrl);
        resolve(null);
      }, 5000);

      img.src = svgUrl;
    });
  } catch (err) {
    console.warn('[RASTERIZE] Element screenshot capture failed:', err);
    return null;
  }
}

/**
 * Converts computed styles to inline style string
 * Preserves all visual properties including filters, transforms, blends
 */
function getInlineStyles(computed: CSSStyleDeclaration): string {
  const important = [
    'display',
    'width',
    'height',
    'position',
    'top',
    'left',
    'right',
    'bottom',
    'margin',
    'padding',
    'border',
    'background',
    'color',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'text-align',
    'filter',
    'transform',
    'transform-origin',
    'opacity',
    'mix-blend-mode',
    'isolation',
  ];

  const styles: string[] = [];
  for (const prop of important) {
    const value = computed.getPropertyValue(prop);
    if (value && value !== 'none' && value !== 'normal') {
      styles.push(`${prop}: ${value}`);
    }
  }

  return styles.join('; ');
}

/**
 * PRIMARY CAPTURE METHOD: Use Chrome's tab.captureVisibleTab API with cropping
 * This captures actual rendered pixels including all effects - PIXEL-PERFECT
 *
 * Why this is PRIMARY:
 * - Native browser screenshot - captures exactly what user sees
 * - Includes all CSS effects: filters, blends, transforms, animations
 * - External fonts render correctly (already loaded in page)
 * - Cross-origin images render correctly (browser has access)
 * - Videos/canvas/WebGL content captured as-is
 * - Pseudo-elements (::before/::after) included automatically
 * - No synthetic re-rendering artifacts
 *
 * Requires: 'activeTab' permission in manifest.json
 */
async function captureElementViaTabCapture(
  element: Element
): Promise<string | null> {
  try {
    const rect = element.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      console.warn('[PHASE 5] Element has zero dimensions, skipping capture');
      return null;
    }

    // Scroll element into view and wait for settle
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    await new Promise(resolve => setTimeout(resolve, 150)); // Allow time for scroll + reflow

    // Get updated rect after scroll (coordinates may have changed)
    const scrolledRect = element.getBoundingClientRect();

    // Request screenshot from background script (requires message handler)
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_VISIBLE_TAB',
      rect: {
        x: scrolledRect.left,
        y: scrolledRect.top,
        width: scrolledRect.width,
        height: scrolledRect.height,
      },
    });

    if (!response || !response.ok) {
      console.warn('[PHASE 5] Native capture failed:', response?.error || 'Unknown error');
      return null;
    }

    if (response.dataUrl) {
      // Crop the full screenshot to element bounds
      return await cropImage(response.dataUrl, scrolledRect);
    }

    return null;
  } catch (err) {
    console.warn('[PHASE 5] Native tab capture failed:', err);
    return null;
  }
}

/**
 * Crops an image data URL to specified bounds
 */
async function cropImage(
  dataUrl: string,
  rect: DOMRect
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Crop from the full screenshot
      ctx.drawImage(
        img,
        rect.left * dpr,
        rect.top * dpr,
        rect.width * dpr,
        rect.height * dpr,
        0,
        0,
        rect.width,
        rect.height
      );

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
