# StyledTextSegment | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/StyledTextSegment/
scraped_at: 2025-12-22T03:30:39.593Z
---

Represents a range of characters in a text node and its styles.

### characters: string

The characters in the range of text with the same styles.

* * *

### start: number

Start index (inclusive) of the range of characters.

* * *

### end: number

End index (exclusive) of the range of characters.

* * *

### fontSize: number

The size of the font. Has minimum value of 1.

* * *

### fontName: [FontName](/docs/plugins/api/FontName/)

The font family (e.g. "Inter"), and font style (e.g. "Regular").

* * *

### fontWeight: number

The weight of the font (e.g. 400 for "Regular", 700 for "Bold").

* * *

### fontStyle: [FontStyle](/docs/plugins/api/FontStyle/)

The style of the font (i.e. "REGULAR", "ITALIC").

* * *

### textDecoration: [TextDecoration](/docs/plugins/api/TextDecoration/)

Whether the text is underlined or has a strikethrough.

* * *

### textDecorationStyle: [TextDecorationStyle](/docs/plugins/api/TextDecorationStyle/) | null

The text decoration style (e.g. "SOLID"). If the text is not underlined, this value will be null.

* * *

### textDecorationOffset: [TextDecorationOffset](/docs/plugins/api/TextDecorationOffset/) | null

The text decoration offset. If the text is not underlined, this value will be null.

* * *

### textDecorationThickness: [TextDecorationThickness](/docs/plugins/api/TextDecorationThickness/) | null

The text decoration thickness. If the text is not underlined, this value will be null.

* * *

### textDecorationColor: [TextDecorationColor](/docs/plugins/api/TextDecorationColor/) | null

The text decoration color. If the text is not underlined, this value will be null.

* * *

### textDecorationSkipInk: boolean | null

Whether the text decoration skips descenders. If the text is not underlined, this value will be null.

* * *

### textCase: [TextCase](/docs/plugins/api/TextCase/)

Overrides the case of the raw characters in the text node.

* * *

### lineHeight: [LineHeight](/docs/plugins/api/LineHeight/)

The spacing between the lines in a paragraph of text.

* * *

### letterSpacing: [LetterSpacing](/docs/plugins/api/LetterSpacing/)

The spacing between the individual characters.

* * *

### fills: [Paint](/docs/plugins/api/Paint/)\[\]

The paints used to fill the area of the shape.

* * *

### textStyleId: string

The id of the TextStyle object that the text properties of this node are linked to

* * *

### fillStyleId: string

The id of the PaintStyle object that the fills property of this node is linked to.

* * *

### listOptions: [TextListOptions](/docs/plugins/api/TextListOptions/)

The list settings.

* * *

### listSpacing: number

The spacing between list items.

* * *

### indentation: number

The indentation.

* * *

### paragraphIndent: number

The paragraph indent.

* * *

### paragraphSpacing: number

The paragraph spacing.

* * *

### hyperlink: [HyperlinkTarget](/docs/plugins/api/HyperlinkTarget/) | null

A HyperlinkTarget if the text node has exactly one hyperlink, or null if the node has none.

* * *

### openTypeFeatures: { readonly \[feature in [OpenTypeFeature](/docs/plugins/api/OpenTypeFeature/)\]: boolean}

OpenType features that have been explicitly enabled or disabled.

* * *

### boundVariables?: { \[field in [VariableBindableTextField](/docs/plugins/api/VariableBindableTextField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)}

The variables bound to a particular field.

* * *

### textStyleOverrides: [TextStyleOverrideType](/docs/plugins/api/TextStyleOverrides/#text-style-override-type)\[\]

Overrides applied over a text style.

* * *
