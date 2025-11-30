# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

HTML to Figma is a multi-part system for converting live web pages into editable Figma designs. The repo contains:

- `chrome-extension/`: Chrome extension that runs the DOM + style extraction in a real browser.
- `figma-plugin/`: Figma plugin that reconstructs Figma nodes from the extracted schema and auto-imports new captures.
- `capture-service/`: Cloud capture service (API + queue + Playwright workers + S3 storage) for production-scale, headless captures.
- Root utilities: `handoff-server.js`, Puppeteer scripts, and visual validation tools that glue everything together for local development and testing.

There are two main flows:

- **Local handoff flow**: Chrome extension (or Puppeteer) → `handoff-server` on `localhost:4411` → Figma plugin polling the server.
- **Cloud capture flow**: Client submits a URL to `capture-service` → BullMQ + Playwright workers render and extract → results stored in S3 → Figma plugin polls `/api/jobs/next` and imports finished jobs.

For a very detailed technical deep dive, see `CLAUDE.md` and `docs/html-to-figma-architecture.md`.

## Common commands

All commands assume Node.js 18+.

### Install dependencies

- Root utilities (Puppeteer, handoff server, tests, validation):

  ```bash
  npm install
  ```

- Chrome extension:

  ```bash
  cd chrome-extension
  npm install
  ```

- Figma plugin:

  ```bash
  cd figma-plugin
  npm install
  ```

- Cloud capture service:

  ```bash
  cd capture-service
  npm install
  ```

### Local end-to-end workflow (handoff server)

From the repo root:

- Start the handoff server (required for local extension/Puppeteer → Figma flow):

  ```bash
  npm run handoff-server
  ```

Chrome extension:

- One-off production build:

  ```bash
  cd chrome-extension
  npm run build
  ```

- Development build with watch mode:

  ```bash
  cd chrome-extension
  npm run watch
  ```

Figma plugin:

- One-off build:

  ```bash
  cd figma-plugin
  npm run build
  ```

- Development watch:

  ```bash
  cd figma-plugin
  npm run watch
  ```

Headless capture and visual validation (root):

- Headless capture using Puppeteer:

  ```bash
  npm run capture
  ```

  or:

  ```bash
  node puppeteer-auto-import.js https://example.com
  ```

- Pixel-diff visual validation:

  ```bash
  npm run validate:pixels
  ```

See the root `README.md` for step-by-step local usage and troubleshooting.

### Cloud capture service (production-style)

From `capture-service/`:

- Development servers:

  ```bash
  # Terminal 1: Redis (example via Docker)
  docker run -p 6379:6379 redis:7-alpine

  # Terminal 2: API server with hot reload
  npm run dev

  # Terminal 3: Worker pool
  npm run worker
  ```

- Build and run for production:

  ```bash
  npm run build
  npm start          # API server
  node dist/worker.js
  ```

The `capture-service/README.md` contains full API details, deployment options (Docker, Kubernetes, serverless), and configuration via `.env`.

### Tests

Root-level test and workflow scripts (integration-style):

- Quick test run:

  ```bash
  npm test
  ```

- Explicit variants:

  ```bash
  npm run test:quick
  npm run test:comprehensive
  npm run test:headless
  npm run test:performance
  npm run test:e2e
  ```

Cloud capture service unit tests (Vitest):

- All tests:

  ```bash
  cd capture-service
  npm test
  ```

- Run a single test file or test case (Vitest):

  ```bash
  cd capture-service
  npx vitest path/to/file.test.ts
  # or
  npx vitest path/to/file.test.ts -t "test name"
  ```

There are currently no dedicated lint scripts defined in the `package.json` files.

## High-level architecture & key modules

### Data and control flow

- **Capture**:
  - Browser-based via `chrome-extension/`:
    - `src/content-script.ts`: bridge between page and extension.
    - `src/injected-script.ts`: orchestrates DOM traversal, style extraction, component/state detection.
    - `src/background.ts`: service worker that reassembles chunked payloads and forwards to the handoff or cloud service.
    - `src/popup/`: UI for configuring capture and monitoring progress.
  - Headless via root Puppeteer scripts:
    - `puppeteer-auto-import.js`, `complete-automated-workflow.js`, and related `puppeteer-*.js` scripts reuse the same extraction logic from the built extension bundle.

- **Schema contract**:
  - Core shared type: `WebToFigmaSchema` in `chrome-extension/src/types/schema.ts`.
  - Contains page metadata, element tree, assets, styles, components, variants, and optional Yoga layout results.
  - This schema is the single source of truth passed from extension/Playwright to the Figma plugin and (in cloud mode) through `capture-service`.

- **Local handoff server (root)**:
  - `handoff-server.js` is a small Express app running on `http://127.0.0.1:4411`.
  - Responsibilities:
    - Accept capture jobs from the extension or Puppeteer (`POST /jobs`).
    - Queue jobs in memory.
    - Serve jobs to the Figma plugin via long polling (`GET /jobs/next`).
    - Optionally expose a remote `/capture` endpoint that runs the extraction script in headless Chrome.

- **Figma plugin (`figma-plugin/`)**:
  - `src/code.ts`: plugin entrypoint; loads fonts, polls the handoff/cloud service, and triggers imports.
  - `src/node-builder.ts`: converts `WebToFigmaSchema` nodes into Figma API nodes.
  - `src/style-manager.ts`: deduplicates and creates reusable Figma color/text/effect styles.
  - `src/component-manager.ts`, `src/variants-frame-builder.ts`, `src/design-system-builder.ts`: organize components, interactive variants, and design-system frames within Figma pages.

- **Cloud capture service (`capture-service/`)**:
  - `src/server.ts`: Express API for `/api/capture`, `/api/jobs/:id`, `/api/jobs/next`, and `/health` with API-key auth and rate limiting.
  - `src/queue.ts`: BullMQ queue and job state tracking (queued → rendering → extracting → packaging → completed/failed).
  - `src/worker.ts`: Playwright-based workers that open pages, inject the extractor script, and generate schema + screenshots.
  - `src/storage.ts`: S3-compatible storage for schema JSON and assets, with signed URLs for Figma to download.
  - Environment and deployment are driven by `.env`, Docker Compose, `k8s/`, and optional serverless config.

### Where to look for deeper context

- `CLAUDE.md`: Very detailed explanation of the extension, plugin, handoff server, data schema, and validation strategies.
- `docs/`:
  - `html-to-figma-architecture.md`: in-depth architecture and validation notes.
  - `validation.md`: pixel-diff tooling and workflows.
- `capture-service/README.md`: cloud service architecture, API contract, and operational guidance.
- `RAILWAY_DEPLOY_STEPS.md`: step-by-step guide for deploying the capture service to Railway (referenced from `README.md`).

These documents are the best starting points if you need to reason about cross-cutting concerns (e.g., changing the schema, adding new capture options, or modifying how the plugin organizes frames).
