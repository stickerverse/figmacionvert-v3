# setRelaunchData | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/nodes-setrelaunchdata/
scraped_at: 2025-12-22T03:30:50.306Z
---

On this page

Sets state on the node to show a button and description when the node is selected. Clears the button and description when `relaunchData` is `{}`.

info

In Figma and Dev Mode, this shows up in the properties panel. In FigJam, this shows up in the property menu. See [here](/docs/plugins/api/properties/nodes-setrelaunchdata/#example-figma-design-ui) for examples.

Supported on:

*   [BooleanOperationNode](/docs/plugins/api/BooleanOperationNode/)
*   [CodeBlockNode](/docs/plugins/api/CodeBlockNode/)
*   [ComponentNode](/docs/plugins/api/ComponentNode/)
*   [ComponentSetNode](/docs/plugins/api/ComponentSetNode/)
*   [ConnectorNode](/docs/plugins/api/ConnectorNode/)
*   [DocumentNode](/docs/plugins/api/DocumentNode/)
*   [EllipseNode](/docs/plugins/api/EllipseNode/)
*   [EmbedNode](/docs/plugins/api/EmbedNode/)
*   [FrameNode](/docs/plugins/api/FrameNode/)
*   [GroupNode](/docs/plugins/api/GroupNode/)
*   [HighlightNode](/docs/plugins/api/HighlightNode/)
*   [InstanceNode](/docs/plugins/api/InstanceNode/)
*   [InteractiveSlideElementNode](/docs/plugins/api/InteractiveSlideElementNode/)
*   [LineNode](/docs/plugins/api/LineNode/)
*   [LinkUnfurlNode](/docs/plugins/api/LinkUnfurlNode/)
*   [MediaNode](/docs/plugins/api/MediaNode/)
*   [PageNode](/docs/plugins/api/PageNode/)
*   [PolygonNode](/docs/plugins/api/PolygonNode/)
*   [RectangleNode](/docs/plugins/api/RectangleNode/)
*   [SectionNode](/docs/plugins/api/SectionNode/)
*   [ShapeWithTextNode](/docs/plugins/api/ShapeWithTextNode/)
*   [SliceNode](/docs/plugins/api/SliceNode/)
*   [SlideGridNode](/docs/plugins/api/SlideGridNode/)
*   [SlideNode](/docs/plugins/api/SlideNode/)
*   [SlideRowNode](/docs/plugins/api/SlideRowNode/)
*   [StampNode](/docs/plugins/api/StampNode/)
*   [StarNode](/docs/plugins/api/StarNode/)
*   [StickyNode](/docs/plugins/api/StickyNode/)
*   [TableNode](/docs/plugins/api/TableNode/)
*   [TextNode](/docs/plugins/api/TextNode/)
*   [TextPathNode](/docs/plugins/api/TextPathNode/)
*   [TransformGroupNode](/docs/plugins/api/TransformGroupNode/)
*   [VectorNode](/docs/plugins/api/VectorNode/)
*   [WashiTapeNode](/docs/plugins/api/WashiTapeNode/)
*   [WidgetNode](/docs/plugins/api/WidgetNode/)

## Signature[​](#signature "Direct link to Signature")

### [setRelaunchData](/docs/plugins/api/properties/nodes-setrelaunchdata/)(data: { \[command: string\]: string }): void

## Parameters[​](#parameters "Direct link to Parameters")

### data[​](#data "Direct link to data")

```
{  [command: string]: string // description}
```

e.g. `data = { myCommand: 'Short description' }`

### command[​](#command "Direct link to command")

The string that will be passed as `figma.command` when the plugin is run after the button is clicked. This command must be present in the [manifest](/docs/plugins/manifest/#relaunchbuttons) under one of the `relaunchButtons`, which is used to look up the name to display for the button.

### description[​](#description "Direct link to description")

Up to three lines of text that will be displayed under the button to provide plugin specific information about the node or any clarification about the action the button will perform. This method will throw if description exceeds 1000 characters, but the UI will display even less (only 3 lines).

## Remarks[​](#remarks "Direct link to Remarks")

Each call to this method sets entirely new relaunch data, removing any relaunch data and associated buttons/descriptions from before. To maintain buttons from a previous call one can store the button information using [setPluginData](/docs/plugins/api/properties/nodes-setplugindata/) and later fetch it with [getPluginData](/docs/plugins/api/PageNode/#getplugindata) before passing it on to `setRelaunchData`.

To use this API, the plugin manifest must include a `relaunchButtons` section: see the [manifest guide](/docs/plugins/manifest/#relaunchbuttons) for more information.

info

Note that if the `command` passed to this method does not match a command in the manifest, nothing will be displayed. Similarly if the name of a command in the manifest changes or is removed, then all buttons with that command will disappear. This behavior can be used to remove buttons when a particular action is no longer supported by the plugin.

In Figma design, the relaunch data can also be placed on the [`PageNode`](/docs/plugins/api/PageNode/) or [`DocumentNode`](/docs/plugins/api/DocumentNode/), to show a button and description when nothing is selected. Relaunch buttons added to the [`PageNode`](/docs/plugins/api/PageNode/) will be displayed on that page, combined with buttons from the [`DocumentNode`](/docs/plugins/api/DocumentNode/) that show on every page. This is not supported in FigJam.

## Examples[​](#examples "Direct link to Examples")

manifest.json

```
// With the following in the manifest:"relaunchButtons": [  {"command": "edit", "name": "Edit shape"},  {"command": "open", "name": "Open Shaper", "multipleSelection": true}]
```

code.ts

```
// Add two buttons (ordered by the above array from the manifest):// * an "Edit shape" button with a description of "Edit this trapezoid//   with Shaper" that runs the plugin with `figma.command === 'edit'`.// * an "Open Shaper" button with no description that runs the plugin with//   `figma.command === 'open'`.node.setRelaunchData({ edit: 'Edit this trapezoid with Shaper', open: '' })// With the following in the manifest:"relaunchButtons": [  {"command": "relaunch", "name": "Run again", "multipleSelection": true}]// Pass an empty description to show only a buttonnode.setRelaunchData({ relaunch: '' })// Remove the button and descriptionnode.setRelaunchData({})
```

### Example Figma Design UI[​](#example-figma-design-ui "Direct link to Example Figma Design UI")

![Relaunch UI in Figma Design](/assets/images/relaunch_ui_design-2123786a1723df0ec8abc6e52170d1d8.png)

### Example FigJam UI[​](#example-figjam-ui "Direct link to Example FigJam UI")

![Relaunch UI in FigJam](/assets/images/relaunch_ui_figjam-f623cdda760c44d264a9a057ed6a468f.png)

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [data](#data)
    *   [command](#command)
    *   [description](#description)
*   [Remarks](#remarks)
*   [Examples](#examples)
    *   [Example Figma Design UI](#example-figma-design-ui)
    *   [Example FigJam UI](#example-figjam-ui)
