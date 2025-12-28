# AnnotationProperty | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/AnnotationProperty/
scraped_at: 2025-12-22T03:30:33.634Z
---

```
interface AnnotationProperty {  readonly type: AnnotationPropertyType}type AnnotationPropertyType =  | 'width'  | 'height'  | 'maxWidth'  | 'minWidth'  | 'maxHeight'  | 'minHeight'  | 'fills'  | 'strokes'  | 'effects'  | 'strokeWeight'  | 'cornerRadius'  | 'textStyleId'  | 'textAlignHorizontal'  | 'fontFamily'  | 'fontStyle'  | 'fontSize'  | 'fontWeight'  | 'lineHeight'  | 'letterSpacing'  | 'itemSpacing'  | 'padding'  | 'layoutMode'  | 'alignItems'  | 'opacity'  | 'mainComponent'  | 'gridRowGap'  | 'gridColumnGap'  | 'gridRowCount'  | 'gridColumnCount'  | 'gridRowAnchorIndex'  | 'gridColumnAnchorIndex'  | 'gridRowSpan'  | 'gridColumnSpan'
```

A property pinned in an [Annotation](/docs/plugins/api/Annotation/).
