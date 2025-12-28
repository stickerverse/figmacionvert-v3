# figma.buzz | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma-buzz/
scraped_at: 2025-12-22T03:30:29.276Z
---

The Buzz API provides methods for creating and managing media content in Figma Buzz. Please see the [Working in Buzz](/docs/plugins/working-in-buzz/) guide for how to use these functions.

info

This API is only available when your plugin is running in Figma Buzz (`figma.editorType === 'buzz'`).

### [createFrame](/docs/plugins/api/properties/figma-buzz-createframe/)(rowIndex?: number, columnIndex?: number): [FrameNode](/docs/plugins/api/FrameNode/)

Creates a new frame in Buzz, optionally positioned at specific canvas coordinates.

[View more →](/docs/plugins/api/properties/figma-buzz-createframe/)

* * *

### [createInstance](/docs/plugins/api/properties/figma-buzz-createinstance/)(component: [ComponentNode](/docs/plugins/api/ComponentNode/), rowIndex: number, columnIndex?: number): [InstanceNode](/docs/plugins/api/InstanceNode/)

Creates an instance of a component in Buzz, optionally positioned at specific canvas coordinates.

[View more →](/docs/plugins/api/properties/figma-buzz-createinstance/)

* * *

### getBuzzAssetTypeForNode(node: [SceneNode](/docs/plugins/api/nodes/#scene-node)): [BuzzAssetType](/docs/plugins/api/BuzzAssetType/) | null

Gets the Buzz asset type for a given node.

[View more →](/docs/plugins/api/properties/figma-buzz-getbuzzassettypefornode/)

* * *

### setBuzzAssetTypeForNode(node: [SceneNode](/docs/plugins/api/nodes/#scene-node), assetType: [BuzzAssetType](/docs/plugins/api/BuzzAssetType/)): void

Sets the Buzz asset type for a given node.

[View more →](/docs/plugins/api/properties/figma-buzz-setbuzzassettypefornode/)

* * *

### getTextContent(node: [SceneNode](/docs/plugins/api/nodes/#scene-node)): [BuzzTextField](/docs/plugins/api/BuzzTextField/)\[\]

Extracts all text content fields from a node for dynamic content management.

[View more →](/docs/plugins/api/properties/figma-buzz-gettextcontent/)

* * *

### getMediaContent(node: [SceneNode](/docs/plugins/api/nodes/#scene-node)): [BuzzMediaField](/docs/plugins/api/BuzzMediaField/)\[\]

Extracts all media content fields from a node for dynamic content management.

[View more →](/docs/plugins/api/properties/figma-buzz-getmediacontent/)

* * *

### smartResize(node: [SceneNode](/docs/plugins/api/nodes/#scene-node), width: number, height: number): void

Performs intelligent resizing of a node while maintaining layout integrity and aspect ratios.

[View more →](/docs/plugins/api/properties/figma-buzz-smartresize/)

* * *
