import { waitForStablePage } from "./page-readiness";
import { CaptureConfig } from "../config/capture-config";

// Mock browser APIs
const mockPerformance = {
  now: jest.fn(),
};
global.performance = mockPerformance as any;

const mockMutationObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
};
global.MutationObserver = jest.fn(() => mockMutationObserver) as any;

const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
};
global.PerformanceObserver = jest.fn(() => mockPerformanceObserver) as any;
(global.PerformanceObserver as any).supportedEntryTypes = ["layout-shift"];

describe("waitForStablePage", () => {
  let mockConfig: CaptureConfig;
  let currentTime = 0;

  beforeEach(() => {
    jest.useFakeTimers();
    currentTime = 0;
    mockPerformance.now.mockImplementation(() => currentTime);

    mockConfig = {
      profile: "fast",
      maxCaptureDurationMs: 5000,
      stableWindowMs: 500,
      enableAutoInteractions: false,
      interactionMode: "base",
      screenshotQuality: "medium",
      captureViewportOnly: true,
      respectReducedMotion: true,
      disableWorkersOnCSP: true,
      maxScrollDepthScreens: 3,
    };

    // Reset mocks
    mockMutationObserver.observe.mockClear();
    mockMutationObserver.disconnect.mockClear();
    mockPerformanceObserver.observe.mockClear();
    mockPerformanceObserver.disconnect.mockClear();

    // Mock document.readyState
    Object.defineProperty(document, "readyState", {
      value: "complete",
      writable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should resolve immediately if page is stable", async () => {
    const promise = waitForStablePage(mockConfig);

    // Advance time past stable window
    currentTime += 600;
    jest.advanceTimersByTime(600);

    await expect(promise).resolves.toBeDefined();
    expect(mockMutationObserver.disconnect).toHaveBeenCalled();
  });

  it("should wait for layout stability", async () => {
    const promise = waitForStablePage(mockConfig);

    // Simulate layout change at 200ms
    currentTime += 200;
    jest.advanceTimersByTime(200);
    const mutationCallback = (global.MutationObserver as jest.Mock).mock
      .calls[0][0];
    mutationCallback();

    // Advance time but not enough for stable window (needs 500ms more)
    currentTime += 300;
    jest.advanceTimersByTime(300);

    // Should not resolve yet (we can't easily check pending promise state in Jest without helpers,
    // but we can check if disconnect was called)
    expect(mockMutationObserver.disconnect).not.toHaveBeenCalled();

    // Advance time past stable window
    currentTime += 300; // Total 600ms since last change
    jest.advanceTimersByTime(300);

    await expect(promise).resolves.toBeDefined();
    expect(mockMutationObserver.disconnect).toHaveBeenCalled();
  });

  it("should timeout if page never stabilizes", async () => {
    const promise = waitForStablePage(mockConfig);

    // Simulate constant layout changes
    const mutationCallback = (global.MutationObserver as jest.Mock).mock
      .calls[0][0];

    const interval = setInterval(() => {
      currentTime += 100;
      mutationCallback();
    }, 100);

    // Advance past max duration
    currentTime += 6000;
    jest.advanceTimersByTime(6000);
    clearInterval(interval);

    await expect(promise).rejects.toThrow("PAGE_NOT_STABLE");
  });
});
