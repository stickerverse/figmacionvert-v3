TITLE: Style Inheritance Engine

This file defines how inherited css properties are resolved so that each node has a complete style description independent of its ancestors.

SECTION: Purpose

Browsers inherit certain css properties from parent elements, especially those related to fonts and text.
For mapping to Figma, it is helpful if each node has a fully resolved style that does not require walking the dom at build time.
The inheritance engine performs this resolution in a preprocessing step.

SECTION: Inherited Properties

Maintain a list of properties that are considered inherited.
Examples include font family, font size, font weight, font style, line height, letter spacing, text color, text alignment, text transform, and whitespace handling.
Non inherited properties fall back to known browser defaults when not explicitly set.

SECTION: Resolution Algorithm

For each node, start with its normalized computed style.
Walk up the dom ancestry toward the root, collecting values for inherited properties when they are explicitly set.
For each inherited property, if the node style is default or undefined and a parent has a concrete value, assign the parent value to the node.
Stop when all inherited properties are filled or when the root is reached.

SECTION: Root Defaults

If no ancestor supplies a value for an inherited property, use a documented default.
Typical defaults include a generic font family, sixteen pixel font size, normal line height, weight four hundred, black text color, left alignment, and normal whitespace.
These defaults should be documented centrally and kept in sync with actual browser behavior.

SECTION: Output

The output of the inheritance engine is a resolvedStyle object per node.
This object contains the same fields as the normalized style but with inherited properties fully filled.
Later stages of the pipeline should use resolvedStyle when setting Figma properties.
