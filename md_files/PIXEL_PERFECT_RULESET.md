TITLE: Pixel Perfect Ruleset

This file defines strict rules for achieving near pixel perfect fidelity when converting a webpage snapshot into a Figma document.

SECTION: Coordinate And Sizing Rules

All layout must be derived from browser reported layout metrics, never guessed.
Use device pixels as the canonical unit after applying zoom and device pixel ratio.
For each node, x, y, width, and height must match the final visual border box reported by the browser.
Use floating point values internally and only round at the final step when assigning values to Figma nodes.
Rounding should be to the nearest integer pixel unless a known special case requires another strategy.

SECTION: Style Source Of Truth

For every visual property, the source of truth is the browser computed style for that node.
Do not rely on raw stylesheet text, partial inline styles, or defaults inferred by the code.
If a property does not appear in the computed style result, treat it as missing and handle it through default rules defined here, never by guessing.

SECTION: Unit Normalization

All length like values must be normalized to pixels using browser computed values before mapping to Figma.
This includes em, rem, percentage, viewport units, character units, and any other supported unit.
Store both the numeric pixel value for actual layout and the original string for debugging and diagnostics.
Internal calculations must always use the numeric pixel value.

SECTION: Layout Semantics

Each node must have an explicit layout mode derived from computed display and position.
Examples include block, inline, inline block, flex, grid, absolute, fixed, and sticky.
This layout mode must drive the choice of Figma node type and auto layout configuration.
Flex and grid containers should map to auto layout frames whenever doing so preserves visual structure.
Absolute and fixed elements should be positioned absolutely within their containing frame.

SECTION: Stacking And Z Order

Visual order must respect browser stacking rules including stacking contexts and z index.
Layer order in Figma must follow the final painting order, not naive document order.
Stacking context analysis must determine the order of elements at each level.
When conflicts arise, painting order always wins over implementation convenience.

SECTION: Text Fidelity

Text must remain as editable TextNodes in Figma whenever possible.
For each text node, preserve content, font family or the best available fallback, font weight, font size, line height, letter spacing, alignment, and color.
Do not flatten text to images except under an explicit configuration that allows it for performance reasons.
Whitespace and line breaking behavior should match the browser as closely as Figma allows.

SECTION: Images And Backgrounds

All image sources, including image tags and background images, must be resolved to absolute urls.
Images must be downloaded or otherwise captured once and reused via Figma image references.
Background positioning and sizing must follow browser semantics based on background size and background position.
If multiple background layers exist, represent as multiple paints in Figma when possible.

SECTION: Error Handling

If required data is missing, inconsistent, or impossible to interpret without guessing, the system must not silently proceed.
Instead, it must emit a structured error that includes node identifier, property name, severity, and a human readable description.
The builder may skip only the affected property or node, but this must be clearly recorded in diagnostics.
Errors should be easy for both humans and automated agents to read.

SECTION: No Cosmetic Alterations

The purpose of this system is fidelity, not design improvement or beautification.
The builder must not change typography, spacing, colors, or structure for aesthetic reasons.
The only allowed deviations are those strictly required by Figma limitations or numeric rounding.
Any intentional design improvement belongs in a separate transformation stage, not in the pixel perfect pipeline.

SECTION: Determinism

Given the same url, viewport, device pixel ratio, and configuration, the pipeline must produce the same output every time.
Any non deterministic source such as animations or live feeds must be stabilized during capture, not guessed during building.
Any optional randomness must be disabled in the pixel perfect path.

SECTION: Rule Conflicts

If implementation code conflicts with any rule here, the rulebook wins unless it is clearly incorrect.
When a rule is adjusted, that change must be reflected here so this document remains the single source of truth.

SECTION: Capture Method Policy

The only allowed capture method in production is the Devtools based CDP capture.
Standard screenshot capture using chrome.tabs.captureVisibleTab must not be used as a fallback in the main pipeline.
If CDP capture fails due to restricted urls, debugger conflicts, or other errors, the system must stop and emit a structured error instead of producing a degraded screenshot.
Any introduction of a fallback screenshot path is a violation of this rule and must be removed.
