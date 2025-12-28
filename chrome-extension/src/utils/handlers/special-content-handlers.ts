import { logger } from "../logger";
import { getShadowRoot } from "../shadow-dom-utils";

/**
 * SpecialContentHandlers - Manages extraction of complex or encapsulated web content.
 *
 * Includes logic for Canvas, Shadow DOM, SVG, Video, and Pseudo-elements.
 */
export class SpecialContentHandlers {
  /**
   * Capture a Canvas or WebGL element as a static image
   */
  async captureCanvas(canvas: HTMLCanvasElement): Promise<any> {
    try {
      // Attempt to capture the current frame
      const dataURL = canvas.toDataURL("image/png");

      return {
        type: "canvas",
        image: dataURL,
        width: canvas.width,
        height: canvas.height,
        metadata: {
          area: canvas.width * canvas.height,
          isTainted: false,
        },
      };
    } catch (e) {
      // Canvas may be tainted if it contains cross-origin images
      logger.warn(
        "capture",
        `Canvas capture failed (likely tainted): ${canvas.id || "anonymous"}`,
        {
          error: e instanceof Error ? e.message : String(e),
        }
      );

      return {
        type: "canvas-placeholder",
        error: "Tainted canvas - security restriction",
        metadata: {
          isTainted: true,
        },
      };
    }
  }

  /**
   * Identify and prepare Shadow DOM roots for traversal
   */
  async captureShadowDOM(host: Element): Promise<any> {
    const shadowRoot = getShadowRoot(host);
    if (!shadowRoot) return null;

    // Actual traversal is handled by the recursive engine using shadow-dom-utils.
    // This handler provides the root metadata.
    return {
      type: "shadow-root",
      mode: (shadowRoot as any).mode || "open",
      childCount: shadowRoot.childNodes.length,
      metadata: {
        isWebComponent: host.tagName.includes("-"),
      },
    };
  }

  /**
   * Serialize inline SVG elements to portable strings
   */
  async captureSVG(svg: SVGElement): Promise<any> {
    try {
      const serializer = new XMLSerializer();
      const svgCode = serializer.serializeToString(svg);
      const rect = svg.getBoundingClientRect();

      return {
        type: "svg",
        svgCode,
        width: rect.width,
        height: rect.height,
        metadata: {
          viewBox: svg.getAttribute("viewBox"),
          id: svg.id,
        },
      };
    } catch (e) {
      logger.error("capture", "SVG serialization failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      return null;
    }
  }

  /**
   * Capture the current frame of a video element as a placeholder
   */
  async captureVideo(video: HTMLVideoElement): Promise<any> {
    const width = video.videoWidth || video.offsetWidth;
    const height = video.videoHeight || video.offsetHeight;

    if (width === 0 || height === 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    try {
      // Draw current video frame to canvas
      ctx?.drawImage(video, 0, 0, width, height);
      const thumbnail = canvas.toDataURL("image/png");

      return {
        type: "video-frame",
        thumbnail,
        dimensions: { width, height },
        metadata: {
          duration: video.duration,
          currentTime: video.currentTime,
          poster: video.poster,
          autoplay: video.autoplay,
          muted: video.muted,
        },
      };
    } catch (e) {
      // Video might be cross-origin/CORS protected
      return {
        type: "video-placeholder",
        poster: video.poster,
        error: "Video frame capture blocked or unavailable",
      };
    }
  }

  /**
   * Extract styles and content from pseudo-elements (::before, ::after)
   */
  capturePseudoElements(element: Element): any {
    const result: any = {};
    const pseudos = ["::before", "::after"] as const;

    for (const pseudo of pseudos) {
      const style = window.getComputedStyle(element, pseudo);
      const content = style.getPropertyValue("content");

      // 'none' or 'normal' means the pseudo-element is not rendered
      if (content && content !== "none" && content !== "normal") {
        const key = pseudo.replace("::", "");
        result[key] = {
          content: content.replace(/^["']|["']$/g, ""), // Strip surrounding quotes
          styles: this.extractRelevantPseudoStyles(style),
        };
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Selectively extract styles needed to recreate pseudo-elements in Figma
   */
  private extractRelevantPseudoStyles(
    style: CSSStyleDeclaration
  ): Record<string, string> {
    return {
      display: style.display,
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      bottom: style.bottom,
      width: style.width,
      height: style.height,
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      lineHeight: style.lineHeight,
      textAlign: style.textAlign,
      border: style.border,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      transform: style.transform,
      opacity: style.opacity,
      zIndex: style.zIndex,
    };
  }

  /**
   * Temporarily reveal hidden elements for capture (if requested)
   */
  async revealForCapture(
    element: HTMLElement,
    originalDisplay: string,
    originalVisibility: string
  ): Promise<void> {
    element.style.display =
      originalDisplay === "none" ? "block" : originalDisplay;
    element.style.visibility = "visible";
    element.style.opacity = "1";
  }
}
