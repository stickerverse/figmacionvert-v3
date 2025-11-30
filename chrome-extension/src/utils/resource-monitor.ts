/**
 * Resource Monitor - Tracks memory usage and system health to prevent crashes
 */

export interface ResourceStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
}

export class ResourceMonitor {
  private static readonly MEMORY_WARNING_THRESHOLD = 0.9; // 90% of limit
  private static readonly MEMORY_CRITICAL_THRESHOLD = 0.95; // 95% of limit

  /**
   * Get current memory usage statistics
   * Note: performance.memory is a non-standard Chrome API
   */
  static getMemoryStats(): ResourceStats | null {
    const perf = window.performance as any;
    if (perf && perf.memory) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perf.memory;
      return {
        usedJSHeapSize,
        totalJSHeapSize,
        jsHeapSizeLimit,
        usagePercent: usedJSHeapSize / jsHeapSizeLimit,
      };
    }
    return null;
  }

  /**
   * Check if memory usage is critical
   * Throws Error if critical to trigger emergency stop
   */
  static checkHealth(): void {
    const stats = this.getMemoryStats();
    if (!stats) return;

    if (stats.usagePercent > this.MEMORY_CRITICAL_THRESHOLD) {
      const msg =
        `CRITICAL MEMORY USAGE: ${(stats.usagePercent * 100).toFixed(1)}% ` +
        `(${this.formatBytes(stats.usedJSHeapSize)} / ${this.formatBytes(
          stats.jsHeapSizeLimit
        )})`;
      console.error(`🔥 ${msg}`);
      throw new Error(msg);
    }

    if (stats.usagePercent > this.MEMORY_WARNING_THRESHOLD) {
      console.warn(
        `⚠️ High memory usage: ${(stats.usagePercent * 100).toFixed(1)}%`
      );
    }
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
