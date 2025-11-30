# Plan: Implement robust capture pipeline for URL → Figma

## Approach

Implement the spec in four phases, keeping the current URL → Figma flow working at all times:

1. Foundations: config + logging + readiness gate.
2. Dynamic state coverage (interactions + scroll sweep + nodeId).
3. CSP-aware assets + serialization fallback.
4. Diagnostics + tests.

## Repo mapping

Key directories:

- `chrome-extension/`
  - `src/injected-script.ts`
  - `src/content-script.ts`
  - `src/background.ts`
  - `src/background-cdp.ts` (if used)
  - `src/high-fidelity-capture.ts`
  - `src/utils/*.ts`:
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
  - `src/types/schema.ts`
- `capture-service/`
  - `src/server.ts`
  - `src/worker.ts`
  - `src/types.ts`
  - `src/logger.ts`
- `figma-plugin/`
  - `src/enhanced-figma-importer.ts`
  - `src/node-builder.ts`
  - `src/layout-solver.ts`
  - `src/screenshot-overlay.ts`
  - `src/types/html.d.ts`
- `shared/`
  - `types.ts`
  - `test-pages.ts`
- `tests/`
  - `golden-test-runner.ts`
- `tools/`
  - `browser-runner.ts`
  - `validation/pixel-diff.js`

## Phase 1: Foundations

**Goals**

- Add `CaptureConfig` and default profiles in shared types/schema.
- Add `LogEvent` type and basic logging helper.
- Implement `waitForStablePage(config)` with telemetry and structured errors in `chrome-extension/src/injected-script.ts` (or a dedicated helper).
- Wire readiness gate into the high-fidelity capture flow (`chrome-extension/src/high-fidelity-capture.ts` and/or `chrome-extension/src/utils/comprehensive-state-capturer.ts` if present).

**Files**

- `shared/types.ts` and/or `chrome-extension/src/types/schema.ts`
- `chrome-extension/src/injected-script.ts`
- `chrome-extension/src/high-fidelity-capture.ts`
- `chrome-extension/src/utils/status-overlay.ts` (if we show readiness status)

## Phase 2: Dynamic state coverage

**Goals**

- Implement safe interaction selection and danger filters, reusing `intelligent-interaction-discoverer.ts` where possible.
- Implement state modes:
  - `base`, `menus-open`, `accordions-open`, `hovered-nav`.
- Implement scroll sweep using `page-scroller.ts` + `IntersectionObserver`.
- Implement stable `nodeId` generation and ensure all snapshots reuse it.

**Files**

- `chrome-extension/src/utils/intelligent-interaction-discoverer.ts`
- `chrome-extension/src/utils/state-capturer.ts`
- `chrome-extension/src/utils/page-scroller.ts`
- `chrome-extension/src/types/schema.ts` and/or `shared/types.ts` (for `nodeId` and `states[]`).

## Phase 3: CSP-aware assets + serialization

**Goals**

- Detect CSP / fetch failures and set `cspMode`.
- Mark assets with `source: "screenshot-fallback"` and rect info when needed.
- Implement worker → main-thread fallback for strict CSP in `background.ts` / `background-cdp.ts` + capture-service if needed.
- Record `captureMode` in metadata.

**Files**

- `chrome-extension/src/utils/csp-handler.ts`
- `chrome-extension/src/background.ts`
- `chrome-extension/src/background-cdp.ts` (if applicable)
- `chrome-extension/src/utils/asset-context-analyzer.ts`
- `capture-service/src/worker.ts`
- `shared/types.ts` / `chrome-extension/src/types/schema.ts`

## Phase 4: Diagnostics + tests

**Goals**

- Add `layoutErrorPx.before/after` to node schema and update `layout-validator.ts` / `figma-plugin/src/screenshot-overlay.ts` to compute and consume it.
- Add `alignmentDiagnostics` and log summary to schema metadata.
- Add unit tests:
  - `waitForStablePage`
  - interaction selector
  - nodeId stability
  - asset fallback tagging
- Add integration tests:
  - Extend `puppeteer-full-extension-test.js` or `comprehensive-e2e-test.js` to cover:
    - static page
    - SPA + lazy-load
    - nav/accordion page
    - strict CSP page

**Files**

- `chrome-extension/src/utils/layout-validator.ts`
- `figma-plugin/src/screenshot-overlay.ts`
- `shared/types.ts`
- `tests/golden-test-runner.ts`
- `puppeteer-full-extension-test.js` or `comprehensive-e2e-test.js`

## Constraints

- The build must pass after each phase.
- Existing minimal capture must keep working; no regressions in core paths.
- Behavior must be tunable via `CaptureConfig` and profiles, not hard-coded magic numbers.
