# Paint | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Paint/
scraped_at: 2025-12-22T03:30:38.378Z
---

On this page

Figma has five types of paints: solid colors, gradients, images, videos, and patterns (in beta).

```
type Paint =  | SolidPaint  | GradientPaint  | ImagePaint  | VideoPaint  | PatternPaint
```

## Common properties[​](#common-properties "Direct link to Common properties")

### visible?: boolean \[readonly\]

Whether the paint is visible. Defaults to true.

* * *

### opacity?: number \[readonly\]

The opacity of the paint. Must be a value between 0 and 1. Defaults to 1.

You can use the [`solidPaint`](/docs/plugins/api/properties/figma-util-solidpaint/) utility function to set both `color` and `opacity` using CSS color strings:

```
// Create a new SolidPaintconst paint = figma.util.solidPaint('#FF00FF88')// Modify an existing SolidPaintif (node.fills[0].type === 'SOLID') {  const updated = figma.util.solidPaint('#FF00FF88', node.fills[0])}
```

* * *

### blendMode?: [BlendMode](/docs/plugins/api/BlendMode/) \[readonly\]

Determines how the color of this paint blends with the colors underneath it. Defaults to "NORMAL".

* * *

## SolidPaint[​](#solidpaint "Direct link to SolidPaint")

### type: 'SOLID' \[readonly\]

The string literal "SOLID" representing the type of paint this is. Always check the `type` before reading other properties.

* * *

### color: [RGB](/docs/plugins/api/RGB/) \[readonly\]

The color of the paint. This does not have a alpha property, use `opacity` instead.

You can use the [`solidPaint`](/docs/plugins/api/properties/figma-util-solidpaint/) utility function to set both `color` and `opacity` using CSS color strings:

```
// Create a new SolidPaintconst paint = figma.util.solidPaint('#FF00FF88')// Modify an existing SolidPaintif (node.fills[0].type === 'SOLID') {  const updated = figma.util.solidPaint('#FF00FF88', node.fills[0])}
```

* * *

### boundVariables?: { \[field in [VariableBindablePaintField](/docs/plugins/api/VariableBindablePaintField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)} \[readonly\]

The variables bound to a particular field on this paint

* * *

## GradientPaint[​](#gradientpaint "Direct link to GradientPaint")

### type: 'GRADIENT\_LINEAR' | 'GRADIENT\_RADIAL' | 'GRADIENT\_ANGULAR' | 'GRADIENT\_DIAMOND' \[readonly\]

The string literal representing the type of paint this is. Always check the `type` before reading other properties.

* * *

### gradientTransform: [Transform](/docs/plugins/api/Transform/) \[readonly\]

The positioning of the gradient within the layer.

* * *

### gradientStops: ReadonlyArray<[ColorStop](/docs/plugins/api/Paint/#color-stop)\> \[readonly\]

Array of colors and their position within the gradient.

* * *

## ImagePaint[​](#imagepaint "Direct link to ImagePaint")

This is where you'll find images in Figma, as there are no image nodes. See this [example of working with images](/docs/plugins/working-with-images/).

### type: 'IMAGE' \[readonly\]

The string literal "IMAGE" representing the type of paint this is. Always check the `type` before reading other properties.

* * *

### scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE' \[readonly\]

How the image is positioned and scaled within the layer. Same as in the properties panel.

* * *

### imageHash: string | null \[readonly\]

