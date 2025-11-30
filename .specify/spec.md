# Spec: Robust Capture Pipeline for URL → Figma

## Problem

The current URL → Figma system (Chrome extension + capture-service + Figma plugin) can import DOM structure and generate Figma nodes, but visual fidelity is still inconsistent:

- Missing or incorrect images, especially under CSP.
- Flat colors and incomplete background / typography mapping.
- Layout drift between webpage and Figma.
- Unreliable capture on dynamic sites (SPAs, lazy-load, interactive states).
- Occasional hangs due to naive “page ready” checks.

We need to harden the capture pipeline (browser/extension + capture-service + schema) so it produces a high-quality, debuggable JSON schema that the Figma plugin can turn into a near pixel-perfect recreation of the page.

## Targets in this repo

- Chrome extension:
  - `chrome-extension/src/injected-script.ts`
  - `chrome-extension/src/content-script.ts`
  - `chrome-extension/src/background.ts`
  - `chrome-extension/src/high-fidelity-capture.ts`
  - `chrome-extension/src/utils/*.ts`:
    - `dom-extractor.ts`
    - `enhanced-dom-extractor.ts`
    - `page-scroller.ts`
    - `intelligent-interaction-discoverer.ts`
    - `state-capturer.ts`
    - `status-overlay.ts`
    - `csp-handler.ts`
    - `asset-context-analyzer.ts`
    - `layout-validator.ts`
    - etc.
  - `chrome-extension/src/types/schema.ts`
- Shared:
  - `shared/types.ts`
  - `shared/test-pages.ts`
- Capture backend (as needed):
  - `capture-service/src/*.ts` where it processes capture requests/responses.
- Figma plugin (schema consumers only):
  - `figma-plugin/src/enhanced-figma-importer.ts`
  - `figma-plugin/src/node-builder.ts`
  - `figma-plugin/src/layout-solver.ts`
  - `figma-plugin/src/screenshot-overlay.ts`
  - `figma-plugin/src/types/html.d.ts`

We are not rewriting the whole plugin; we are tightening capture + schema + diagnostics so fidelity improves and is debuggable.

## Goals

- Deterministic page readiness gate:
  - DOMContentLoaded
  - Robust network-idle heuristic with hard caps
  - Fonts + layout stability waiting
  - Timing telemetry + structured errors
- Controlled dynamic state coverage:
  - Safe auto-interactions (menus, accordions, hovers)
  - Scroll sweep for lazy-loaded content
  - Stable node IDs across states and merged snapshots
- CSP-aware and asset-robust capture:
  - Explicit CSP / fetch failure marking (`cspMode`, asset flags)
  - Screenshot-based fallbacks where possible
  - Worker → main-thread fallback for strict CSP
- Alignment diagnostics:
  - Per-node layout drift metrics (`layoutErrorPx`)
  - Metadata summary for alignment and asset issues
- Structured logging and config:
  - Consistent `LogEvent` shape
  - Configurable capture profiles (fast vs high-fidelity)
  - Tunable timeouts, interaction modes, CSP behavior

## Non-goals

- Reimplementing a full browser layout engine.
- Changing the top-level architecture (Chrome extension ↔ capture-service ↔ Figma plugin).
- Perfect fidelity for every obscure CSS feature; we prioritize what actually impacts real pages (layouts, typography, backgrounds, key images).

## Requirements

### 1. Deterministic page readiness gate

Implement `waitForStablePage(config): Promise<PageReadinessResult>` in the page context (likely `chrome-extension/src/injected-script.ts` or a dedicated helper).

Behavior:

- Wait for `DOMContentLoaded`.
- Track XHR/fetch network activity initiated by the page:
  - “Network idle” = no tracked requests in flight for ≥ 800–1000 ms.
  - Cap network-idle wait at 12–15 s.
  - Ignore long-lived connections (WebSocket, EventSource).
