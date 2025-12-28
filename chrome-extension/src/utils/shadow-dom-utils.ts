/**
 * Shadow DOM Utilities
 * 
 * Provides consistent handling of shadow DOM traversal across all extraction utilities.
 * Web Components (YouTube's ytd-*, Material UI, Shoelace, Lit, etc.) use shadow DOM
 * to encapsulate their internal structure. Standard DOM APIs like `element.children`
 * and `querySelectorAll` don't pierce shadow boundaries, so we need custom helpers.
 */

/**
 * Gets the effective child nodes of an element, handling shadow DOM and slot projection.
 * 
 * Priority:
 * 1. Slot projection (assigned nodes) - for <slot> elements
 * 2. Shadow DOM children - for elements with shadowRoot
 * 3. Light DOM children - fallback for regular elements
 * 
 * @param element - The element to get children from
 * @returns Array of child nodes (Element or Text nodes)
 */
export function getEffectiveChildren(element: Element): ChildNode[] {
  const tagName = element.tagName?.toLowerCase() ?? '';
  
  // Handle slot projection: <slot> renders assigned nodes which are not part of slot.childNodes
  if (tagName === 'slot' && typeof (element as HTMLSlotElement).assignedNodes === 'function') {
    const assignedNodes = (element as HTMLSlotElement).assignedNodes({ flatten: true });
    if (assignedNodes.length > 0) {
      // assignedNodes returns Node[] which are valid ChildNodes in this context
      return Array.from(assignedNodes) as ChildNode[];
    }
  }
  
  // Prefer Shadow DOM when available: for Web Components, the shadow tree is the
  // rendered subtree. Capturing both shadow + light DOM usually duplicates content.
  const shadowRoot = (element as any).shadowRoot as ShadowRoot | null | undefined;
  if (shadowRoot && shadowRoot.childNodes && shadowRoot.childNodes.length > 0) {
    return Array.from(shadowRoot.childNodes);
  }
  
  // Fallback to light DOM children
  return Array.from(element.childNodes);
}

/**
 * Gets the effective child elements (only Element nodes, not text nodes).
 * 
 * @param element - The element to get children from
 * @returns Array of child Element nodes
 */
export function getEffectiveChildElements(element: Element): Element[] {
  return getEffectiveChildren(element).filter(
    (node): node is Element => node.nodeType === Node.ELEMENT_NODE
  );
}

/**
 * Recursively queries all elements matching a selector, piercing shadow DOM boundaries.
 * 
 * @param root - The root element to start searching from
 * @param selector - CSS selector to match (use '*' for all elements)
 * @returns Array of all matching elements across light and shadow DOM
 */
export function querySelectorAllDeep(root: Element | Document | ShadowRoot, selector: string): Element[] {
  const results: Element[] = [];
  
  // Query in the current scope
  const matches = root.querySelectorAll(selector);
  results.push(...Array.from(matches));
  
  // Recursively search shadow roots
  const allElements = root.querySelectorAll('*');
  for (const element of Array.from(allElements)) {
    const shadowRoot = (element as any).shadowRoot as ShadowRoot | null;
    if (shadowRoot) {
      results.push(...querySelectorAllDeep(shadowRoot, selector));
    }
  }
  
  return results;
}

/**
 * Recursively finds the first element matching a selector, piercing shadow DOM boundaries.
 * 
 * @param root - The root element to start searching from
 * @param selector - CSS selector to match
 * @returns The first matching element, or null if not found
 */
export function querySelectorDeep(root: Element | Document | ShadowRoot, selector: string): Element | null {
  // Try in the current scope first
  const match = root.querySelector(selector);
  if (match) return match;
  
  // Recursively search shadow roots
  const allElements = root.querySelectorAll('*');
  for (const element of Array.from(allElements)) {
    const shadowRoot = (element as any).shadowRoot as ShadowRoot | null;
    if (shadowRoot) {
      const shadowMatch = querySelectorDeep(shadowRoot, selector);
      if (shadowMatch) return shadowMatch;
    }
  }
  
  return null;
}

/**
 * Checks if an element has a shadow root.
 * 
 * @param element - The element to check
 * @returns True if the element has an open shadow root
 */
export function hasShadowRoot(element: Element): boolean {
  return !!(element as any).shadowRoot;
}

/**
 * Gets the shadow root of an element if it exists.
 * 
 * @param element - The element to get the shadow root from
 * @returns The shadow root, or null if none exists
 */
export function getShadowRoot(element: Element): ShadowRoot | null {
  return (element as any).shadowRoot ?? null;
}

/**
 * Finds the closest ancestor matching a selector, crossing shadow DOM boundaries.
 * 
 * @param element - The starting element
 * @param selector - CSS selector to match
 * @returns The closest matching ancestor, or null if not found
 */
export function closestDeep(element: Element, selector: string): Element | null {
  let current: Element | null = element;
  
  while (current) {
    // Check if current element matches
    if (current.matches(selector)) {
      return current;
    }
    
    // Move to parent, crossing shadow boundaries if needed
    if (current.parentElement) {
      current = current.parentElement;
    } else {
      // Check if we're in a shadow root
      const rootNode = current.getRootNode();
      if (rootNode instanceof ShadowRoot) {
        current = rootNode.host;
      } else {
        current = null;
      }
    }
  }
  
  return null;
}

/**
 * Gets all siblings of an element, handling shadow DOM context.
 * 
 * @param element - The element to get siblings for
 * @returns Array of sibling elements (excluding the element itself)
 */
export function getSiblings(element: Element): Element[] {
  const parent = element.parentElement;
  if (!parent) {
    // Check if we're in a shadow root
    const rootNode = element.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      return Array.from(rootNode.children).filter(child => child !== element);
    }
    return [];
  }
  
  return getEffectiveChildElements(parent).filter(child => child !== element);
}

/**
 * Gets the effective parent element, crossing shadow DOM boundaries if at a shadow root.
 * 
 * @param element - The element to get the parent for
 * @returns The parent element, or null if at document root
 */
export function getEffectiveParent(element: Element): Element | null {
  if (element.parentElement) {
    return element.parentElement;
  }
  
  // Check if we're at the top of a shadow root
  const rootNode = element.getRootNode();
  if (rootNode instanceof ShadowRoot) {
    return rootNode.host;
  }
  
  return null;
}

