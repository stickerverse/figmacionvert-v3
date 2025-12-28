# solidPaint | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-util-solidpaint/
scraped_at: 2025-12-22T03:30:55.259Z
---

On this page

Creates a `SolidPaint` object, assigning color and opacity from a variety of common color encodings.

Accepted color formats include CSS color strings with hex, `rgb()`, `hsl()`, or `lab()` encodings, as well as `RGB` and `RGBA` objects. The resulting alpha value will be applied to the `SolidPaint`'s `opacity` property, which defaults to 1 (opaque) if not specified. If a string encoding cannot be parsed, an error will be thrown.

Optionally, you can provide a set of overrides for any of the non-color properties of the `SolidPaint` object. This is useful for modifying the color of an existing `SolidPaint` while preserving its other properties.

Examples:

```
// Set the current page background to redfigma.currentPage.backgrounds = [figma.util.solidPaint("#FF0000")]// Modify an existing SolidPaint with new color and opacityif (node.fills[0].type === 'SOLID') {  const updated = figma.util.solidPaint('#FF00FF88', node.fills[0])}
```

You can alias this function for more concise code:

```
const solidPaint = figma.util.solidPaint// Set the current page background to redfigma.currentPage.backgrounds = [solidPaint("#FF0000")]// Modify an existing SolidPaint with new color and opacityif (node.fills[0].type === 'SOLID') {  const updated = solidPaint('#FF00FF88', node.fills[0])}
```

## Signature[​](#signature "Direct link to Signature")

### solidPaint(color: string | [RGB](/docs/plugins/api/RGB/) | [RGBA](/docs/plugins/api/RGB/#rgba), overrides?: Partial<[SolidPaint](/docs/plugins/api/Paint/#solid-paint)\>): [SolidPaint](/docs/plugins/api/Paint/#solid-paint)

## Parameters[​](#parameters "Direct link to Parameters")

### color[​](#color "Direct link to color")

A CSS color string, `RGB` object, or `RGBA` object.

### overrides[​](#overrides "Direct link to overrides")

An optional object that allows you to specify additional `SolidPaint` properties, aside from color. This is useful for modifying the color of a pre-existing `SolidPaint` object.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [color](#color)
    *   [overrides](#overrides)
