# figma.textreview | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma-textreview/
scraped_at: 2025-12-22T03:30:28.958Z
---

These are methods and properties available on the `figma.textreview` global object. They are responsible for interacting with features relating to text review plugins. For a more information read our in depth guide on [text review plugins](/docs/plugins/textreview-plugins/).

### requestToBeEnabledAsync(): Promise<void>

This method will request your plugin to be enabled as a text review plugin for the user. A modal will pop up that will ask the user if they want to enable the plugin for text review. The promise returned by the function will be resolved if the user accepts in the dialog and will be rejected if the user cancels. Note that to prevent spam the promise will be auto rejected if the user cancels the request multiple times in a given plugin run.

![Dialog box that shows when you call the function](https://static.figma.com/uploads/ee33919763431eb2520074650fddfaa904c7e9c1)

* * *

### requestToBeDisabledAsync(): Promise<void>

This method will disable the plugin as a text review plugin if it is enabled. The promise will resolve if it has been successfully been disabled and reject if it wasn’t enabled in the first place.

* * *

### isEnabled: boolean \[readonly\]

This property is a readonly boolean that can be used to check if your plugin is enabled as a text review plugin for the user. It will be true if the plugin is enabled, and false if the plugin is disabled.

* * *
