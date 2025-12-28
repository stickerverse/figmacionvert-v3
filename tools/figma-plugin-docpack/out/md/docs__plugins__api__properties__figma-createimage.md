# createImage | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createimage/
scraped_at: 2025-12-22T03:30:32.033Z
---

On this page

Creates an `Image` object from the raw bytes of a file content. Note that `Image` objects **are not nodes**. They are handles to images stored by Figma. Frame backgrounds, or fills of shapes (e.g. a rectangle) may contain images. [Example: how to work with images](/docs/plugins/working-with-images/).

## Signature[​](#signature "Direct link to Signature")

### [createImage](/docs/plugins/api/properties/figma-createimage/)(data: Uint8Array): [Image](/docs/plugins/api/Image/)

## Remarks[​](#remarks "Direct link to Remarks")

The `data` passed in must be encoded as a PNG, JPEG, or GIF. Images have a maximum size of 4096 pixels (4K) in width and height. Invalid images will throw an error.

## Possible error cases[​](#possible-error-cases "Direct link to Possible error cases")

`Image is too small`

`Image is too large`

`Image type is unsupported`

*   [Signature](#signature)
*   [Remarks](#remarks)
*   [Possible error cases](#possible-error-cases)
