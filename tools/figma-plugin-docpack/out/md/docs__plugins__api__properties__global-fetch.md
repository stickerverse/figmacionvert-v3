# fetch | Developer Docs

---
source: https://developers.figma.com/docs/plugins/api/properties/global-fetch/
scraped_at: 2025-12-22T03:30:28.362Z
---

On this page

Fetch a resource from the network, and return a promise with the response.

## Signature[​](#signature "Direct link to Signature")

### [fetch](/docs/plugins/api/properties/global-fetch/)(url: string, init?: [FetchOptions](/docs/plugins/api/properties/global-fetch/#fetch-options)): Promise<[FetchResponse](/docs/plugins/api/properties/global-fetch/#fetch-response)\>

## Parameters[​](#parameters "Direct link to Parameters")

### url[​](#url "Direct link to url")

The URL of the requested resource. Unlike standardized `fetch`, this must be a `string`.

### init[​](#init "Direct link to init")

An optional argument with the following optional parameters:

```
interface FetchOptions {  method?: string  headers?: {[name: string]: string}  body?: Uint8Array | string  credentials?: string  cache?: string  redirect?: string  referrer?: string  integrity?: string}
```

*   `method`: The request method, e.g. `GET`, `POST`, etc.
*   `headers`: The headers to add to the request. Note that unlike the standardized `fetch`, this can only be a plain javascript object.
*   `body`: The body to add to this request, if any. This can be either a string or a Uint8Array.
*   `cache`: The cache mode to use for this request. See [https://developer.mozilla.org/en-US/docs/Web/API/Request/cache](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache) for available values.
*   `redirect`: The redirect mode to use for this request: `follow` or `error`.
*   `referrer`: The referrer for this request.
*   `integrity`: The subresource integrity value of the request. See [https://developer.mozilla.org/en-US/docs/Web/Security/Subresource\_Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) for more information.

Calling fetch returns a `FetchResponse` object:

```
interface FetchResponse {  headersObject: {[name: string]: string}  ok: boolean  redirected: boolean  status: number  statusText: string  type: string  url: string  arrayBuffer(): Promise<ArrayBuffer>  text(): Promise<string>  json(): Promise<any>}
```

*   `headersObject`: The headers associated with the response. Note that unlike the standardized `fetch`, this is a plain object.
*   `ok`: Whether the result was successful.
*   `redirected`: Whether the response is the result of a redirect.
*   `status`: The status code of the response.
*   `statusText`: The status text corresponding to this status code.
*   `type`: The type of response.
*   `url`: The URL of the response.
*   `arrayBuffer()`: Returns a promise with the contents of the response body as a `ArrayBuffer`.
*   `text()`: Returns a promise with the contents of the response body as a string, decoded as `utf-8`.
*   `json()`: Returns a promise with the contents of the response body as Javascript object.

## Remarks[​](#remarks "Direct link to Remarks")

This function has similar behavior to the standardized `fetch()` function, with some minor differences. See the [`FetchOptions`](/docs/plugins/api/properties/global-fetch/) and [`FetchResponse`](/docs/plugins/api/properties/global-fetch/) interfaces for more information.

*   [Signature](#signature)
*   [Parameters](#parameters)
    *   [url](#url)
    *   [init](#init)
*   [Remarks](#remarks)
