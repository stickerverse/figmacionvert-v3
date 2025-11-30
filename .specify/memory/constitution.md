# Constitution: URL → Figma Pixel-Fidelity Capture

## Non-negotiable principles

- The plugin must never regress from the current working state of URL → Figma import.
- We do incremental hardening of the capture pipeline; we do not throw away the existing architecture.
- Code must be production-grade: type-safe, well-factored, and readable. No demo scripts that linger.
- The capture pipeline must be deterministic and debuggable:
  - Explicit timeouts and error types
  - Structured logging
  - No infinite waits on “network idle” or DOM mutations
- The goal is near pixel-perfect visual fidelity, not a toy importer:
  - Correct layout hierarchy
  - Accurate sizes, positioning, and z-order
  - Correct backgrounds, typography, and images where CSP allows
- Safety:
  - Auto-interactions must never click destructive or auth/payment actions.
  - The capture must avoid navigating away from the target page.

## Scope

This constitution applies to:

- The browser/extension capture code (e.g. `injected-script.ts`, `content-script.ts`, background/worker).
- The schema emitted to the Figma plugin (capture JSON).
- The test suite that validates readiness, interactions, CSP handling, and fidelity.

It does not cover unrelated parts of the repository (pricing logic, plugin UI polish) unless explicitly brought under this spec.

## Tooling & agents

- This repo uses GitHub Spec Kit for spec-driven development.
- Coding agents (Copilot, Claude, etc.) must:
  - Read `.specify/constitution.md`, `spec.md`, and `plan.md` before making large changes.
  - Treat this constitution as higher priority than ad-hoc inline prompts.
