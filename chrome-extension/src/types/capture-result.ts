import { WebToFigmaSchema } from "./schema";

export enum CaptureErrorCode {
  // Init & Config
  INIT_FAILED = "INIT_FAILED",
  INVALID_CONFIG = "INVALID_CONFIG",

  // Stabilization
  PAGE_NOT_STABLE = "PAGE_NOT_STABLE",
  TIMEOUT_WAITING_FOR_IDLE = "TIMEOUT_WAITING_FOR_IDLE",
  NAVIGATION_DETECTED = "NAVIGATION_DETECTED",

  // Security / Environment
  CSP_BLOCKED = "CSP_BLOCKED",
  DEBUGGER_INTERFERENCE = "DEBUGGER_INTERFERENCE",
  CONTEXT_INVALIDATED = "CONTEXT_INVALIDATED",
  UNSUPPORTED_URL_SCHEME = "UNSUPPORTED_URL_SCHEME",

  // DOM Extraction
  DOM_TRAVERSAL_FAILED = "DOM_TRAVERSAL_FAILED",
  TIMEOUT_DOM_SNAPSHOT = "TIMEOUT_DOM_SNAPSHOT",
  SHADOW_ROOT_ACCESS_DENIED = "SHADOW_ROOT_ACCESS_DENIED",
  UNSUPPORTED_IFRAME_CAPTURE = "UNSUPPORTED_IFRAME_CAPTURE",

  // Assets
  ASSET_COLLECTION_FAILED = "ASSET_COLLECTION_FAILED",
  TIMEOUT_ASSETS = "TIMEOUT_ASSETS",

  // Serialization & Transfer
  SERIALIZATION_FAILED = "SERIALIZATION_FAILED",
  PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE",
  TIMEOUT_SERIALIZATION = "TIMEOUT_SERIALIZATION",

  // Generic
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  TIMEOUT_GLOBAL = "TIMEOUT_GLOBAL",
}

export type CaptureResult =
  | {
      status: "ok";
      data: WebToFigmaSchema;
      warnings?: string[];
      metadata?: {
        duration: number;
        domNodes: number;
        assets: number;
      };
    }
  | {
      status: "error";
      errorCode: CaptureErrorCode;
      message: string;
      details?: any;
    };

export interface PageState {
  url: string;
  domElementCount: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollY: number;
  memoryUsageMB?: number;
}

export interface ErrorTiming {
  startTime: number;
  failureTime: number;
  duration: number;
  phaseTimings?: Record<string, number>;
}

export interface Environment {
  userAgent: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  isIframe: boolean;
  extensionsDetected?: string[];
}

export interface ErrorContext {
  stack?: string;
  pageState: PageState;
  timing: ErrorTiming;
  environment: Environment;
  breadcrumb: Array<{ phase: string; timestamp: number; status: string }>;
}

export class CaptureError extends Error {
  public context?: ErrorContext;
  public suggestions: string[] = [];

