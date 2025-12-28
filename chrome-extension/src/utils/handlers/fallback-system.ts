import { ElementNode, WebToFigmaSchema } from "../../types/schema";
import { logger } from "../logger";

/**
 * FallbackSystem - Reliability layer for the Universal Capture Engine.
 *
 * It ensures 100% visual coverage by identifying elements that failed DOM extraction
 * and recovering them from the page screenshot or generating semantic placeholders.
 */
export class FallbackSystem {
  private schema: WebToFigmaSchema;
  private screenshot: string | null;

  constructor(schema: WebToFigmaSchema, screenshot: string | null = null) {
    this.schema = schema;
    this.screenshot = screenshot;
  }

  /**
   * Detect visible elements in the DOM that are missing from the schema.
   */
  public async detectGaps(
    rootElement: Element = document.body
  ): Promise<Array<{ element: Element; parentId: string }>> {
    const gaps: Array<{ element: Element; parentId: string }> = [];

    const walker = document.createTreeWalker(
      rootElement,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: Element) => {
          // Skip common structural/invisible tags
          const tagsToSkip = [
            "SCRIPT",
            "STYLE",
            "LINK",
            "META",
            "NOSCRIPT",
            "HEAD",
          ];
          if (tagsToSkip.includes(node.tagName))
            return NodeFilter.FILTER_REJECT;

          // Check if visible
          const style = window.getComputedStyle(node);
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0"
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          const rect = node.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0)
            return NodeFilter.FILTER_REJECT;

          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let currentNode = walker.nextNode() as Element;
    while (currentNode) {
      // Check if this element's ID exists in the captured schema
      if (!currentNode.hasAttribute("data-captured-id")) {
        // Find closest captured ancestor
        let parent = currentNode.parentElement;
        let parentId = this.schema.root.id; // Use root ID as ultimate fallback
        while (parent) {
          const id = parent.getAttribute("data-captured-id");
          if (id) {
            parentId = id;
            break;
          }
          parent = parent.parentElement;
        }

        gaps.push({ element: currentNode, parentId });
      }
      currentNode = walker.nextNode() as Element;
    }

    logger.info(
      "fallback",
      `Detected ${gaps.length} potential gaps in extraction`
    );
    return gaps;
  }

  /**
   * Recover a missing element by cropping it from the main screenshot.
   */
  public async recoverNodeFromScreenshot(
    element: Element,
    parentId: string
  ): Promise<ElementNode | null> {
    if (!this.screenshot) return null;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    // Create a virtual image node representing this element
    const node: ElementNode = {
      id: `fallback_${Math.random().toString(36).substr(2, 9)}`,
      type: "RECTANGLE",
      name: `Fallback: ${element.tagName.toLowerCase()}`,
      layout: {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      },
      htmlTag: element.tagName.toLowerCase(),
      cssClasses: Array.from(element.classList),
      fills: [
        {
          type: "IMAGE",
          imageHash: await this.cropImage(this.screenshot, rect),
          opacity: parseFloat(style.opacity) || 1,
        },
      ],
      children: [],
      // Mark as a fallback node for diagnostics
      mlUIType: "fallback_image",
      mlConfidence: 0.5,
    };

    return node;
  }

  /**
   * Helper to crop an area from a base64 screenshot.
   * Note: In a real implementation, this would use a Canvas to crop the image.
   */
  private async cropImage(base64: string, rect: DOMRect): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        if (ctx) {
          ctx.drawImage(
            img,
            rect.left * dpr,
            rect.top * dpr,
            rect.width * dpr,
            rect.height * dpr,
            0,
            0,
            rect.width * dpr,
            rect.height * dpr
          );
        }
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = base64;
    });
  }

  /**
   * Get all captured node IDs from the schema tree for comparison.
   */
  private getAllCapturedNodeIds(node: ElementNode): Set<string> {
    const ids = new Set<string>();
    const stack = [node];

    while (stack.length > 0) {
      const current = stack.pop()!;
      ids.add(current.id);
      if (current.children) {
        stack.push(...current.children);
      }
    }

    return ids;
  }

  /**
   * Generate a semantic placeholder for elements that cannot be recovered visually.
   */
  public generatePlaceholder(element: Element): ElementNode {
    const rect = element.getBoundingClientRect();
    return {
      id: `placeholder_${Math.random().toString(36).substr(2, 9)}`,
      type: "RECTANGLE",
      name: `Placeholder: ${element.tagName.toLowerCase()}`,
      layout: {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      },
      htmlTag: element.tagName.toLowerCase(),
      cssClasses: Array.from(element.classList),
      fills: [
        {
          type: "SOLID",
          color: { r: 0.9, g: 0.9, b: 0.9, a: 0.5 },
        },
      ],
      children: [],
    };
  }
}
