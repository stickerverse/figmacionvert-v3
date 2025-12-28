/**
 * Sanitizes a payload for safe transmission via postMessage/sendMessage.
 * Removes non-cloneable objects (DOM nodes, functions) and handles cycles.
 */
export function sanitizeForMessage<T>(value: T): T {
  const seen = new WeakMap();

  function sanitize(obj: any): any {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (seen.has(obj)) {
      return seen.get(obj);
    }

    // 1. Handle DOM Elements (The Primary Crash Source)
    // We check for Element/Node presence to be safe in non-DOM environments (like workers),
    // though this typically runs in the content script/main world where DOM exists.
    const isElement =
      (typeof Element !== "undefined" && obj instanceof Element) ||
      (typeof Node !== "undefined" &&
        obj instanceof Node &&
        (obj.nodeType === 1 || obj.nodeType === 9)); // Element or Document

    if (isElement) {
      const el = obj as Element;
      const replacement = {
        _sanitized: true,
        type: "Element",
        tagName: el.tagName || (obj.nodeType === 9 ? "#document" : "UNKNOWN"),
        id: el.id || "",
        className: typeof el.className === "string" ? el.className : "",
        // Minimal descriptor
        desc: `<${el.tagName ? el.tagName.toLowerCase() : "node"}>`,
      };
      seen.set(obj, replacement);
      return replacement as any;
    }

    // 2. Filter out other dangerous globals
    if (typeof Window !== "undefined" && obj instanceof Window) {
      return "[Window]";
    }
    if (typeof Event !== "undefined" && obj instanceof Event) {
      return { type: obj.type, _sanitized: "Event" };
    }

    // 3. Pass through known-cloneable binary types that are safe
    if (
      obj instanceof ArrayBuffer ||
      (ArrayBuffer.isView && ArrayBuffer.isView(obj)) ||
      obj instanceof Date ||
      obj instanceof RegExp ||
      obj instanceof Blob ||
      obj instanceof File
    ) {
      seen.set(obj, obj);
      return obj;
    }

    // 4. Handle Arrays
    if (Array.isArray(obj)) {
      const newArray: any[] = [];
      seen.set(obj, newArray);
      for (const item of obj) {
        newArray.push(sanitize(item));
      }
      return newArray as any;
    }

    // 5. Handle Maps/Sets (reconstruct to sanitize contents)
    if (obj instanceof Map) {
      const newMap = new Map();
      seen.set(obj, newMap);
      for (const [k, v] of obj) {
        newMap.set(sanitize(k), sanitize(v));
      }
      return newMap as any;
    }
    if (obj instanceof Set) {
      const newSet = new Set();
      seen.set(obj, newSet);
      for (const v of obj) {
        newSet.add(sanitize(v));
      }
      return newSet as any;
    }

    // 6. Handle Generic Objects
    // Using prototype check to try to catch plain objects vs class instances
    // But honestly, we should just sanitize fields of any object we're trying to send.
    // If it's a class instance, it will lose its prototype on the other side anyway (structured clone).
    const newObj: any = {};
    seen.set(obj, newObj);
    for (const key in obj) {
      try {
        // Skip keys that throw access errors
        newObj[key] = sanitize(obj[key]);
      } catch (e) {
        // Ignore unreadable properties
      }
    }
    return newObj;
  }

  return sanitize(value);
}
