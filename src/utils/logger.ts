import { config } from '../config/env.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Patterns to sanitize from log outputs to prevent credential leakage
const SENSITIVE_PATTERNS = [
  /\bck_[a-zA-Z0-9_-]+/g,
  /\bcs_[a-zA-Z0-9_-]+/g,
  /Basic\s+[a-zA-Z0-9+/=]+/gi,
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
  /password["':\s]+["']?[^"',\s]+["']?/gi,
];

function sanitize(message: string): string {
  let cleaned = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[REDACTED]');
  }
  return cleaned;
}

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = config.LOG_LEVEL) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return sanitize(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(this.format('info', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, meta));
    }
  }
}

export const logger = new Logger();
