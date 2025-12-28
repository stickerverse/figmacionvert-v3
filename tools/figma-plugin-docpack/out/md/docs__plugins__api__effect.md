# Effect | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Effect/
scraped_at: 2025-12-22T03:30:35.802Z
---

On this page

Effects can be grouped into five categories of properties: `DropShadowEffect`, `InnerShadowEffect`, `BlurEffect`, `NoiseEffect`, and `TextureEffect`. The `Effect` type is then one of the five:

```
type Effect =  | DropShadowEffect  | InnerShadowEffect  | BlurEffect  | NoiseEffect  | TextureEffect
```

## DropShadowEffect[​](#dropshadoweffect "Direct link to DropShadowEffect")

### type: 'DROP\_SHADOW' \[readonly\]

The string literal representing the type of effect this is. Always check the `type` before reading other properties.

* * *

### color: [RGBA](/docs/plugins/api/RGB/#rgba) \[readonly\]

The color of the shadow, including its opacity.

* * *

### offset: [Vector](/docs/plugins/api/Vector/) \[readonly\]

The offset of the shadow relative to its object. Use this property to simulate the direction of the light.

* * *

### radius: number \[readonly\]

The blur radius of the shadow. Must be >= 0. A lower radius creates a sharper shadow.

* * *

### spread?: number \[readonly\]

The distance by which to expand (or contract) the shadow. For drop shadows, a positive spread value creates a shadow larger than the node, whereas a negative value creates a shadow smaller than the node. For inner shadows, a positive `spread` value contracts the shadow. `spread` values are only accepted on rectangles and ellipses, or on frames, components, and instances with visible fill paints and `clipsContent` enabled. When left unspecified, the default value is 0.

* * *

### visible: boolean \[readonly\]

Whether this shadow is visible.

* * *

### blendMode: [BlendMode](/docs/plugins/api/BlendMode/) \[readonly\]

Determines how the color of this shadow blends with the colors underneath it. The typical default value is "NORMAL".

* * *

### showShadowBehindNode?: boolean \[readonly\]

Whether the drop shadow should show behind translucent or transparent pixels within the node's geometry. Defaults to `false`.

* * *

### boundVariables?: { \[field in [VariableBindableEffectField](/docs/plugins/api/VariableBindableEffectField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)} \[readonly\]

The variables bound to a particular field on this shadow effect

* * *

## InnerShadowEffect[​](#innershadoweffect "Direct link to InnerShadowEffect")

### type: 'INNER\_SHADOW' \[readonly\]

The string literal representing the type of effect this is. Always check the `type` before reading other properties.

* * *

### color: [RGBA](/docs/plugins/api/RGB/#rgba) \[readonly\]

The color of the shadow, including its opacity.

* * *

### offset: [Vector](/docs/plugins/api/Vector/) \[readonly\]

The offset of the shadow relative to its object. Use this property to simulate the direction of the light.

* * *

### radius: number \[readonly\]

The blur radius of the shadow. Must be >= 0. A lower radius creates a sharper shadow.

* * *

### spread?: number \[readonly\]

The distance by which to expand (or contract) the shadow. For drop shadows, a positive spread value creates a shadow larger than the node, whereas a negative value creates a shadow smaller than the node. For inner shadows, a positive `spread` value contracts the shadow. `spread` values are only accepted on rectangles and ellipses, or on frames, components, and instances with visible fill paints and `clipsContent` enabled. When left unspecified, the default value is 0.

* * *

### visible: boolean \[readonly\]

Whether this shadow is visible.

* * *

### blendMode: [BlendMode](/docs/plugins/api/BlendMode/) \[readonly\]

Determines how the color of this shadow blends with the colors underneath it. The typical default value is "NORMAL".

* * *

### boundVariables?: { \[field in [VariableBindableEffectField](/docs/plugins/api/VariableBindableEffectField/)\]?: [VariableAlias](/docs/plugins/api/VariableAlias/)} \[readonly\]

The variables bound to a particular field on this shadow effect

* * *

## BlurEffect[​](#blureffect "Direct link to BlurEffect")

A blur effect can either normal or progressive (in beta, API is subject to change):

```
type BlurEffect = BlurEffectNormal | BlurEffectProgressive
```

### Common properties[​](#common-properties "Direct link to Common properties")

### type: 'LAYER\_BLUR' | 'BACKGROUND\_BLUR' \[readonly\]

The string literal representing the type of effect this is. Always check the `type` before reading other properties.

* * *

### radius: number \[readonly\]

The radius of the blur. Must be >= 0. A lower radius creates a sharper blur. For progressive blurs, this is the end radius of the blur.

* * *

### visible: boolean \[readonly\]

Whether this blur is visible.

* * *

### boundVariables?: { \['radius'\]: [VariableAlias](/docs/plugins/api/VariableAlias/) } \[readonly\]

The variable bound to the radius field on this blur effect

* * *

### BlurEffectNormal[​](#blureffectnormal "Direct link to BlurEffectNormal")

### blurType: 'NORMAL' \[readonly\]

The string literal representing the blur type. Always check the `blurType` before reading other properties.

* * *

### BlurEffectProgressive[​](#blureffectprogressive "Direct link to BlurEffectProgressive")

Progressive blur is in beta, and the API is subject to change.

### blurType: 'PROGRESSIVE' \[readonly\]

