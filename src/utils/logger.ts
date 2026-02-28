export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m",  // gray
  info: "\x1b[36m",   // cyan
  warn: "\x1b[33m",   // yellow
  error: "\x1b[31m",  // red
};

const RESET = "\x1b[0m";

/**
 * Simple structured logger with level filtering and colored output.
 */
export class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = "info") {
    this.minLevel = minLevel;
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    this.log("debug", msg, data);
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.log("info", msg, data);
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.log("warn", msg, data);
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.log("error", msg, data);
  }

  private log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const color = LEVEL_COLORS[level];
    const timestamp = new Date().toISOString().slice(11, 23);
    const prefix = `${color}[${timestamp}] ${level.toUpperCase().padEnd(5)}${RESET}`;
    const suffix = data ? ` ${JSON.stringify(data)}` : "";

    console.error(`${prefix} ${msg}${suffix}`);
  }
}

export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) ?? "info"
);
