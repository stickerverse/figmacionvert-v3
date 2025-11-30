# Copy-Paste Integration Guide

This document contains exact code to copy into `dom-extractor.ts`.

## Step 1: Add Import (Top of File, After Other Imports)

```typescript
import { getCSSPHandler, type CSPHandler } from "./csp-handler";
```

**Location**: After all existing imports, around line 1-50

---

## Step 2: Add Property to Class

Find the line starting with `export class DOMExtractor` and add this property:

```typescript
export class DOMExtractor {
  // ... existing properties ...
  private cspHandler: CSPHandler;
```

**Location**: Around line 200-250 where other private properties are defined

---

## Step 3: Initialize in Constructor

Find the `constructor()` method and add this line:

```typescript
constructor() {
  // ... existing constructor code ...
  this.cspHandler = getCSSPHandler();
  // ... rest of constructor ...
}
```

**Location**: In the constructor, after other initialization

---

## Step 4: Add New Helper Methods

Add these three new methods to the DOMExtractor class.

### Method A: Chunk Validation

```typescript
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
```

### Method B: Fallback Placeholder

```typescript
private createFallbackPlaceholder(url: string): {
  base64: string;
  width: number;
  height: number;
} {
  const domain = this.extractDomainFromUrl(url);
  const label = this.getOptimizedPlaceholderText(url, domain);

  return this.cspHandler.generatePlaceholder(100, 100, label);
}
```

### Method C: Actual Fetch Logic

```typescript
private async performActualFetch(
  url: string,
  targetSizeKB: number
): Promise<{ base64: string; width: number; height: number }> {
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

      if (blob.type === 'image/svg+xml') {
        try {
          console.log(`🎨 Rasterizing SVG: ${url}`);
          blob = await this.convertSvgToPng(blob);
        } catch (e) {
          console.warn(`⚠️ Failed to rasterize SVG:`, e);
        }
      }

      const sizeKB = blob.size / 1024;
      if (sizeKB > targetSizeKB) {
        console.log(
          `🗜️ Compressing image ${url.substring(0, 40)}...`
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
```

---

## Step 5: REPLACE fetchImageAsBase64 Method

Find the existing `private async fetchImageAsBase64(` method and **REPLACE IT ENTIRELY**:

```typescript
private async fetchImageAsBase64(
  url: string,
  targetSizeKB = 500
): Promise<{ base64: string; width: number; height: number }> {
  const dataUrlResult = this.cspHandler.handleDataURL(url);
  if (dataUrlResult.isDataURL) {
    if (dataUrlResult.base64) {
      const dimensions = await this.measureImageFromBase64(
        dataUrlResult.base64
      );
      return {
        base64: dataUrlResult.base64,
        width: dimensions.width || 0,
        height: dimensions.height || 0,
      };
    } else if (dataUrlResult.error) {
      console.warn(`⚠️ Invalid data URL: ${dataUrlResult.error}`);
    }
  }

  if (this.isKnownBlockedDomain(url)) {
    console.log(
      `🚫 [CSP] Pre-emptive fallback for known blocked domain: ${this.extractDomainFromUrl(url)}`
    );
    const domain = this.extractDomainFromUrl(url);
    const label = this.getOptimizedPlaceholderText(url, domain);
    return this.cspHandler.generatePlaceholder(32, 32, label);
  }

  return this.cspHandler.fetchWithCSPFallback(
    () => this.performActualFetch(url, targetSizeKB),
    () => this.createFallbackPlaceholder(url),
    `image ${url.substring(0, 60)}`
  );
}
```

---

## Step 6: Update Chunk Sending Loop

Find `for (let t = 0; t < o; t++)` and update:

```typescript
for (let t = 0; t < o; t++) {
  try {
    this.validateChunkBeforeSend(t, o);
  } catch (validationError) {
    console.error(`❌ Chunk validation failed:`, validationError);
    window.postMessage(
      {
        type: "EXTRACTION_ERROR",
        error: `Context lost: ${validationError}`,
      },
      "*"
    );
    throw validationError;
  }

  const s = t * d;
  const n = Math.min(s + d, e.length);
  const a = e.substring(s, n);

  try {
    window.postMessage(
      {
        type: "EXTRACTION_CHUNK",
        chunkIndex: t,
        totalChunks: o,
        data: a,
        transferId: i.metadata?.timestamp || Date.now().toString(),
      },
      "*"
    );
  } catch (sendError) {
    console.error(`Failed to send chunk ${t}/${o}:`, sendError);
    window.postMessage(
      {
        type: "EXTRACTION_ERROR",
        error: `Failed to send chunk ${t}/${o}: ${sendError}`,
      },
      "*"
    );
    throw sendError;
  }

  await new Promise((e) => setTimeout(e, 10));
}
```

---

## Build & Test

```bash
cd chrome-extension
npm run build

# Test on facebook.com - should see:
# ✓ "Using data URL directly"
# ✓ Heartbeat messages
# ✗ No "violates CSP" errors
```

---

## Files Created/Modified

**Created:**

- `chrome-extension/src/utils/csp-handler.ts` (NEW - 350 lines)

**Modified:**

- `chrome-extension/src/utils/dom-extractor.ts` (5 changes)

**Total Changes:** ~50 lines added, ~30 lines replaced
