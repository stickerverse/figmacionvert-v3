# Global Objects | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/global-objects/
scraped_at: 2025-12-22T03:30:23.591Z
---

You can access most of the Plugin API through the [`figma`](/docs/plugins/api/figma/) global object. You'll find properties and functions that allow you to view, create, and update the contents of files.

*   View and update file-level properties, like thumbnails, undo history, and version history
*   Create, copy, or combine layers
*   Adjust properties of existing layers
*   Create, use, and manage local styles
*   Access users in the file
*   Import styles and component from external libraries

Example:

```
figma.createRectangle()figma.closePlugin()
```

tip

Tip: The [`figma`](/docs/plugins/api/figma/) global object is available in every Figma window. This means you can open the developer console in any file and access the API. This is a great way to explore the functionality of the API without having to create a plugin. You can also use this approach to test and debug your plugin code.

There are several other global objects available. You can access these from methods on the `figma` global object:

*   [`figma.ui`](/docs/plugins/api/figma-ui/) to create a custom interface for your plugin
*   [`figma.codegen`](/docs/plugins/api/figma-codegen/) to implement code generation in Dev Mode
*   [`figma.timer`](/docs/plugins/api/figma-timer/) to control the timer object in FigJam files
*   [`figma.viewport`](/docs/plugins/api/figma-viewport/) to control the viewport: the area of the canvas that's visible on screen
*   [`figma.clientStorage`](/docs/plugins/api/figma-clientStorage/) to store data on a user's local machine
*   [`figma.parameters`](/docs/plugins/api/figma-parameters/) to accept parameters as input
*   [`figma.variables`](/docs/plugins/api/figma-variables/) to interact with variables
*   [`figma.teamLibrary`](/docs/plugins/api/figma-teamlibrary/) to interact with assets in a team library
*   [`figma.textreview`](/docs/plugins/api/figma-textreview/) to interact with features only available to text review plugins

There are also global variables available across the Plugin API:

### **html**

If you assigned a file name to the [`"ui"`](/docs/plugins/manifest/#ui) field in your `manifest.json` file, you can use this variable to access the file's contents.

Instead of including HTML within a JavaScript string, you can call `figma.showUI(__html__)` . As the HTML is in a separate file, your text editor will render the HTML with syntax highlighting.

### **uiFiles**

If you assigned a map to the [`"ui"`](/docs/plugins/manifest/#ui) field in your `manifest.json` file:

```
"ui": {  "main": "main.html",  "secondary": "secondary.html"}
```

you can use this variable to access each file's contents. You can then call `figma.showUI(__uiFiles__.main)`.

### [fetch](/docs/plugins/api/properties/global-fetch/)(url: string, init?: [FetchOptions](/docs/plugins/api/properties/global-fetch/#fetch-options)): Promise<[FetchResponse](/docs/plugins/api/properties/global-fetch/#fetch-response)\>

Fetch a resource from the network, and return a promise with the response.

[View more →](/docs/plugins/api/properties/global-fetch/)

* * *
