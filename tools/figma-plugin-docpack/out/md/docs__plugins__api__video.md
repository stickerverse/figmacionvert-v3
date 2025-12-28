# Video | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/Video/
scraped_at: 2025-12-22T03:30:41.021Z
---

On this page

This object is handle to a video stored in Figma.

Like images, instead of video layers, Figma has video fills [`VideoPaint`](/docs/plugins/api/Paint/). In fact, dragging a video into Figma creates a rectangle with an video fill. Creating a video _on the canvas_ requires creating a rectangle (or other shape), following by adding a video fill to it.

New videos can be created via [`figma.createVideoAsync`](/docs/plugins/api/properties/figma-createvideoasync/) from a `Uint8Array` containing the bytes of the video file.

Figma supports MP4, MOV, and WebM files. Videos can be up to 100 MB in size. Video can only be added to files in a paid Education, Professional, and Organization team. Plugins running on files in free Starter teams can edit existing video in a file but not upload video to it.

## Video[​](#video "Direct link to Video")

### hash: string \[readonly\]

A unique hash of the contents of the video file.

* * *

*   [Video](#video)