The string literal representing the blur type. Always check the `blurType` before reading other properties.

* * *

### startRadius: number \[readonly\]

Radius of the starting point of the progressive blur.

* * *

### startOffset: [Vector](/docs/plugins/api/Vector/) \[readonly\]

Position of the starting point of the progressive blur. The position is in normalized object space (top left corner of the bounding box of the object is (0, 0) and the bottom right is (1,1)).

* * *

### endOffset: [Vector](/docs/plugins/api/Vector/) \[readonly\]

Position of the ending point of the progressive blur. The position is in normalized object space (top left corner of the bounding box of the object is (0, 0) and the bottom right is (1,1)).

* * *

## NoiseEffect[​](#noiseeffect "Direct link to NoiseEffect")

Noise effect is available in beta, and the API is subject to change.

There are three types of noise effects:

```
type NoiseEffect =  | NoiseEffectMonotone  | NoiseEffectDuotone  | NoiseEffectMultitone
```

### Common properties[​](#common-properties-1 "Direct link to Common properties")

### type: 'NOISE' \[readonly\]

The string literal representing the type of effect this is. Always check the `type` before reading other properties.

* * *

### color: [RGBA](/docs/plugins/api/RGB/#rgba) \[readonly\]

The color of the noise effect.

* * *

### visible: boolean \[readonly\]

Whether the noise effect is visible.

* * *

### blendMode: [BlendMode](/docs/plugins/api/BlendMode/) \[readonly\]

The blend mode of the noise.

* * *

### noiseSize: number \[readonly\]

The size of the noise effect.

* * *

### density: number \[readonly\]

The density of the noise effect.

* * *

### boundVariables?: { } \[readonly\]

Noise effects currently do not support binding variables.

* * *

### NoiseEffectMonotone[​](#noiseeffectmonotone "Direct link to NoiseEffectMonotone")

### noiseType: 'MONOTONE' \[readonly\]

The string literal representing the type of noise this is. Always check the `noiseType` before reading other properties.

* * *

### NoiseEffectDuotone[​](#noiseeffectduotone "Direct link to NoiseEffectDuotone")

### noiseType: 'DUOTONE' \[readonly\]

The string literal representing the type of noise this is. Always check the `noiseType` before reading other properties.

* * *

### secondaryColor: [RGBA](/docs/plugins/api/RGB/#rgba) \[readonly\]

The secondary color of the noise effect.

* * *

### NoiseEffectMultitone[​](#noiseeffectmultitone "Direct link to NoiseEffectMultitone")

### noiseType: 'MULTITONE' \[readonly\]

The string literal representing the type of noise this is. Always check the `noiseType` before reading other properties.

* * *

### opacity: number \[readonly\]

The opacity of the noise effect.

* * *

## TextureEffect[​](#textureeffect "Direct link to TextureEffect")

Texture effect is available in beta, and the API is subject to change.

### type: 'TEXTURE' \[readonly\]

The string literal representing the type of effect this is. Always check the `type` before reading other properties.

* * *

### visible: boolean \[readonly\]

Whether the texture effect is visible.

* * *

### noiseSize: number \[readonly\]

The size of the texture effect.

* * *

### radius: number \[readonly\]

The radius of the texture effect.

* * *

### clipToShape: boolean \[readonly\]

Whether the texture is clipped to the shape.

* * *

### boundVariables?: { } \[readonly\]

Texture effects currently do not support binding variables.

* * *

## GlassEffect[​](#glasseffect "Direct link to GlassEffect")

Glass effect is available in beta, and the API is subject to change.

### type: 'GLASS' \[readonly\]

The string literal representing the type of effect this is. Always check the `type` before reading other properties.

* * *

### visible: boolean \[readonly\]

Whether this glass effect is visible.

* * *

### lightIntensity: number \[readonly\]

The intensity of specular highlights. Must be between 0 and 1. Higher values create brighter highlights.

* * *

### lightAngle: number \[readonly\]

The angle of the specular light in degrees. Controls the direction of highlights on the glass surface.

* * *

### refraction: number \[readonly\]

The intensity of the refraction distortion. Must be between 0 and 1. Higher values create more distortion.

* * *

### depth: number \[readonly\]

The depth of the refraction effect. Must be >= 1. Higher values create deeper glass appearance.

* * *

### dispersion: number \[readonly\]

The amount of chromatic aberration (color separation). Must be between 0 and 1. Higher values create more rainbow-like distortion at edges.

* * *

### radius: number \[readonly\]

The radius of frost on the glass effect.

* * *

### boundVariables?: { } \[readonly\]

Glass effects currently do not support binding variables.

* * *

*   [DropShadowEffect](#dropshadoweffect)
*   [InnerShadowEffect](#innershadoweffect)
*   [BlurEffect](#blureffect)
    *   [Common properties](#common-properties)
    *   [BlurEffectNormal](#blureffectnormal)
    *   [BlurEffectProgressive](#blureffectprogressive)
*   [NoiseEffect](#noiseeffect)
    *   [Common properties](#common-properties-1)
    *   [NoiseEffectMonotone](#noiseeffectmonotone)
    *   [NoiseEffectDuotone](#noiseeffectduotone)
    *   [NoiseEffectMultitone](#noiseeffectmultitone)
*   [TextureEffect](#textureeffect)
*   [GlassEffect](#glasseffect)
