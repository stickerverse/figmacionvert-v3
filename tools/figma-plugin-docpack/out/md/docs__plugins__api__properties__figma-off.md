# off | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-off/
scraped_at: 2025-12-22T03:30:30.160Z
---

On this page

Removes a callback added with `figma.on` or `figma.once`.

## Signature[​](#signature "Direct link to Signature")

### [off](/docs/plugins/api/properties/figma-off/)(type: [ArgFreeEventType](/docs/plugins/api/properties/figma-on/#arg-free-event-type), callback: () => void): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'run', callback: (event: [RunEvent](/docs/plugins/api/RunEvent/)) => void): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'drop', callback: (event: [DropEvent](/docs/plugins/api/DropEvent/)) => boolean): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'documentchange', callback: (event: [DocumentChangeEvent](/docs/plugins/api/DocumentChangeEvent/)) => void): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'slidesviewchange', callback: (event: [SlidesViewChangeEvent](/docs/plugins/api/SlidesViewChangeEvent/)) => void): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'canvasviewchange', callback: (event: [CanvasViewChangeEvent](/docs/plugins/api/CanvasViewChangeEvent/)) => void): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'textreview', callback: (event: [TextReviewEvent](/docs/plugins/api/TextReviewEvent/)) => Promise<[TextReviewRange](/docs/plugins/api/TextReviewRange/)\[\]> | [TextReviewRange](/docs/plugins/api/TextReviewRange/)\[\]): void

### [off](/docs/plugins/api/properties/figma-off/)(type: 'stylechange', callback: (event: [StyleChangeEvent](/docs/plugins/api/StyleChangeEvent/)) => void): void

## Remarks[​](#remarks "Direct link to Remarks")

The callback needs to be the same object that was originally added. For example, you can do this:

Correct way to remove a callback

```
let fn = () => { console.log("selectionchanged") }figma.on("selectionchange", fn)figma.off("selectionchange", fn)
```

whereas the following won't work, because the function objects are different:

Incorrect way to remove a callback

```
figma.on("selectionchange", () => { console.log("selectionchanged") })figma.off("selectionchange", () => { console.log("selectionchanged") })
```

*   [Signature](#signature)
*   [Remarks](#remarks)