The hash (id) of the image used for this paint, if any. Use [`figma.getImageByHash`](/docs/plugins/api/figma/#getimagebyhash) to get the corresponding image object.

* * *

### imageTransform?: [Transform](/docs/plugins/api/Transform/) \[readonly\]

Applicable only for `scaleMode == "CROP"`. Determines how the image is positioned (thus, cropped) within the layer.

* * *

### scalingFactor?: number \[readonly\]

Applicable only for `scaleMode == "TILE"` (automatic for other modes). Determines the scaling (thus, repetition) of the image within the layer.

* * *

### rotation?: number \[readonly\]

Applicable only for `scaleMode == "TILE" | "FILL" | "FIT"` (automatic for `scaleMode == "CROP"`). Determines the rotation of the image within the layer. Must be in increments of +90.

* * *

### filters?: [ImageFilters](/docs/plugins/api/Paint/#image-filters) \[readonly\]

The values for the image filter slides, equivalent to those in the paint picker. All values default to 0.0 and have range -1.0 to +1.0.

* * *

## ImageFilters[​](#imagefilters "Direct link to ImageFilters")

```
interface ImageFilters {  exposure?: number  contrast?: number  saturation?: number  temperature?: number  tint?: number  highlights?: number  shadows?: number}
```

## ColorStop[​](#colorstop "Direct link to ColorStop")

```
interface ColorStop {  readonly position: number  readonly color: RGBA  readonly boundVariables?: { [field in VariableBindableColorStopField]?: VariableAlias }}
```

### position: number \[readonly\]

The position of the stop along the gradient between 0 and 1

* * *

### color: [RGBA](/docs/plugins/api/RGB/#rgba) \[readonly\]

The color value of the gradient stop

* * *

### boundVariables?: { \[field in [VariableBindableColorStopField](/docs/plugins/api/VariableBindableColorStopField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)} \[readonly\]

The variable bound to a gradient stop

* * *

## VideoPaint[​](#videopaint "Direct link to VideoPaint")

### type: 'VIDEO' \[readonly\]

The string literal "VIDEO" representing the type of paint this is. Always check the `type` before reading other properties.

* * *

### scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE' \[readonly\]

How the image is positioned and scaled within the layer. Same as in the properties panel.

* * *

### videoHash: string | null \[readonly\]

The hash (id) of the video used for this paint, if any.

* * *

### videoTransform?: [Transform](/docs/plugins/api/Transform/) \[readonly\]

Applicable only for `scaleMode == "CROP"`. Determines how the video is positioned (thus, cropped) within the layer.

* * *

### scalingFactor?: number \[readonly\]

Applicable only for `scaleMode == "TILE"` (automatic for other modes). Determines the scaling (thus, repetition) of the video within the layer.

* * *

### rotation?: number \[readonly\]

Applicable only for `scaleMode == "TILE" | "FILL" | "FIT"` (automatic for `scaleMode == "CROP"`). Determines the rotation of the video within the layer. Must be in increments of +90.

* * *

### filters?: [ImageFilters](/docs/plugins/api/Paint/#image-filters) \[readonly\]

The values for the video filter slides, equivalent to those in the paint picker. All values default to 0.0 and have range -1.0 to +1.0.

* * *

## PatternPaint[​](#patternpaint "Direct link to PatternPaint")

Pattern paints are available in beta, and the API is subject to change.

### type: 'PATTERN' \[readonly\]

The string literal representing the type of paint this is. Always check the `type` before reading other properties.

* * *

### sourceNodeId: string \[readonly\]

The node id of the source node for the pattern

* * *

### tileType: 'RECTANGULAR' | 'HORIZONTAL\_HEXAGONAL' | 'VERTICAL\_HEXAGONAL' \[readonly\]

The way the pattern is tiled

* * *

### scalingFactor: number \[readonly\]

The scaling factor of the pattern

* * *

### spacing: [Vector](/docs/plugins/api/Vector/) \[readonly\]

The spacing of the pattern

* * *

### horizontalAlignment: 'START' | 'CENTER' | 'END' \[readonly\]

The horizontal alignment of the pattern

* * *

*   [Common properties](#common-properties)
*   [SolidPaint](#solidpaint)
*   [GradientPaint](#gradientpaint)
*   [ImagePaint](#imagepaint)
*   [ImageFilters](#imagefilters)
*   [ColorStop](#colorstop)
*   [VideoPaint](#videopaint)
*   [PatternPaint](#patternpaint)
