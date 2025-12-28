# openTypeFeatures | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/TextNode-opentypefeatures/
scraped_at: 2025-12-22T03:30:48.182Z
---

On this page

[OpenType features](https://help.figma.com/hc/en-us/articles/4913951097367) that have been explicitly enabled or disabled.

Supported on:

*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TextSublayerNode](/docs/plugins/api/TextSublayer/)

## Signature[​](#signature "Direct link to Signature")

### [openTypeFeatures](/docs/plugins/api/properties/TextNode-opentypefeatures/): { readonly \[feature in [OpenTypeFeature](/docs/plugins/api/OpenTypeFeature/)\]: boolean} | [figma.mixed](/docs/plugins/api/properties/figma-mixed/) \[readonly\]

## Remarks[​](#remarks "Direct link to Remarks")

The **Details** tab in the [Type settings panel](https://help.figma.com/hc/en-us/articles/360039956634-Explore-text-properties#type-settings) shows all the OpenType features that are available for the current font.

This property gives you a map of four-character OpenType features to booleans indicating whether the features are explicitly enabled or disabled. For example, if the map contains `{ CALT: false }`, then the "Contextual alternates" feature is disabled.

info

This map only contains features that diverge from their default values. Some OpenType features are enabled by default and some are disabled by default. For example `CLIG` and `LIGA` are on by default, whereas `LNUM` and `TNUM` are disabled by default.

Here are some useful resources for learning about OpenType features:

*   [An ode to OpenType \[Figma blog\]](https://www.figma.com/blog/opentype-font-features/)
*   [OpenType feature tags \[Microsoft\]](https://learn.microsoft.com/en-us/typography/opentype/spec/featuretags)
*   [OpenType font features guide \[MDN\]](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Fonts/OpenType_fonts_guide)
*   [OpenType Features in CSS \[Sparanoid\]](https://sparanoid.com/lab/opentype-features/)

Getting OpenType features from the currently-selected text node

```
// For a node that uses the Inter font with// "Contextual alternates" disabled (shows -> instead of ➔):// { CALT: false }console.log(figma.currentPage.selection[0].openTypeFeatures)
```

*   [Signature](#signature)
*   [Remarks](#remarks)
