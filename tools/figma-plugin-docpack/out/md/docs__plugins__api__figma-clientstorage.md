# figma.clientStorage | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/figma-clientStorage/
scraped_at: 2025-12-22T03:30:28.832Z
---

The `figma.clientStorage` API allows you to store data on the user's local machine. Unlike data stored with the document (such as [`setPluginData`](/docs/plugins/api/properties/nodes-setplugindata/)), this data is not synchronized across users. It's similar to the [Window.localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), but is asynchronous, and allows storing objects, arrays, strings, numbers, booleans, null, undefined and `Uint8Array`. Like `localStorage`, you should expect that user actions such as clearing the browser cache might clear all stored data.

The data is specific to your plugin ID. Plugins with other IDs won't be able to read this data.

Each plugin gets a total of 5MB of storage. You can approximate the quota used by a key/value pair by adding the size of the key to the size of the value converted to JSON. The main exception is that Uint8Array values counts as the size of the Uint8Array, rather than the array converted to JSON.

> ⚠ The data is stored privately for **stability**, not **security**. It prevents other plugins from accessing with your data. It does not, however, prevent users from seeing data stored on their own client given sufficient effort.

> ⚠ Data will become inaccessible if your plugin ID changes.

### getAsync(key: string): Promise<any | undefined>

Retrieves a value from client storage with the given `key`. If no value has been stored for that key, this function will asynchronously return `undefined`.

* * *

### setAsync(key: string, value: any): Promise<void>

Sets a value to client storage with the given `key`. The returned promise will resolve if storage is successful, or reject with an error message if storage failed.

* * *

### deleteAsync(key: string): Promise<void>

Removes the stored key/value pair from client storage with the given `key`. If no such key is stored, this function will return normally but will otherwise do nothing.

* * *

### keysAsync(): Promise<string\[\]>

Retrieves a list of all keys stored to client storage. Use this to enumerate the full contents of the clientStorage API.

* * *
