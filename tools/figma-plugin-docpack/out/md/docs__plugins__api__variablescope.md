# VariableScope | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/VariableScope/
scraped_at: 2025-12-22T03:30:59.189Z
---

```
type VariableScope =    "ALL_SCOPES" |    "TEXT_CONTENT" |    "CORNER_RADIUS" |    "WIDTH_HEIGHT" |    "GAP" |    "ALL_FILLS" |    "FRAME_FILL" |    "SHAPE_FILL" |    "TEXT_FILL" |    "STROKE_COLOR" |    "EFFECT_COLOR" |    "STROKE_FLOAT" |    "EFFECT_FLOAT" |    "OPACITY" |    "FONT_FAMILY" |    "FONT_STYLE" |    "FONT_WEIGHT" |    "FONT_SIZE" |    "LINE_HEIGHT" |    "LETTER_SPACING" |    "PARAGRAPH_SPACING" |    "PARAGRAPH_INDENT"
```

Scopes allow a variable to be shown or hidden in the variable picker for various fields. This is useful to help declutter the Figma UI if you have a large number of variables. Scopes are currently supported for `FLOAT`, `STRING` and `COLOR` variables.

`ALL_SCOPES` is a special scope that means that the variable is shown in the picker for all fields. If `ALL_SCOPES` is set, no additional scopes can be set.

`ALL_FILLS` is a special scope that means that the variable is available in the variable picker for all color fill fields. If `ALL_FILLS` is set, no additional fill scopes can be set.

Valid scopes for `FLOAT` variables are: `ALL_SCOPES`, `TEXT_CONTENT`, `CORNER_RADIUS`, `WIDTH_HEIGHT`, `GAP`, `OPACITY`, `STROKE_FLOAT`, `EFFECT_FLOAT`, `FONT_WEIGHT`, `FONT_SIZE`, `LINE_HEIGHT`, `LETTER_SPACING`, `PARAGRAPH_SPACING`, and `PARAGRAPH_INDENT`.

Valid scopes for `COLOR` variables are: `ALL_SCOPES`, `ALL_FILLS`, `FRAME_FILL`, `SHAPE_FILL`, `TEXT_FILL`, `STROKE_COLOR`, and `EFFECT_COLOR`.

Valid scopes for `STRING` variables are: `ALL_SCOPES`, `TEXT_CONTENT`, `FONT_FAMILY`, `FONT_STYLE`.