  constructor(
    public code: CaptureErrorCode,
    message: string,
    public details?: any,
    context?: Partial<ErrorContext>
  ) {
    super(message);
    this.name = "CaptureError";

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CaptureError);
    }

    // Build full context
    if (context) {
      this.context = {
        stack: this.stack || new Error().stack,
        pageState: context.pageState || this.capturePageState(),
        timing: context.timing || {
          startTime: 0,
          failureTime: Date.now(),
          duration: 0,
        },
        environment: context.environment || this.captureEnvironment(),
        breadcrumb: context.breadcrumb || [],
      };
    }

    // Add default suggestions based on error code
    this.suggestions = this.getDefaultSuggestions();
  }

  private capturePageState(): PageState {
    return {
      url: window.location.href,
      domElementCount: document.querySelectorAll("*").length,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollY: window.scrollY,
      memoryUsageMB: (performance as any).memory?.usedJSHeapSize
        ? (performance as any).memory.usedJSHeapSize / (1024 * 1024)
        : undefined,
    };
  }

  private captureEnvironment(): Environment {
    return {
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio || 1,
      isIframe: window !== window.parent,
    };
  }

  private getDefaultSuggestions(): string[] {
    const suggestions: Partial<Record<CaptureErrorCode, string[]>> = {
      [CaptureErrorCode.INIT_FAILED]: [
        "Ensure the capture environment is correctly initialized.",
        "Check for any browser extension conflicts.",
      ],
      [CaptureErrorCode.INVALID_CONFIG]: [
        "Review the provided configuration for any invalid parameters.",
        "Ensure all required configuration fields are present and correctly formatted.",
      ],
      [CaptureErrorCode.PAGE_NOT_STABLE]: [
        "Page has constant DOM mutations. Try waiting a few seconds before capture.",
        "Disable auto-playing videos or animations on the page.",
        "Use 'Quality' capture profile for more time to stabilize.",
      ],
      [CaptureErrorCode.TIMEOUT_WAITING_FOR_IDLE]: [
        "Page has ongoing network requests. Wait for loading to complete.",
        "Check for WebSocket connections or long-polling that may prevent idle state.",
      ],
      [CaptureErrorCode.NAVIGATION_DETECTED]: [
        "A navigation event occurred during capture. Try capturing when the page is static.",
        "Ensure no automatic redirects or refreshes are happening.",
      ],
      [CaptureErrorCode.CSP_BLOCKED]: [
        "Page has strict Content Security Policy blocking capture.",
        "Try capturing from a different URL or environment.",
        "Contact site administrator to allow capture extensions.",
      ],
      [CaptureErrorCode.DEBUGGER_INTERFERENCE]: [
        "Debugger or developer tools might be interfering with the capture process.",
        "Close developer tools and try again.",
      ],
      [CaptureErrorCode.CONTEXT_INVALIDATED]: [
        "The browser context was invalidated. This can happen if the page navigates or is closed.",
        "Try refreshing the page and capturing again.",
      ],
      [CaptureErrorCode.UNSUPPORTED_URL_SCHEME]: [
        "Chrome blocks capturing extension, internal, or file URLs.",
        "Capture a regular http(s) page instead of chrome-extension:// or chrome:// pages.",
        "If you're viewing a PDF, open it via an http(s) URL rather than the built-in viewer.",
      ],
      [CaptureErrorCode.DOM_TRAVERSAL_FAILED]: [
        "Failed to traverse the DOM. The page structure might be too complex or malformed.",
        "Try capturing a simpler page or a specific section.",
      ],
      [CaptureErrorCode.TIMEOUT_DOM_SNAPSHOT]: [
        "DOM extraction took too long. Page may have excessive elements.",
        "Close unused tabs to free up memory.",
        "Try 'Speed' capture profile for faster extraction.",
      ],
      [CaptureErrorCode.SHADOW_ROOT_ACCESS_DENIED]: [
        "Access to a Shadow DOM was denied. This might be due to security restrictions.",
        "Try capturing from a different browser or environment.",
      ],
      [CaptureErrorCode.UNSUPPORTED_IFRAME_CAPTURE]: [
        "Capturing content within iframes is not fully supported or encountered an issue.",
        "Try capturing the iframe content directly if possible.",
      ],
      [CaptureErrorCode.ASSET_COLLECTION_FAILED]: [
        "Failed to collect assets (images, fonts, etc.). Network issues or CORS policies might be at play.",
        "Check your network connection and browser console for errors.",
      ],
      [CaptureErrorCode.TIMEOUT_ASSETS]: [
        "Asset collection timed out. The page might have too many assets or slow loading resources.",
        "Try reducing image quality or disabling asset capture.",
      ],
      [CaptureErrorCode.SERIALIZATION_FAILED]: [
        "Failed to serialize captured data.",
        "Page may have circular references or non-serializable objects.",
        "Try refreshing the page and capturing again.",
      ],
      [CaptureErrorCode.PAYLOAD_TOO_LARGE]: [
        "Page is too large to capture (>500MB).",
        "Try capturing a specific section instead of the entire page.",
        "Reduce image quality or disable asset capture.",
      ],
      [CaptureErrorCode.TIMEOUT_SERIALIZATION]: [
        "Serialization of captured data timed out. The data payload might be too large or complex.",
        "Try capturing a smaller section of the page.",
      ],
      [CaptureErrorCode.UNKNOWN_ERROR]: [
        "An unexpected error occurred during capture.",
        "Try refreshing the page and capturing again.",
        "Contact support if the issue persists.",
      ],
      [CaptureErrorCode.TIMEOUT_GLOBAL]: [
        "Overall capture timeout exceeded.",
        "Page is too complex. Try capturing a simpler page.",
        "Increase timeout in 'Quality' capture profile.",
      ],
    };

    return (
      suggestions[this.code] || [
        "Try refreshing the page and capturing again.",
        "Contact support if issue persists.",
      ]
    );
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      context: this.context,
      suggestions: this.suggestions,
      stack: this.stack,
    };
  }
}
