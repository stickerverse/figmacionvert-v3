# Image | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Image/
scraped_at: 2025-12-22T03:30:36.679Z
---

On this page

This object is handle to an image stored in Figma.

A common misconception is that Figma has image layers. What we have instead is image fills [`ImagePaint`](/docs/plugins/api/Paint/). In fact, dragging an image into Figma creates a rectangle with an image fill. This allows assigning images as strokes too, but it means that creating an image _on the canvas_ requires creating a rectangle (or other shape), following by adding an image fill to it.

New images can be created via [`figma.createImage`](/docs/plugins/api/properties/figma-createimage/) from a `Uint8Array` containing the bytes of the image file. Existing images can be read via [`figma.getImageByHash`](/docs/plugins/api/figma/#getimagebyhash).

Figma supports PNG, JPEG, and GIF. Images can be up to 4096 pixels (4K) in width and height.

See this [example of working with images](/docs/plugins/working-with-images/).

## Image[​](#image "Direct link to Image")

### hash: string \[readonly\]

A unique hash of the contents of the image file.

* * *

### getBytesAsync(): Promise<Uint8Array>

The contents of the corresponding image file. This returns a promise because the image may still need to be downloaded (images in Figma are loaded separately from the rest of the document).

* * *

### getSizeAsync(): Promise<{ width: number; height: number }>

The width and height of the image in pixels. This returns a promise because the image may still need to be downloaded (images in Figma are loaded separately from the rest of the document).

* * *

*   [Image](#image)
