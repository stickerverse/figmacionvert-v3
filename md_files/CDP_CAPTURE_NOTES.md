TITLE: Devtools Capture Notes

This file provides practical notes on using Chrome Devtools Protocol as the capture engine for the pixel perfect pipeline.

SECTION: Domains To Enable

Page domain for navigation and screenshots
Dom domain for tree and box model inspection
Css domain for computed styles
Network domain for resource tracking
Runtime domain for script evaluation
Overlay domain optionally for debugging overlays during development

SECTION: Page Lifecycle

Enable required domains before navigating.
Use Page navigate to load the target url.
Listen for load event fired as a basic readiness signal.
Combine this with a network idle heuristic to avoid capturing too early.
Optionally, use Runtime evaluate to poll for page specific readiness, such as completion of client side rendering.

SECTION: Style And Layout Collection

Use Css domain methods to fetch computed styles for each dom node.
Use Dom domain methods to obtain box model and content quads for each relevant element.
Ensure that capture runs after stabilization, so layout positions do not change mid capture.

SECTION: Stabilization Scripts

Inject a short script that applies global styles to pause animations and transitions.
Examples include setting animation play state to paused and transitions to none on all elements.
Optionally disable scroll or auto advance behavior in certain containers when needed for stability.
Scripts must be idempotent and safe to run multiple times.

SECTION: Screenshots

Use Page captureScreenshot when a full page image is needed for debugging or analysis.
Store screenshots separately from the structural capture, so they do not become a hard dependency of the builder.
Provide tooling to compare screenshots against Figma renders for visual diffing.

SECTION: Timeouts And Reliability

Set explicit timeouts for navigation, readiness waiting, and capture operations.
If a timeout occurs, return a structured failure with details rather than partial success.
Log failing urls and conditions to help refine capture rules and heuristics.

SECTION: Security And Permissions

Be aware of cross origin restrictions that may limit dom or style access in certain contexts.
When a page cannot be fully inspected due to security constraints, record this explicitly and avoid pretending the capture is complete.
