import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { IncomingMessage } from 'http';
import path from 'path';

export interface LoggerOptions {
  logFilePath?: string | null;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  maxFileSize?: number;
  maxFiles?: number;
  format?: 'json' | 'text';
}

export class Logger {
  private logFilePath: string | null;
  private readonly options: Required<LoggerOptions>;
  private static readonly DEFAULT_OPTIONS: Required<LoggerOptions> = {
    logFilePath: null,
    logLevel: 'info',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    format: 'text'
  };

  constructor(options: LoggerOptions | string = {}) {
    // Handle string argument for backward compatibility
    if (typeof options === 'string') {
      options = { logFilePath: options };
    }

    this.options = { ...Logger.DEFAULT_OPTIONS, ...options };
    this.logFilePath = this.options.logFilePath;

    if (this.logFilePath) {
      this.initializeLogFile();
    }
  }

  private initializeLogFile(): void {
    try {
      const logDir = path.dirname(this.logFilePath!);
      
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
    } catch (error) {
      console.error(
        `Logger initialization failed for path: ${this.logFilePath} - ${(error as Error).message}`
      );
      throw error; // Propagate the error instead of silently failing
    }
  }

  public getLogPath(): string | null {
    return this.logFilePath;
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    if (this.options.format === 'json') {
      return JSON.stringify({
        timestamp,
        message,
        level: this.options.logLevel
      }) + '\n';
    }
    return `[${timestamp}] ${message}\n`;
  }

  public async log(message: string): Promise<void> {
    const formattedMessage = this.formatMessage(message);
    console.log(formattedMessage.trim());

    if (this.logFilePath) {
      try {
        await fs.appendFile(this.logFilePath, formattedMessage);
      } catch (error) {
        console.error(`Failed to write to log file: ${(error as Error).message}`);
        throw error; // Propagate the error instead of silently failing
      }
    }
  }

  public logRequest(req: IncomingMessage): void {
    const { method = 'undefined', url = 'undefined', headers = {} } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const logMessage = `${method} ${url} - ${userAgent}`;
    void this.log(logMessage);
  }

  public async clear(): Promise<void> {
    if (this.logFilePath && existsSync(this.logFilePath)) {
      try {
        await fs.writeFile(this.logFilePath, '');
      } catch (error) {
        console.error(`Failed to clear log file: ${(error as Error).message}`);
        throw error; // Propagate the error instead of silently failing
      }
    }
  }
}