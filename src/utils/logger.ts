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
      throw error;
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

  public async log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(message, level);
    console.log(formattedMessage.trim());

    if (this.logFilePath) {
      try {
        await this.checkRotation();
        await fs.appendFile(this.logFilePath, formattedMessage, 'utf8');
      } catch (error) {
        console.error(`Failed to write to log file: ${(error as Error).message}`);
        throw error;
      }
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configuredLevel = levels.indexOf(this.options.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configuredLevel;
  }

  private async checkRotation(): Promise<void> {
    if (!this.logFilePath || !this.options.maxFileSize) {
      return;
    }

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

    for (let i = this.options.maxFiles - 1; i > 0; i--) {
      const oldPath = `${this.logFilePath}.${i}`;
      const newPath = `${this.logFilePath}.${i + 1}`;
      try {
        if (existsSync(oldPath)) {
          await fs.rename(oldPath, newPath);
        }
      } catch (error) {
        console.error(`Failed to rotate log file: ${(error as Error).message}`);
      }
    }

    try {
      await fs.rename(this.logFilePath, `${this.logFilePath}.1`);
      await fs.writeFile(this.logFilePath, '');
    } catch (error) {
      console.error(`Failed to create new log file: ${(error as Error).message}`);
    }
  }

  public logRequest(req: IncomingMessage): void {
    const { method = 'undefined', url = 'undefined', headers = {} } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const logMessage = `${method} ${url} - ${userAgent}`;
    void this.log(logMessage, 'info');
  }

  public async logError(error: Error): Promise<void> {
    const message = `${error.name}: ${error.message}\nStack: ${error.stack}`;
    await this.log(message, 'error');
  }

  public async clear(): Promise<void> {
    if (this.logFilePath && existsSync(this.logFilePath)) {
      try {
        await fs.writeFile(this.logFilePath, '');
      } catch (error) {
        console.error(`Failed to clear log file: ${(error as Error).message}`);
        throw error;
      }
    }
  }

  // Debug level convenience methods
  public async debug(message: string): Promise<void> {
    await this.log(message, 'debug');
  }

  public async info(message: string): Promise<void> {
    await this.log(message, 'info');
  }

  public async warn(message: string): Promise<void> {
    await this.log(message, 'warn');
  }

  public async error(message: string): Promise<void> {
    await this.log(message, 'error');
  }
}