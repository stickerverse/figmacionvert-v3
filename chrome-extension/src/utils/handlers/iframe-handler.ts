import { logger } from "../logger";
import { ElementNode } from "../../types/schema";

/**
 * Result of an iframe capture operation
 */
export interface IframeCapture {
  type:
    | "same-origin"
    | "cooperative"
    | "proxy"
    | "screenshot"
    | "video-embed"
    | "placeholder";
  src: string;
  content?: ElementNode[];
  image?: string; // Base64 screenshot if type is 'screenshot'
  dimensions: {
    width: number;
    height: number;
  };
  metadata: Record<string, any>;
}

/**
 * IframeHandler - Handles ALL iframe scenarios including same-origin,
 * cross-origin cooperative, and uncooperative boundaries.
 */
export class IframeHandler {
  /**
   * Capture an iframe element using the best available strategy
   */
  async captureIframe(iframe: HTMLIFrameElement): Promise<IframeCapture> {
    const src = iframe.src || "about:blank";
    const rect = iframe.getBoundingClientRect();

    // Scenario 5: YouTube/Vimeo embeds
    if (this.isVideoEmbed(src)) {
      return await this.captureVideoEmbed(iframe, src);
    }

    // Scenario 1: Same-origin iframe → Direct traversal
    try {
      const iframeDoc = iframe.contentDocument;
      if (iframeDoc) {
        logger.info("capture", `Capturing same-origin iframe: ${src}`);
        return await this.captureSameOriginIframe(iframe, iframeDoc);
      }
    } catch (e) {
      logger.debug(
        "capture",
        `Same-origin access denied for iframe ${src}. Trying cross-origin strategies.`
      );
    }

    // Scenario 2: Cross-origin cooperative → postMessage protocol
    const postMessageResult = await this.tryPostMessageCapture(iframe);
    if (postMessageResult) {
      logger.info(
        "capture",
        `Captured cross-origin iframe via postMessage: ${src}`
      );
      return postMessageResult;
    }

    // Scenario 3: Cross-origin uncooperative → Proxy (Future implementation)
    // Scenario 4: All failed → Screenshot iframe area
    logger.warn(
      "capture",
      `Falling back to screenshot for uncooperative iframe: ${src}`
    );
    return await this.screenshotIframeArea(iframe);
  }

  /**
   * Detect if the source is a known video platform embed
   */
  private isVideoEmbed(src: string): boolean {
    return (
      src.includes("youtube.com/embed/") ||
      src.includes("youtube-nocookie.com/embed/") ||
      src.includes("player.vimeo.com/video/")
    );
  }

  /**
   * Extract video metadata and suggest a thumbnail fallback
   */
  private async captureVideoEmbed(
    iframe: HTMLIFrameElement,
    src: string
  ): Promise<IframeCapture> {
    const rect = iframe.getBoundingClientRect();
    let videoId = "";
    let platform = "";

    if (src.includes("youtube.com") || src.includes("youtube-nocookie.com")) {
      platform = "youtube";
      const parts = src.split("/embed/");
      videoId = parts[1]?.split("?")[0] || "";
    } else if (src.includes("vimeo.com")) {
      platform = "vimeo";
      const parts = src.split("/video/");
      videoId = parts[1]?.split("?")[0] || "";
    }

    return {
      type: "video-embed",
      src,
      dimensions: { width: rect.width, height: rect.height },
      metadata: {
        platform,
        videoId,
        thumbnailUrl:
          platform === "youtube"
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : "",
        title: iframe.title || "Video Embed",
      },
    };
  }

  /**
   * Traverse a same-origin iframe's document
   */
  private async captureSameOriginIframe(
    iframe: HTMLIFrameElement,
    doc: Document
  ): Promise<IframeCapture> {
    const rect = iframe.getBoundingClientRect();

    // Note: The actual traversal will be handled by the UniversalCaptureEngine
    // recursively. This handler identifies the opportunity.
    return {
      type: "same-origin",
      src: iframe.src,
      dimensions: { width: rect.width, height: rect.height },
      metadata: {
        readyState: doc.readyState,
        title: doc.title,
      },
    };
  }

  /**
   * Attempt to communicate with the iframe via postMessage to request its own capture
   */
  private async tryPostMessageCapture(
    iframe: HTMLIFrameElement
  ): Promise<IframeCapture | null> {
    if (!iframe.contentWindow) return null;

    return new Promise((resolve) => {
      const REQUEST_TIMEOUT = 3000;

      const timeoutId = setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        resolve(null);
      }, REQUEST_TIMEOUT);

      const handleMessage = (event: MessageEvent) => {
        // Validate source and message type
        if (
          event.source === iframe.contentWindow &&
          event.data?.type === "WEB_TO_FIGMA_CAPTURE_RESPONSE"
        ) {
          clearTimeout(timeoutId);
          window.removeEventListener("message", handleMessage);

          resolve({
            type: "cooperative",
            src: iframe.src,
            content: event.data.root,
            dimensions: {
              width: event.data.width || iframe.offsetWidth,
              height: event.data.height || iframe.offsetHeight,
            },
            metadata: {
              ...(event.data.metadata || {}),
              cooperative: true,
            },
          });
        }
      };

      window.addEventListener("message", handleMessage);

      // Request capture from iframe content script (if present)
      const contentWindow = iframe.contentWindow;
      if (contentWindow) {
        contentWindow.postMessage(
          {
            type: "WEB_TO_FIGMA_CAPTURE_REQUEST",
            context: "cross-origin-parent",
          },
          "*"
        );
      } else {
        clearTimeout(timeoutId);
        window.removeEventListener("message", handleMessage);
        resolve(null);
      }
    });
  }

  /**
   * Final fallback: capture a screenshot of the iframe's screen area
   */
  private async screenshotIframeArea(
    iframe: HTMLIFrameElement
  ): Promise<IframeCapture> {
    const rect = iframe.getBoundingClientRect();

    // The background script will take the full screenshot; we'll provide the crop coordinates
    return {
      type: "screenshot",
      src: iframe.src,
      dimensions: { width: rect.width, height: rect.height },
      metadata: {
        reason: "uncooperative-cross-origin",
        cropRect: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        },
      },
    };
  }
}