- Fonts:
  - `await document.fonts.ready` if available, with a 5 s timeout.
  - On timeout, set `fontsReadyTimedOut = true` and continue.
- Layout stability:
  - `MutationObserver` on `document.body`.
  - `PerformanceObserver` for `layout-shift` when available.
  - `stableWindowMs` (default 2000 ms): resolve only after no mutations or significant layout shifts occur in that window.
- Global timeout:
  - If readiness not achieved within 25–30 s, reject with a structured error:
    - `type: "PAGE_NOT_STABLE"`
    - `phase` (e.g. `"networkIdle"` or `"layoutStable"`)
    - `timings` and `url`.

`PageReadinessResult` must include:

- `domContentLoadedAt`
- `networkIdleAt` (or `null`)
- `fontsReadyAt` (or `null`)
- `stableAt`
- Flags: `fontsReadyTimedOut`, `usedLayoutShiftObserver`, etc.

### 2. Controlled dynamic state coverage

Use existing utilities where possible (`intelligent-interaction-discoverer.ts`, `state-capturer.ts`, `page-scroller.ts`), but enforce:

- Safe interaction selection:
  - Whitelist selectors:
    - `[aria-expanded]`, `[role="button"]`, `[role="tab"]`, `details > summary`, `button`, `a[href^="#"]`, `.accordion-toggle`, `.menu-toggle`
  - Danger filters:
    - Exclude elements whose text matches `/(delete|remove|logout|sign out|unsubscribe)/i`.
    - Exclude cart/checkout/login/payment links.
    - Exclude elements inside obvious auth/payment containers.
    - Respect `[data-no-auto-click]`.
- State modes:
  - `base`
  - `menus-open`
  - `accordions-open`
  - `hovered-nav` (limit to first N nav items, e.g. 5)
- For each mode:
  - Apply deterministic interactions for that mode.
  - Call `waitForStablePage` with shorter `stableWindowMs` (e.g. 800 ms).
  - Capture DOM + assets.
  - Tag nodes/assets with `states[]` (list of modes where they appear).

Scroll sweep:

- Scroll in increments of half viewport height from top to a configurable max depth (`maxScrollDepthScreens`).
- Use `IntersectionObserver` to detect newly visible lazy-loaded content.
- After new content appears, wait 200–500 ms of local stability before advancing.

Stable node IDs:

- Each captured node gets a deterministic `nodeId`:
  - Prefer stable `id`.
  - Else meaningful `data-*` attributes.
  - Else deterministic path + index + text hash.
- The same DOM node across states must have the same `nodeId`.

### 3. CSP-safe assets and serialization

- Asset fetching:
  - Detect CSP / network errors and record on assets:
    - `sourceError`
    - `cspBlocked` where applicable.
- CSP mode:
  - If workers or cross-origin fetch are blocked (exceptions, security errors, repeated CSP failures), set `cspMode = "strict"`.
  - In strict mode:
    - Fall back to main-thread chunking or simplified capture.
    - Set `captureMode = "worker-fallback-main-thread"` (or similar) in metadata.
- Screenshot fallback:
  - For visible elements whose asset fetch fails:
    - `source: "screenshot-fallback"`.
    - Record bounding rect and screenshot index/scale.
    - If canvas is tainted and cropping is impossible, set `canCrop: false` but keep rect.

### 4. Alignment diagnostics

- Per node:
  - Compare DOM rect vs mapped Figma rect (where available).
  - Record `layoutErrorPx.before` and `layoutErrorPx.after` with `dx`, `dy`, `dw`, `dh`.
- Metadata:
  - `alignmentDiagnostics` summary:
    - Counts of nodes above error thresholds.
    - Flags like “many nodes offscreen”.

### 5. Structured logging

Common log shape:

```ts
type LogEvent = {
  level: "debug" | "info" | "warn" | "error";
  scope: "readiness" | "interaction" | "assets" | "schema" | "csp";
  message: string;
  data?: Record<string, any>;
  ts: number;
};

