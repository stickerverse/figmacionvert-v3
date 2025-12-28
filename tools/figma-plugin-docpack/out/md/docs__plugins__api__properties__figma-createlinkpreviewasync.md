# createLinkPreviewAsync | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createlinkpreviewasync/
scraped_at: 2025-12-22T03:30:32.333Z
---

On this page

info

This API is only available in FigJam.

Resolves link metadata from a URL, and inserts either an embed or a unfurled preview of the link into the document An embed will be inserted if the URL is a valid OEmbed provider (has a `<link type="application/json+oembed" ... />` tag). The returned `<iframe>` source will be converted into an EmbedNode.

Otherwise, the title, description, thumbnail, and favicon will be parsed from the HTML markup of the URL using standard `og` or `twitter` meta tags. This information will be converted into a LinkUnfurlNode.

## Signature[​](#signature "Direct link to Signature")

### [createLinkPreviewAsync](/docs/plugins/api/properties/figma-createlinkpreviewasync/)(url: string): Promise<[EmbedNode](/docs/plugins/api/EmbedNode/) | [LinkUnfurlNode](/docs/plugins/api/LinkUnfurlNode/)\>

## Parameters[​](#parameters "Direct link to Parameters")

### url[​](#url "Direct link to url")

## Remarks[​](#remarks "Direct link to Remarks")

This API is only available in FigJam

Creating embeds and link unfurl nodes

```
(async () => {  // Creates an EmbedNode  const youtubeEmbed = await figma.createLinkPreviewAsync('https://www.youtube.com/watch?v=4G9RHt2OyuY')  // Creates a LinkUnfurlNode  const unfurledLink = await figma.createLinkPreviewAsync('https://www.figma.com/community/plugins')})()
```

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [url](#url)
*   [Remarks](#remarks)
