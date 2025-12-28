# Measurement | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Measurement/
scraped_at: 2025-12-22T03:30:37.764Z
---

On this page

Measurements can be added between nodes in Dev Mode to highlight distances.

Measurements can only be added between the following node types: [ComponentNode](/docs/plugins/api/ComponentNode/), [ComponentSetNode](/docs/plugins/api/ComponentSetNode/), [EllipseNode](/docs/plugins/api/EllipseNode/), [FrameNode](/docs/plugins/api/FrameNode/), [InstanceNode](/docs/plugins/api/InstanceNode/), [LineNode](/docs/plugins/api/LineNode/), [PolygonNode](/docs/plugins/api/PolygonNode/), [RectangleNode](/docs/plugins/api/RectangleNode/), [StarNode](/docs/plugins/api/StarNode/), [TextNode](/docs/plugins/api/TextNode/), [VectorNode](/docs/plugins/api/VectorNode/).

You can read, add, edit and remove measurements by using the measurement methods on a [PageNode](/docs/plugins/api/PageNode/).

The value of the measurement displayed can be overridden with the `freeText` field.

## Measurement properties[​](#measurement-properties "Direct link to Measurement properties")

```
interface Measurement {  id: string  start: { node: SceneNode; side: MeasurementSide }  end: { node: SceneNode; side: MeasurementSide }  offset: MeasurementOffset  freeText: string}
```

See [MeasurementSide](/docs/plugins/api/MeasurementSide/) and [MeasurementOffset](/docs/plugins/api/MeasurementOffset/) for supported values.

## Page node properties[​](#page-node-properties "Direct link to Page node properties")

### getMeasurements(): [Measurement](/docs/plugins/api/Measurement/)\[\]

Get all measurements in the current page.

Learn more about measurements in the [Help Center](https://help.figma.com/hc/en-us/articles/20774752502935).

* * *

### getMeasurementsForNode(node: [SceneNode](/docs/plugins/api/nodes/#scene-node)): [Measurement](/docs/plugins/api/Measurement/)\[\]

Get all measurements pointing to a node in the current page. This includes all measurements whose start _or_ end node is the node passed in.

* * *

### addMeasurement(start: { node: [SceneNode](/docs/plugins/api/nodes/#scene-node); side: [MeasurementSide](/docs/plugins/api/MeasurementSide/) }, end: { node: [SceneNode](/docs/plugins/api/nodes/#scene-node); side: [MeasurementSide](/docs/plugins/api/MeasurementSide/) }, options?: { offset: [MeasurementOffset](/docs/plugins/api/MeasurementOffset/); freeText: string }): [Measurement](/docs/plugins/api/Measurement/)

Adds a measurement between two nodes in the current page.

Measurements are always between a start and end node. The side indicates which edge of the node to draw the measurement from.

Measurements can only go on the same axis, i.e. from side `"LEFT"` -> `"LEFT"`, `"LEFT"` -> `"RIGHT"`, `"TOP"` -> `"BOTTOM"` etc. But not `"LEFT"` -> `"TOP"`.

See the [Measurement type](/docs/plugins/api/Measurement/) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  // In Figma's Dev Mode}
```

* * *

### editMeasurement(id: string, newValue: { offset: [MeasurementOffset](/docs/plugins/api/MeasurementOffset/); freeText: string }): [Measurement](/docs/plugins/api/Measurement/)

Edit a measurement’s offset.

See the [Measurement type](/docs/plugins/api/Measurement/) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  // In Figma's Dev Mode}
```

* * *

### deleteMeasurement(id: string): void

Delete a measurement.

See the [Measurement type](/docs/plugins/api/Measurement/) for usage examples.

info

This method is only available in Dev Mode. You can check the editor type of your plugin to know if the user is in Dev Mode or not:

```
if (figma.editorType === 'dev') {  // In Figma's Dev Mode}
```

* * *

## Example usage[​](#example-usage "Direct link to Example usage")

```
const [frame1, frame2] = figma.currentPage.children// Add a measurementconst measurement1 =  figma.currentPage.addMeasurement(    { node: frame1, side: 'RIGHT' },    { node: frame2, side: 'LEFT' }  )// Edit the measurement's offset to be at the bottom of frame1 on the canvasconst editedMeasurement1 =  figma.currentPage.editMeasurement(    measurement1.id,    { offset: { type: 'INNER', relative: 1 } }  )// Add a measurement with an offset of 10 above frame2 on the canvasconst measurement2 =  figma.currentPage.addMeasurement(    { node: frame2, side: 'LEFT' },    { node: frame1, side: 'RIGHT' },    { offset: { type: 'OUTER', fixed: -10 } }  )// Override the value shown in the measurement to show '100%'const editedMeasurement2 =  figma.currentPage.editMeasurement(    measurement2.id,    { freeText: '100%' }  )// Delete a measurementfigma.currentPage.deleteMeasurement(measurement2.id)
```

*   [Measurement properties](#measurement-properties)
*   [Page node properties](#page-node-properties)
*   [Example usage](#example-usage)
