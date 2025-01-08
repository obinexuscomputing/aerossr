/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path__default from 'path';

class Logger {
    logFilePath;
    options;
    static DEFAULT_OPTIONS = {
        logFilePath: null,
        logLevel: 'info',
        maxFileSize: 10 * 1024 * 1024,
        maxFiles: 5,
        format: 'text'
    };
    constructor(options = {}) {
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
    initializeLogFile() {
        try {
            const logDir = path__default.dirname(this.logFilePath);
            if (!existsSync(logDir)) {
                mkdirSync(logDir, { recursive: true });
            }
        }
        catch (error) {
            console.error(`Logger initialization failed for path: ${this.logFilePath} - ${error.message}`);
            throw error; // Propagate the error instead of silently failing
        }
    }
    getLogPath() {
        return this.logFilePath;
    }
    formatMessage(message) {
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
    async log(message) {
        const formattedMessage = this.formatMessage(message);
        console.log(formattedMessage.trim());
        if (this.logFilePath) {
            try {
                await fs.appendFile(this.logFilePath, formattedMessage);
            }
            catch (error) {
                console.error(`Failed to write to log file: ${error.message}`);
                throw error; // Propagate the error instead of silently failing
            }
        }
    }
    logRequest(req) {
        const { method = 'undefined', url = 'undefined', headers = {} } = req;
        const userAgent = headers['user-agent'] || 'unknown';
        const logMessage = `${method} ${url} - ${userAgent}`;
        void this.log(logMessage);
    }
    async clear() {
        if (this.logFilePath && existsSync(this.logFilePath)) {
            try {
                await fs.writeFile(this.logFilePath, '');
            }
            catch (error) {
                console.error(`Failed to clear log file: ${error.message}`);
                throw error; // Propagate the error instead of silently failing
            }
        }
    }
}

export { Logger };
//# sourceMappingURL=Logger.js.map
