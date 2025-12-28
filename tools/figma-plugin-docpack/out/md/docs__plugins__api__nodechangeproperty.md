# NodeChangeProperty | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/NodeChangeProperty/
scraped_at: 2025-12-22T03:30:38.225Z
---

```
type NodeChangeProperty =  | 'pointCount'  | 'name'  | 'width'  | 'height'  | 'parent'  | 'pluginData'  | 'constraints'  | 'locked'  | 'visible'  | 'opacity'  | 'blendMode'  | 'layoutGrids'  | 'guides'  | 'characters'  | 'openTypeFeatures'  | 'styledTextSegments'  | 'vectorNetwork'  | 'effects'  | 'exportSettings'  | 'arcData'  | 'autoRename'  | 'fontName'  | 'innerRadius'  | 'fontSize'  | 'lineHeight'  | 'leadingTrim'  | 'paragraphIndent'  | 'paragraphSpacing'  | 'listSpacing'  | 'hangingPunctuation'  | 'hangingList'  | 'letterSpacing'  | 'textAlignHorizontal'  | 'textAlignVertical'  | 'textCase'  | 'textDecoration'  | 'textAutoResize'  | 'fills'  | 'topLeftRadius'  | 'topRightRadius'  | 'bottomLeftRadius'  | 'bottomRightRadius'  | 'constrainProportions'  | 'strokes'  | 'strokeWeight'  | 'strokeAlign'  | 'strokeCap'  | 'strokeJoin'  | 'strokeMiterLimit'  | 'booleanOperation'  | 'overflowDirection'  | 'dashPattern'  | 'backgrounds'  | 'handleMirroring'  | 'cornerRadius'  | 'cornerSmoothing'  | 'relativeTransform'  | 'x'  | 'y'  | 'rotation'  | 'isMask'  | 'clipsContent'  | 'type'  | 'overlayPositionType'  | 'overlayBackgroundInteraction'  | 'overlayBackground'  | 'prototypeStartNode'  | 'prototypeBackgrounds'  | 'expanded'  | 'fillStyleId'  | 'strokeStyleId'  | 'backgroundStyleId'  | 'textStyleId'  | 'effectStyleId'  | 'gridStyleId'  | 'description'  | 'layoutMode'  | 'paddingLeft'  | 'paddingTop'  | 'paddingRight'  | 'paddingBottom'  | 'itemSpacing'  | 'layoutAlign'  | 'counterAxisSizingMode'  | 'primaryAxisSizingMode'  | 'primaryAxisAlignItems'  | 'counterAxisAlignItems'  | 'layoutGrow'  | 'layoutPositioning'  | 'itemReverseZIndex'  | 'hyperlink'  | 'mediaData'  | 'stokeTopWeight'  | 'strokeBottomWeight'  | 'strokeLeftWeight'  | 'strokeRightWeight'  | 'reactions'  | 'flowStartingPoints'  | 'shapeType'  | 'connectorStart'  | 'connectorEnd'  | 'connectorLineType'  | 'connectorStartStrokeCap'  | 'connectorEndStrokeCap'  | 'codeLanguage'  | 'widgetSyncedState'  | 'componentPropertyDefinitions'  | 'componentPropertyReferences'  | 'componentProperties'  | 'embedData'  | 'linkUnfurlData'  | 'text'  | 'authorVisible'  | 'authorName'  | 'code'  | 'textBackground'
```

Different properties that can be reported by a [PropertyChange](/docs/plugins/api/DocumentChange/#propertychange).

Note that `stokeTopWeight` not spelled correctly. We've kept the misspelling for backward compatibility, but may fix this quirk in a future version of the API.
