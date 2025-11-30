/\*\*

- Patch to integrate CSP Handler into DOMExtractor
-
- Add this to chrome-extension/src/utils/dom-extractor.ts
-
- Location: Near the top of the file after imports
  \*/

// ADD IMPORT AT TOP:
// import { getCSSPHandler, type CSPHandler } from './csp-handler';

// ADD PROPERTY TO DOMExtractor CLASS:
private cspHandler: CSPHandler;

// ADD TO CONSTRUCTOR:
constructor() {
// ... existing constructor code ...
this.cspHandler = getCSSPHandler();
}

// ============================================================================
// REPLACE fetchImageAsBase64 method with this version:
// ============================================================================

private async fetchImageAsBase64(
url: string,
targetSizeKB = 500
): Promise<{ base64: string; width: number; height: number }> {
// ✅ FIX #1: Check if this is a data URL and skip fetch
const dataUrlResult = this.cspHandler.handleDataURL(url);
if (dataUrlResult.isDataURL) {
if (dataUrlResult.base64) {
// Successfully parsed data URL - use it directly
const dimensions = await this.measureImageFromBase64(dataUrlResult.base64);
return {
base64: dataUrlResult.base64,
width: dimensions.width || 0,
height: dimensions.height || 0,
};
} else if (dataUrlResult.error) {
console.warn(`⚠️ Invalid data URL: ${dataUrlResult.error}`);
// Fall through to placeholder
}
}

// ✅ FIX #2: Known blocked domains - use placeholder immediately
if (this.isKnownBlockedDomain(url)) {
console.log(`🚫 [CSP] Pre-emptive fallback for known blocked domain: ${this.extractDomainFromUrl(url)}`);
const domain = this.extractDomainFromUrl(url);
const label = this.getOptimizedPlaceholderText(url, domain);
const color = this.getContextualPlaceholderColor(url, domain, true);
return this.cspHandler.generatePlaceholder(32, 32, label);
}

// ✅ FIX #3: Use CSP-safe fetch wrapper
return this.cspHandler.fetchWithCSPFallback(
() => this.performActualFetch(url, targetSizeKB),
() => this.createFallbackPlaceholder(url),
`image ${url.substring(0, 60)}`
);
}

private async performActualFetch(
url: string,
targetSizeKB: number
): Promise<{ base64: string; width: number; height: number }> {
// Validate context before attempting fetch
if (!this.cspHandler.isValid()) {
throw new Error('Extension context invalid - cannot fetch');
}

try {
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let blob = await response.blob();

      // Handle SVG rasterization
      if (blob.type === 'image/svg+xml') {
        try {
          console.log(`🎨 Rasterizing SVG: ${url}`);
          blob = await this.convertSvgToPng(blob);
        } catch (e) {
          console.warn(`⚠️ Failed to rasterize SVG, proceeding with original:`, e);
        }
      }

      // Compress if needed
      const sizeKB = blob.size / 1024;
      if (sizeKB > targetSizeKB) {
        console.log(
          `🗜️ Compressing image ${url.substring(0, 40)}... (${sizeKB.toFixed(1)}KB → target: ${targetSizeKB}KB)`
        );
        const compressed = await this.compressImage(blob, targetSizeKB);
        return compressed;
      }

      const base64 = await this.blobToBase64(blob);
      const dimensions = await this.measureImage(blob);

      return {
        base64,
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }

} catch (error) {
const errorMsg = error instanceof Error ? error.message : String(error);

    // Check for CSP-specific errors
    if (
      errorMsg.includes('CSP') ||
      errorMsg.includes('violated') ||
      errorMsg.includes('Refused') ||
      errorMsg.includes('ERR_BLOCKED_BY_CLIENT')
    ) {
      throw new Error(`CSP_BLOCKED: ${errorMsg}`);
    }

    throw error;

}
}

private createFallbackPlaceholder(url: string): {
base64: string;
width: number;
height: number;
} {
const domain = this.extractDomainFromUrl(url);
const label = this.getOptimizedPlaceholderText(url, domain);
const color = this.getContextualPlaceholderColor(url, domain, true);

return this.cspHandler.generatePlaceholder(100, 100, label);
}

// ============================================================================
// ADD THIS NEW METHOD TO VALIDATE CHUNKS:
// ============================================================================

private validateChunkBeforeSend(
chunkIndex: number,
totalChunks: number
): void {
const validation = this.cspHandler.validateChunkTransfer(
chunkIndex,
totalChunks
);

if (!validation.valid) {
throw new Error(validation.error);
}
}

// ============================================================================
// UPDATE sendExtraction method to validate chunks:
// ============================================================================

// REPLACE this part in sendExtraction:
const o = Math.ceil(e.length / d);
console.log(
`📦 Payload is large (${t.toFixed(2)}MB), chunking into ${o} parts...`
);

for (let t = 0; t < o; t++) {
// ✅ Validate chunk is safe to send
try {
this.validateChunkBeforeSend(t, o);
} catch (validationError) {
console.error(`❌ Chunk validation failed:`, validationError);
window.postMessage({
type: 'EXTRACTION_ERROR',
error: `Context lost during chunk transfer: ${validationError}`,
}, '\*');
throw validationError;
}

const s = t \* d;
const n = Math.min(s + d, e.length);
const a = e.substring(s, n);

try {
window.postMessage(
{
type: 'EXTRACTION_CHUNK',
chunkIndex: t,
totalChunks: o,
data: a,
transferId: i.metadata?.timestamp || Date.now().toString(),
},
'_'
);
} catch (sendError) {
console.error(`Failed to send chunk ${t}/${o}:`, sendError);
window.postMessage({
type: 'EXTRACTION_ERROR',
error: `Failed to send chunk ${t}/${o}: ${sendError}`,
}, '_');
throw sendError;
}

await new Promise((resolve) => setTimeout(resolve, 10));
}

// ============================================================================
// ADD CLEANUP ON COMPLETION:
// ============================================================================

// At the end of extractPage() method:
// Cleanup CSP handler if needed
if (this.cspHandler) {
// Keep handler alive for the plugin lifecycle
console.log('✅ CSP Handler ready for runtime');
}
