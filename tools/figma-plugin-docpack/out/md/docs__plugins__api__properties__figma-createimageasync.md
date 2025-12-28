# createImageAsync | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createimageasync/
scraped_at: 2025-12-22T03:30:32.048Z
---

On this page

Creates an `Image` object from a src URL. Note that `Image` objects **are not nodes**. They are handles to images stored by Figma. Frame backgrounds, or fills of shapes (e.g. a rectangle) may contain images.

## Signature[​](#signature "Direct link to Signature")

### [createImageAsync](/docs/plugins/api/properties/figma-createimageasync/)(src: string): Promise<[Image](/docs/plugins/api/Image/)\>

## Remarks[​](#remarks "Direct link to Remarks")

The `src` passed in must be a URL to a PNG, JPEG, or GIF. Images have a maximum size of 4096 pixels (4K) in width and height. Invalid images will reject and log the reason in the console.

Example usage of createImageAsync

```
    figma.createImageAsync(        'https://picsum.photos/200'      ).then(async (image: Image) => {        // Create node        const node = figma.createRectangle()        // Resize the node to match the image's width and height        const { width, height } = await image.getSizeAsync()        node.resize(width, height)        // Set the fill on the node        node.fills = [          {            type: 'IMAGE',            imageHash: image.hash,            scaleMode: 'FILL'          }        ]        figma.closePlugin()      }).catch((error: any) => {        console.log(error)        figma.closePlugin()      })
```

## Possible error cases[​](#possible-error-cases "Direct link to Possible error cases")

`Image is too small`

`Image is too large`

`Image type is unsupported`

*   [Signature](#signature)
*   [Remarks](#remarks)
*   [Possible error cases](#possible-error-cases)
