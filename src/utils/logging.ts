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

interface ErrorDetails {
  message: string;
  error?: Error | unknown;
  context?: Record<string, unknown>;
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
      const err = error as Error;
      console.error(
        `Logger initialization failed for path: ${this.logFilePath} - ${err.message}`
      );
      throw err;
    }
  }

  public getLogPath(): string | null {
    return this.logFilePath;
  }

  private formatMessage(message: string, level: string = 'info'): string {
    const timestamp = new Date().toISOString();
    if (this.options.format === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message
      }) + '\n';
    }
    return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configuredLevel = levels.indexOf(this.options.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configuredLevel;
  }

  public async log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(message, level);
    console.log(formattedMessage.trim());

    if (this.logFilePath) {
      try {
        await this.checkRotation();
        await fs.appendFile(this.logFilePath, formattedMessage, 'utf-8');
      } catch (error) {
        const err = error as Error;
        console.error(`Failed to write to log file: ${err.message}`);
        throw err;
      }
    }
  }

  private async checkRotation(): Promise<void> {
    if (!this.logFilePath || !this.options.maxFileSize) return;

    try {
      const stats = await fs.stat(this.logFilePath);
      if (stats.size >= this.options.maxFileSize) {
        await this.rotateLogFiles();
      }
    } catch (error) {
      console.error(`Failed to check log rotation: ${(error as Error).message}`);
    }
  }

  private async rotateLogFiles(): Promise<void> {
    if (!this.logFilePath) return;

    try {
      for (let i = this.options.maxFiles - 1; i > 0; i--) {
        const oldPath = `${this.logFilePath}.${i}`;
        const newPath = `${this.logFilePath}.${i + 1}`;
        if (existsSync(oldPath)) {
          await fs.rename(oldPath, newPath);
        }
      }

      if (existsSync(this.logFilePath)) {
        await fs.rename(this.logFilePath, `${this.logFilePath}.1`);
      }
      await fs.writeFile(this.logFilePath, '', 'utf-8');
    } catch (error) {
      console.error(`Failed to rotate log files: ${(error as Error).message}`);
    }
  }

  private formatErrorDetails(details: ErrorDetails): string {
    const { message, error, context } = details;
    const parts = [message];

    if (error instanceof Error) {
      parts.push(`Error: ${error.message}`);
      if (error.stack) {
        parts.push(`Stack: ${error.stack}`);
      }
      if (error.cause) {
        parts.push(`Cause: ${error.cause}`);
      }
    } else if (error) {
      parts.push(`Additional Info: ${JSON.stringify(error)}`);
    }

    if (context && Object.keys(context).length > 0) {
      parts.push(`Context: ${JSON.stringify(context, null, 2)}`);
    }

    return parts.join('\n');
  }

  public async error(messageOrDetails: string | ErrorDetails, error?: Error): Promise<void> {
    let details: ErrorDetails;

    if (typeof messageOrDetails === 'string') {
      details = {
        message: messageOrDetails,
        error: error
      };
    } else {
      details = messageOrDetails;
    }

    const formattedMessage = this.formatErrorDetails(details);
    await this.log(formattedMessage, 'error');
  }

  public async debug(message: string, context?: Record<string, unknown>): Promise<void> {
    const formattedMessage = context 
      ? `${message}\nContext: ${JSON.stringify(context, null, 2)}`
      : message;
    await this.log(formattedMessage, 'debug');
  }

  public async info(message: string, context?: Record<string, unknown>): Promise<void> {
    const formattedMessage = context 
      ? `${message}\nContext: ${JSON.stringify(context, null, 2)}`
      : message;
    await this.log(formattedMessage, 'info');
  }

  public async warn(message: string, context?: Record<string, unknown>): Promise<void> {
    const formattedMessage = context 
      ? `${message}\nContext: ${JSON.stringify(context, null, 2)}`
      : message;
    await this.log(formattedMessage, 'warn');
  }

  public async clear(): Promise<void> {
    if (this.logFilePath && existsSync(this.logFilePath)) {
      try {
        await fs.writeFile(this.logFilePath, '', 'utf-8');
      } catch (error) {
        const err = error as Error;
        console.error(`Failed to clear log file: ${err.message}`);
        throw err;
      }
    }
  }

  public logRequest(req: IncomingMessage): void {
    const { method = 'undefined', url = 'undefined', headers = {} } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const logMessage = `${method} ${url} - ${userAgent}`;
    void this.log(logMessage, 'info');
  }
}