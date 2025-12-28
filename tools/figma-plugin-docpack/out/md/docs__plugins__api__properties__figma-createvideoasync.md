# createVideoAsync | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-createvideoasync/
scraped_at: 2025-12-22T03:30:32.062Z
---

On this page

Creates a `Video` object from the raw bytes of a file content. Like `Image` objects, `Video` objects **are not nodes**. They are handles to images stored by Figma. Frame backgrounds, or fills of shapes (e.g. a rectangle) may contain videos.

## Signature[​](#signature "Direct link to Signature")

### [createVideoAsync](/docs/plugins/api/properties/figma-createvideoasync/)(data: Uint8Array): Promise<[Video](/docs/plugins/api/Video/)\>

## Remarks[​](#remarks "Direct link to Remarks")

The `data` passed in must be encoded as a .MP4, .MOV, or .WebM. Videos have a maximum size of 100MB. Invalid videos will throw an error.

Video can only be added to files in a paid Education, Professional, and Organization team. Plugins running on files in free Starter teams can edit existing video in a file but not upload video to it.

## Possible error cases[​](#possible-error-cases "Direct link to Possible error cases")

`Uploading videos only works in files in paid Pro teams`

`Video file type must be MP4`

`Video file must be less than 100MB`

*   [Signature](#signature)
*   [Remarks](#remarks)
*   [Possible error cases](#possible-error-cases)
