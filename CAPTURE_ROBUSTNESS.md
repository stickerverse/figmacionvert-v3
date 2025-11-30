# Robust Capture Pipeline Verification

This document outlines the verification steps for the new Robust Capture Pipeline. The goal is to ensure that the extension reliably captures complex sites (like Amazon) and fails gracefully with clear error messages when issues occur.

## 1. Feature Overview

The new pipeline introduces:

- **CaptureResult Type**: Explicit `ok` vs `error` status with structured error codes.
- **Phase Timeouts**: Hard limits for Readiness (20s), Scrolling (30s), and DOM Extraction (60s).
- **Guards**:
  - **Payload Size**: Fails if estimated size > 500MB.
  - **Double Scroll**: Prevents the "double scroll" effect by coordinating between content and injected scripts.
- **UI Feedback**: Displays detailed error codes (e.g., `TIMEOUT_DOM_SNAPSHOT`, `PAYLOAD_TOO_LARGE`) in the completion dialog.

## 2. Verification Test Plan

### Test Case A: Successful Capture of Complex Site

**Target**: `https://www.amazon.com/` (Homepage)
**Steps**:

1. Open Amazon.com and wait for it to load.
2. Open the Figma Extension.
3. Click "Capture Page".
   **Expected Outcome**:

- [ ] Extension scrolls the page **once** (no double scroll).
- [ ] Progress bar moves smoothly through phases (Readiness -> Scrolling -> Extraction).
- [ ] Capture completes successfully.
- [ ] "Page Captured!" dialog appears with green checkmark.
- [ ] "Send to Figma" works correctly.

### Test Case B: Timeout Handling (Simulated)

**Target**: Any heavy page (e.g., `https://www.cnn.com/`)
**Steps**:

1. _Note: This requires temporarily modifying `injected-script.ts` to force a timeout._
   - Change `20000` (Readiness timeout) to `100` in `performCompleteExtraction`.
2. Build extension (`npm run build`).
3. Reload extension and capture the page.
   **Expected Outcome**:

- [ ] Capture stops immediately.
- [ ] Dialog appears with **Red X** and "Capture Failed".
- [ ] Error code `TIMEOUT_GLOBAL` or `TIMEOUT_WAITING_FOR_IDLE` is displayed.
- [ ] Error details are visible.

### Test Case C: Payload Size Limit

**Target**: A page with massive data (or simulated)
**Steps**:

1. _Note: This requires temporarily modifying `injected-script.ts`._
   - Change the limit check `if (estimatedPayloadMB > 500)` to `if (estimatedPayloadMB > 0.1)`.
2. Build extension (`npm run build`).
3. Reload extension and capture a regular page.
   **Expected Outcome**:

- [ ] Capture stops during "Estimating payload size..." phase.
- [ ] Dialog appears with **Red X** and "Capture Failed".
- [ ] Error code `PAYLOAD_TOO_LARGE` is displayed.
- [ ] Message indicates the size exceeded the limit.

### Test Case D: Double Scroll Prevention

**Target**: Any long page (e.g., `https://en.wikipedia.org/wiki/History_of_the_world`)
**Steps**:

1. Capture the page.
2. Watch the scroll behavior carefully.
   **Expected Outcome**:

- [ ] The page should scroll down **once** to capture the full height screenshot.
- [ ] It should **NOT** scroll a second time for DOM extraction (the console logs should say "Skipping scroll phase").

## 3. Troubleshooting

If you see "Unknown Error":

1. Open Chrome DevTools (F12) > Console.
2. Look for `❌ Extraction error:` logs.
3. Check if the error object contains `code` and `details`.

If the capture hangs without error:

1. Check the console for `⏰ Extraction timeout` logs from the content script (backup watchdog).
