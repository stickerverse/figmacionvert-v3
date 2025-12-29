/**
 * Debug Logger - Writes logs to UI for file export
 *
 * Since Figma plugins run in a sandbox without file system access,
 * we send logs to the UI which can save them to a file.
 */

class DebugLogger {
  private logs: string[] = [];
  private sessionStart: number = Date.now();

  log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: any) {
    const timestamp = Date.now() - this.sessionStart;
    const logEntry = {
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined,
    };

    // Format for console
    const consoleMsg = `[${level}] ${message}`;

    // Also log to console for real-time viewing
    switch (level) {
      case 'ERROR':
        console.error(consoleMsg, data || '');
        break;
      case 'WARN':
        console.warn(consoleMsg, data || '');
        break;
      default:
        console.log(consoleMsg, data || '');
    }

    // Format for file
    const fileEntry = `[+${timestamp}ms] [${level}] ${message}${
      data ? '\n' + JSON.stringify(data, null, 2) : ''
    }\n`;

    this.logs.push(fileEntry);

    // Send to UI periodically (every 50 logs or on ERROR)
    if (this.logs.length % 50 === 0 || level === 'ERROR') {
      this.flush();
    }
  }

  flush() {
    if (this.logs.length === 0) return;

    try {
      figma.ui.postMessage({
        type: 'debug-logs',
        logs: this.logs.join(''),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to send logs to UI:', error);
    }
  }

  finish() {
    this.flush();

    // Send final signal
    try {
      figma.ui.postMessage({
        type: 'debug-logs-complete',
        totalLogs: this.logs.length,
      });
    } catch (error) {
      console.error('Failed to send completion signal:', error);
    }
  }

  clear() {
    this.logs = [];
    this.sessionStart = Date.now();
  }
}

export const debugLogger = new DebugLogger();
