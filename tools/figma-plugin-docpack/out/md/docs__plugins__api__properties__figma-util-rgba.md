# rgba | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-util-rgba/
scraped_at: 2025-12-22T03:30:55.000Z
---

On this page

Creates an `RGBA` color object from a variety of common color encodings.

Accepted color formats include CSS color strings with hex, `rgb()`, `hsl()`, or `lab()` encodings, as well as `RGB` and `RGBA` objects. Alpha defaults to 1 (opaque) if not provided in the input. If a string encoding cannot be parsed, an error will be thrown.

Examples:

```
const layoutGrid = {  pattern: 'GRID',  sectionSize: 1,  color: figma.util.rgba('rgb(25% 25% 25% / 0.5)')}
```

You can alias this function for more concise code:

```
const rgba = figma.util.rgbaconst color = rgba('rgb(25% 25% 25% / 0.5)')
```

## Signature[​](#signature "Direct link to Signature")

### rgba(color: string | [RGB](/docs/plugins/api/RGB/) | [RGBA](/docs/plugins/api/RGB/#rgba)): [RGBA](/docs/plugins/api/RGB/#rgba)

## Parameters[​](#parameters "Direct link to Parameters")

### color[​](#color "Direct link to color")

A CSS color string, `RGB` object, or `RGBA` object.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [color](#color)
