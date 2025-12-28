# createFrame | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createframe/
scraped_at: 2025-12-22T03:30:30.763Z
---

On this page

Creates a new frame. The behavior is similar to using the `F` shortcut followed by a click.

## Signature[​](#signature "Direct link to Signature")

### [createFrame](/docs/plugins/api/properties/figma-createframe/)(): [FrameNode](/docs/plugins/api/FrameNode/)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the new node has a white background, width and height both at 100, and is parented under `figma.currentPage`.

Create a frame

```
const frame = figma.createFrame()// Move to (50, 50)frame.x = 50frame.y = 50// Set size to 1280 x 720frame.resize(1280, 720)
```

*   [Signature](#signature)
*   [Remarks](#remarks)
