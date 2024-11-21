import fs from 'fs';
import path from 'path';
import { IncomingMessage } from 'http';
import { LoggerOptions } from '@/types';

export class Logger {
  private logFilePath: string | null;

  constructor(options: LoggerOptions = {}) {
    this.logFilePath = options.logFilePath || null;

    if (this.logFilePath) {
      try {
        const logDir = path.dirname(this.logFilePath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.accessSync(this.logFilePath, fs.constants.W_OK | fs.constants.R_OK);
      } catch (error) {
        console.error(
          `Logger initialization failed for path: ${this.logFilePath} - ${(error as Error).message}`
        );
        this.logFilePath = null;
      }
    }
  }

  log(message: string): void {
    const logMessage = `[${new Date().toISOString()}] ${message}`;
    console.log(logMessage);

    if (this.logFilePath) {
      fs.appendFile(this.logFilePath, `${logMessage}\n`, (err) => {
        if (err) {
          console.error(`Failed to write to log file: ${err.message}`);
        }
      });
    }
  }

  logRequest(req: IncomingMessage): void {
    const { method, url } = req;
    this.log(`${method} ${url}`);
  }
}