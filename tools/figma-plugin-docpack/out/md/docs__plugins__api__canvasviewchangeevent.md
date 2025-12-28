# CanvasViewChangeEvent | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/CanvasViewChangeEvent/
scraped_at: 2025-12-22T03:30:34.204Z
---

On this page

This event is triggered when the user toggles between grid view and asset view in Figma Slides and Figma Buzz.

```
interface CanvasViewChangeEvent {  view: 'SINGLE_ASSET' | 'GRID'}
```

**Properties:**

*   `view` - The current view mode:
    *   `'SINGLE_ASSET'` - Focused view on a single slide or asset
    *   `'GRID'` - Overview of the entire canvas grid

## Usage[​](#usage "Direct link to Usage")

Listen for canvas view changes to adapt your plugin's behavior based on the current view mode:

```
figma.on('canvasviewchange', (event) => {  if (event.view === 'SINGLE_ASSET') {    // User is focused on a single slide or asset    console.log('Switched to asset view');  } else if (event.view === 'GRID') {    // User is viewing the grid overview    console.log('Switched to grid view');  }});
```

This event is particularly useful for plugins that need to:

*   Adjust UI layout based on the current view
*   Show/hide features depending on the context
*   Optimize performance for different view modes
*   Provide view-specific functionality

info

This API is only available in Figma Slides and Figma Buzz

To read the current view without listening for changes, you can access the current state through the canvas grid API methods.

*   [Usage](#usage)
