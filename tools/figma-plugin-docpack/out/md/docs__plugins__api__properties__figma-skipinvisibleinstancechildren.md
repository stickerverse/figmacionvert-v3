# skipInvisibleInstanceChildren | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-skipinvisibleinstancechildren/
scraped_at: 2025-12-22T03:30:29.561Z
---

On this page

When enabled, causes all node properties and methods to skip over invisible nodes (and their descendants) inside [`instances`](/docs/plugins/api/InstanceNode/). This makes operations like document traversal much faster.

info

Defaults to true in Figma Dev Mode and false in Figma and FigJam

## Signature[​](#signature "Direct link to Signature")

### [skipInvisibleInstanceChildren](/docs/plugins/api/properties/figma-skipinvisibleinstancechildren/): boolean

## Remarks[​](#remarks "Direct link to Remarks")

Accessing and modifying invisible nodes and their descendants inside instances can be slow with the plugin API. This is especially true in large documents with tens of thousands of nodes where a call to [`findAll`](/docs/plugins/api/properties/nodes-findall/) might come across many of these invisible instance children.

If your plugin does not need access to these nodes, we recommend setting `figma.skipInvisibleInstanceChildren = true` as that often makes document traversal significantly faster.

When this flag is enabled, it will not be possible to access invisible nodes (and their descendants) inside instances. This has the following effects:

*   [`children`](/docs/plugins/api/properties/nodes-children/) and methods such as [`findAll`](/docs/plugins/api/properties/nodes-findall/) will exclude these nodes.
*   [`figma.getNodeByIdAsync`](/docs/plugins/api/figma/#getnodebyidasync) will return a promise containing null.
*   [`figma.getNodeById`](/docs/plugins/api/figma/#getnodebyid) will return null.
*   Accessing a property on an existing node object for an invisible node will throw an error.

For example, suppose that a portion of the document tree looks like this:

Frame (visible) → Instance (visible) → Frame (invisible) → Text (visible)

The last two frame and text nodes cannot be accessed after setting `figma.skipInvisibleInstanceChildren = true`.

The benefit of enabling this flag is that document traversal methods, [`findAll`](/docs/plugins/api/properties/nodes-findall/) and [`findOne`](/docs/plugins/api/properties/nodes-findone/), can be up to several times faster in large documents that have invisible instance children. [`findAllWithCriteria`](/docs/plugins/api/properties/nodes-findallwithcriteria/) can be up to hundreds of times faster in large documents.

*   [Signature](#signature)
*   [Remarks](#remarks)
