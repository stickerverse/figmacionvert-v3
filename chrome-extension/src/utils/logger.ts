export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogScope =
  | "worker"
  | "background"
  | "content"
  | "plugin"
  | "capture";

export interface LogEvent {
  timestamp: number;
  level: LogLevel;
  scope: LogScope;
  message: string;
  data?: any;
  phase?: string; // e.g., 'networkIdle', 'layoutStable'
}

class Logger {
  private logs: LogEvent[] = [];
  private maxLogs = 1000;

  log(
    level: LogLevel,
    scope: LogScope,
    message: string,
    data?: any,
    phase?: string
  ) {
    const event: LogEvent = {
      timestamp: Date.now(),
      level,
      scope,
      message,
      data,
      phase,
    };

    this.logs.push(event);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // In development, also log to console
    if (process.env.NODE_ENV !== "production") {
      const prefix = `[${scope.toUpperCase()}]`;
      const args = [prefix, message];
      if (data) args.push(data);
      if (phase) args.push(`(phase: ${phase})`);

      switch (level) {
        case "debug":
          console.debug(...args);
          break;
        case "info":
          console.info(...args);
          break;
        case "warn":
          console.warn(...args);
          break;
        case "error":
          console.error(...args);
          break;
      }
    }
  }

  debug(scope: LogScope, message: string, data?: any, phase?: string) {
    this.log("debug", scope, message, data, phase);
  }

  info(scope: LogScope, message: string, data?: any, phase?: string) {
    this.log("info", scope, message, data, phase);
  }

  warn(scope: LogScope, message: string, data?: any, phase?: string) {
    this.log("warn", scope, message, data, phase);
  }

  error(scope: LogScope, message: string, data?: any, phase?: string) {
    this.log("error", scope, message, data, phase);
  }

  getLogs(): LogEvent[] {
    return [...this.logs];
  }

  getSummary() {
    const counts: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    for (const log of this.logs) {
      counts[log.level]++;
    }

    return {
      counts,
      lastMessage:
        this.logs.length > 0 ? this.logs[this.logs.length - 1] : null,
    };
  }

  clear() {
    this.logs = [];
  }
}

export const logger = new Logger();
