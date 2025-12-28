export type CaptureProfile = "speed" | "balanced" | "quality";

export interface CaptureConfig {
  maxCaptureDurationMs: number;
  stableWindowMs: number;
  maxScrollDepthScreens: number;
}

export const CAPTURE_CONFIG_PRESETS: Record<CaptureProfile, CaptureConfig> = {
  speed: {
    maxCaptureDurationMs: 5000,
    stableWindowMs: 500,
    maxScrollDepthScreens: 1,
  },
  balanced: {
    maxCaptureDurationMs: 30000,
    stableWindowMs: 250, // Only need 250ms of quiet time (very lenient)
    maxScrollDepthScreens: 8,
  },
  quality: {
    maxCaptureDurationMs: 30000,
    stableWindowMs: 2000,
    maxScrollDepthScreens: 20,
  },
};

export const IMAGE_FETCH_CONFIG = {
  // Allow HTTP images on HTTPS pages (mixed content)
  allowMixedContent: true,

  // Retry failed images with HTTP if HTTPS fails
  httpFallback: true,

  // Maximum retries per image
  maxRetries: 3,

  // Timeout per attempt in milliseconds
  timeoutMs: 5000,

  // Maximum image size in KB before compression
  maxImageSizeKB: 2048,
};

// YouTube-specific configuration for heavy dynamic content
export const YOUTUBE_CONTENT_CONFIG = {
  // Maximum time to wait for dynamic content (comments, etc.)
  maxDynamicContentWaitMs: 15000, // 15 seconds instead of unlimited

  // Time to wait between content loading attempts
  contentLoadRetryMs: 500,

  // Maximum scroll attempts for lazy-loaded content
  maxScrollAttempts: 3,

  // Skip comments loading if taking too long (fallback)
  skipCommentsAfterMs: 8000,
};
