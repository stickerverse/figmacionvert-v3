# rgb | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-util-rgb/
scraped_at: 2025-12-22T03:30:55.023Z
---

On this page

Creates an `RGB` color object from a variety of common color encodings.

**Note**: since `RGB` colors are primarily used for creating `SolidPaint` objects, you might want to use [`solidPaint`](/docs/plugins/api/properties/figma-util-solidpaint/) instead.

Accepted color formats include CSS color strings with hex, `rgb()`, `hsl()`, or `lab()` encodings, as well as `RGB` and `RGBA` objects. Alpha values in the input will be ignored. If a string encoding cannot be parsed, an error will be thrown.

Examples:

```
const color1 = figma.util.rgb('#FF00FF')const color2 = figma.util.rgb('hsl(25% 50% 75%)')
```

You can alias this function for more concise code:

```
const rgb = figma.util.rgbconst color = rgb('#FF00FF')
```

## Signature[​](#signature "Direct link to Signature")

### rgb(color: string | [RGB](/docs/plugins/api/RGB/) | [RGBA](/docs/plugins/api/RGB/#rgba)): [RGB](/docs/plugins/api/RGB/)

## Parameters[​](#parameters "Direct link to Parameters")

### color[​](#color "Direct link to color")

A CSS color string, `RGB` object, or `RGBA` object. The input color's alpha value, if any, will be ignored.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [color](#color)
