export enum CaptureErrorCode {
  ASSET_DOWNLOAD_FAILED = "ASSET_DOWNLOAD_FAILED",
  MESSAGE_NOT_CLONEABLE = "MESSAGE_NOT_CLONEABLE",
  UNSUPPORTED_URL_SCHEME = "UNSUPPORTED_URL_SCHEME",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  CONTENT_SCRIPT_NOT_READY = "CONTENT_SCRIPT_NOT_READY",
  CAPTURE_TIMEOUT = "CAPTURE_TIMEOUT",
}

export type CaptureResult =
  | { status: "ok"; data: any }
  | {
      status: "error";
      errorCode: string;
      message: string;
      details?: any;
      stage?: string;
    };
