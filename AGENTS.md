# Repository Guidelines
## Project Structure & Module Organization
- Root: orchestration scripts (`handoff-server.js`, `puppeteer-*.js`), quick HTML fixtures, and docs/*.md.
- `chrome-extension/`: TypeScript + Webpack bundle for the browser capture client.
- `figma-plugin/`: esbuild-bundled plugin that imports capture payloads into Figma.
- `capture-service/`: Playwright-based API worker in `src/`, compiled to `dist/`.
- `shared/`: Reusable helpers and test-page configs; `tests/` holds Puppeteer “golden” tests.

## Build, Test, and Development Commands
- Install: `npm install` at root; run `npm install` inside `chrome-extension/`, `figma-plugin/`, and `capture-service/` when editing them.
- Live dev: `npm run handoff-server` (port 4411) + `cd chrome-extension && npm run watch` + `cd figma-plugin && npm run watch`.
- Quick checks: `npm test` (quick workflow), `npm test:quick`, `npm test:comprehensive`, or `npm test:e2e` for full capture/import coverage.
- Visual diff: `npm run validate:pixels` compares captured frames to expected output.
- Capture automation: `npm run capture` or `node puppeteer-auto-import.js <url>` for headless capture/import.
- Subprojects: `cd chrome-extension && npm run build|watch`; `cd figma-plugin && npm run build|watch`; `cd capture-service && npm run dev|build|test` (Vitest).

## Coding Style & Naming Conventions
- TypeScript-first; Node scripts use modern JS. Prefer 2-space indentation, single quotes, trailing semicolons, and small modules. Favor `shared/` helpers before adding new utilities and keep imports relative.
- Build targets use esbuild/webpack—avoid Node-only APIs in code that ships to extension or plugin. No repo-wide linter; mirror nearby style and comment only when logic is non-obvious.

## Testing Guidelines
- Root tests rely on Puppeteer flows in `shared/test-pages`; golden runs write artifacts to `test-results/`.
- For capture or layout changes, run `npm test` or `npm test:e2e` plus `npm run validate:pixels`.
- Capture service: `cd capture-service && npm test` (Vitest). Add `*.test.ts` next to code and stub external services.

## Commit & Pull Request Guidelines
- History uses concise, present-tense subjects (e.g., “Add secure Railway deployment”, “Fix Railway deployment AWS credentials build error”). Keep subjects ≤72 chars; add scope tags when helpful (`capture-service`, `plugin`).
- PRs should describe behavior changes, list affected surfaces (extension/plugin/service), include before/after screenshots, and link issues or deployment notes.
- State how to reproduce validation (commands + sample URL) and note any skipped tests or known edge cases.

## Security & Configuration Tips
- Secrets stay in env vars (e.g., `REDIS_HOST/PORT/PASSWORD`, `AWS_ACCESS_KEY_ID/SECRET_ACCESS_KEY` for `capture-service`). Use `.env` locally; never commit keys.
- Confirm external endpoints and CORS settings before capturing production sites; handoff server defaults to localhost to limit exposure.
