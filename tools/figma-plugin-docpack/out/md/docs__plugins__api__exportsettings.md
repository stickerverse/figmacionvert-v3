# ExportSettings | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/ExportSettings/
scraped_at: 2025-12-22T03:30:36.072Z
---

On this page

Figma has four types of exports: images, SVGs, PDFs, and REST API JSON.

```
type ExportSettings =  | ExportSettingsImage  | ExportSettingsSVG  | ExportSettingsPDF  | ExportSettingsREST
```

`ExportSettings` is used for the [`exportSettings`](/docs/plugins/api/node-properties/#exportsettings) property and the [`exportAsync`](/docs/plugins/api/properties/nodes-exportasync/) function.

## Common properties[​](#common-properties "Direct link to Common properties")

### contentsOnly?: boolean \[readonly\]

Whether only the contents of the node are exported, or any overlapping layer in the same area. Defaults to `true`.

* * *

### useAbsoluteBounds?: boolean \[readonly\]

Use the full dimensions of the node regardless of whether or not it is cropped or the space around it is empty. Use this to export text nodes without cropping. Defaults to `false`.

* * *

### suffix?: string \[readonly\]

Suffix appended to the file name when exporting. Defaults to empty string.

* * *

### colorProfile?: 'DOCUMENT' | 'SRGB' | 'DISPLAY\_P3\_V4' \[readonly\]

Color profile of the export.

Defaults to `'DOCUMENT'`

*   `"DOCUMENT"`: Use the color profile of [`documentColorProfile`](/docs/plugins/api/DocumentNode/#documentcolorprofile).
*   `"SRGB"`: Use sRGB colors. This was the previous behavior of Figma before [color management](https://help.figma.com/hc/en-us/articles/360039825114).
*   `"DISPLAY_P3_V4"`: Use Display P3 colors.

* * *

## ExportSettingsImage[​](#exportsettingsimage "Direct link to ExportSettingsImage")

### format: 'JPG' | 'PNG' \[readonly\]

The string literal representing the export format. When reading [`exportSettings`](/docs/plugins/api/node-properties/#exportsettings), always check the `format` before reading other properties.

* * *

### constraint?: [ExportSettingsConstraints](/docs/plugins/api/ExportSettings/#export-settings-constraints) \[readonly\]

Constraint on the image size when exporting.

```
interface ExportSettingsConstraints {  type: "SCALE" | "WIDTH" | "HEIGHT"  value: number}
```

Defaults to 100% of image size `{ type: "SCALE", value: 1 }`.

*   `"SCALE"`: The size of the exported image is proportional to the size of the exported layer in Figma. A `value` of 1 means the export is 100% of the layer size.
*   `"WIDTH"`: The exported image is scaled to have a fixed width of `value`.
*   `"HEIGHT"`: The exported image is scaled to have a fixed height of `value`.

* * *

## SVG export[​](#svg-export "Direct link to SVG export")

[`ExportSettingsSVG`](#exportsettingssvg) controls SVG export settings. The [`exportAsync`](/docs/plugins/api/properties/nodes-exportasync/) function supports an additional [`ExportSettingsSVGString`](#exportsettingssvgstring) type for exporting a node to an SVG string. Both types have the below common properties.

### Common SVG export properties[​](#common-svg-export-properties "Direct link to Common SVG export properties")

### svgOutlineText?: boolean \[readonly\]

Whether text elements are rendered as outlines (vector paths) or as `<text>` elements in SVGs. Defaults to `true`.

Rendering text elements as outlines guarantees that the text looks exactly the same in the SVG as it does in the browser/inside Figma.

Exporting as `<text>` allows text to be selectable inside SVGs and generally makes the SVG easier to read. However, this relies on the browser’s rendering engine which can vary between browsers and/or operating systems. As such, visual accuracy is not guaranteed as the result could look different than in Figma.

* * *

### svgIdAttribute?: boolean \[readonly\]

Whether to include layer names as ID attributes in the SVG. This can be useful as a way to reference particular elements, but increases the size of the SVG. SVG features that require IDs to function, such as masks and gradients, will always have IDs. Defaults to `false`.

* * *

### svgSimplifyStroke?: boolean \[readonly\]

Whether to export inside and outside strokes as an approximation of the original to simplify the output. Otherwise, it uses a more precise but more bloated masking technique. This is needed because SVGs only support center strokes. Defaults to `true`.

* * *

### ExportSettingsSVG[​](#exportsettingssvg "Direct link to ExportSettingsSVG")

### format: 'SVG' \[readonly\]

The string literal "SVG" representing the export format. When reading [`exportSettings`](/docs/plugins/api/node-properties/#exportsettings), always check the `format` before reading other properties.

* * *

### ExportSettingsSVGString[​](#exportsettingssvgstring "Direct link to ExportSettingsSVGString")

This is used only by [`exportAsync`](/docs/plugins/api/properties/nodes-exportasync/), and is the same as `ExportSettingsSVG` above, but exports the node as an `"<svg>...</svg>"` string rather than a Uint8Array.

### format: 'SVG\_STRING' \[readonly\]

The string literal "SVG\_STRING" representing the export format.

* * *

## ExportSettingsPDF[​](#exportsettingspdf "Direct link to ExportSettingsPDF")

### format: 'PDF' \[readonly\]

The string literal "PDF" representing the export format. When reading [`exportSettings`](/docs/plugins/api/node-properties/#exportsettings), always check the `format` before reading other properties.

* * *

## ExportSettingsREST[​](#exportsettingsrest "Direct link to ExportSettingsREST")

This returns a JSON object in the shape of the response of the [https://api.figma.com/v1/files](https://api.figma.com/v1/files) endpoint. For more information read about the API [here](/docs/rest-api/file-endpoints/#get-files-endpoint).

### format: 'JSON\_REST\_V1' \[readonly\]

Returns the equivalent REST API response of hitting the endpoint `https://api.figma.com/v1/files/:file_key/nodes?ids=:id`.

This is useful if you have existing code that uses the REST API that you would like to have work inside a plugin as well. It can also be significantly more perfomant if you need to serialize large groups of nodes and their children. Here is an example that logs the name of every child in a node using the REST API response:

Using the JSON\_REST\_V1 format

```
function visitChildren(child: Object) {  console.log(child.name);  if (child.children) {    child.children.forEach(visitChildren);  }}const response = await figma.currentPage.selection[0].exportAsync({  format: "JSON_REST_V1",});visitChildren(response.document);
```

For more information on the shape of the output of the 'JSON\_REST\_V1' format, see the [files](/docs/rest-api/files/) documentation.

* * *

*   [Common properties](#common-properties)
*   [ExportSettingsImage](#exportsettingsimage)
*   [SVG export](#svg-export)
    *   [Common SVG export properties](#common-svg-export-properties)
    *   [ExportSettingsSVG](#exportsettingssvg)
    *   [ExportSettingsSVGString](#exportsettingssvgstring)
*   [ExportSettingsPDF](#exportsettingspdf)
*   [ExportSettingsREST](#exportsettingsrest)
