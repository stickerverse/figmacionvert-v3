# saveVersionHistoryAsync | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/figma-saveversionhistoryasync/
scraped_at: 2025-12-22T03:30:29.832Z
---

On this page

Saves a new version of the file and adds it to the version history of the file. Returns the new version id.

## Signature[​](#signature "Direct link to Signature")

### [saveVersionHistoryAsync](/docs/plugins/api/properties/figma-saveversionhistoryasync/)(title: string, description?: string): Promise<[VersionHistoryResult](/docs/plugins/api/properties/figma-saveversionhistoryasync/#version-history-result)\>

## Parameters[​](#parameters "Direct link to Parameters")

### title[​](#title "Direct link to title")

The title of the version. This must be a non-empty string.

### description[​](#description "Direct link to description")

An optional argument to describe the version.

Calling `saveVersionHistoryAsync` returns a promise that resolves to `null` or an instance of `VersionHistoryResult`:

```
interface VersionHistoryResult {  id: string}
```

*   `id`: The version id of this newly saved version.

## Remarks[​](#remarks "Direct link to Remarks")

It is not guaranteed that all changes made before this method is used will be saved to version history. For example,

Changes may not all be saved

```
async function example() {  await figma.createRectangle();  await figma.saveVersionHistoryAsync('v1');  figma.closePlugin();}example().catch((e) => figma.closePluginWithFailure(e))
```

The newly created rectangle may not be included in the v1 version. As a work around, you can wait before calling `saveVersionHistoryAsync()`. For example,

Wait to save

```
async function example() {  await figma.createRectangle();  await new Promise(r => setTimeout(r, 1000)); // wait for 1 second  await figma.saveVersionHistoryAsync('v1');  figma.closePlugin();}
```

Typically, manual changes that precede the execution of `saveVersionHistoryAsync()` will be included. If you want to use `saveVersionHistoryAsync()` before the plugin makes additional changes, make sure to use the method with an async/await or a Promise.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [title](#title)
    *   [description](#description)
*   [Remarks](#remarks)
