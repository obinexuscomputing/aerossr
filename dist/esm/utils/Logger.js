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
            throw error;
        }
    }
    getLogPath() {
        return this.logFilePath;
    }
    formatMessage(message, level = 'info') {
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
    async log(message, level = 'info') {
        if (!this.shouldLog(level)) {
            return;
        }
        const formattedMessage = this.formatMessage(message, level);
        console.log(formattedMessage.trim());
        if (this.logFilePath) {
            try {
                await this.checkRotation();
                await fs.appendFile(this.logFilePath, formattedMessage, 'utf8');
            }
            catch (error) {
                console.error(`Failed to write to log file: ${error.message}`);
                throw error;
            }
        }
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const configuredLevel = levels.indexOf(this.options.logLevel);
        const messageLevel = levels.indexOf(level);
        return messageLevel >= configuredLevel;
    }
    async checkRotation() {
        if (!this.logFilePath || !this.options.maxFileSize) {
            return;
        }
        try {
            const stats = await fs.stat(this.logFilePath);
            if (stats.size >= this.options.maxFileSize) {
                await this.rotateLogFiles();
            }
        }
        catch (error) {
            console.error(`Failed to check log rotation: ${error.message}`);
        }
    }
    async rotateLogFiles() {
        if (!this.logFilePath)
            return;
        for (let i = this.options.maxFiles - 1; i > 0; i--) {
            const oldPath = `${this.logFilePath}.${i}`;
            const newPath = `${this.logFilePath}.${i + 1}`;
            try {
                if (existsSync(oldPath)) {
                    await fs.rename(oldPath, newPath);
                }
            }
            catch (error) {
                console.error(`Failed to rotate log file: ${error.message}`);
            }
        }
        try {
            await fs.rename(this.logFilePath, `${this.logFilePath}.1`);
            await fs.writeFile(this.logFilePath, '');
        }
        catch (error) {
            console.error(`Failed to create new log file: ${error.message}`);
        }
    }
    logRequest(req) {
        const { method = 'undefined', url = 'undefined', headers = {} } = req;
        const userAgent = headers['user-agent'] || 'unknown';
        const logMessage = `${method} ${url} - ${userAgent}`;
        void this.log(logMessage, 'info');
    }
    async logError(error) {
        const message = `${error.name}: ${error.message}\nStack: ${error.stack}`;
        await this.log(message, 'error');
    }
    async clear() {
        if (this.logFilePath && existsSync(this.logFilePath)) {
            try {
                await fs.writeFile(this.logFilePath, '');
            }
            catch (error) {
                console.error(`Failed to clear log file: ${error.message}`);
                throw error;
            }
        }
    }
    // Debug level convenience methods
    async debug(message) {
        await this.log(message, 'debug');
    }
    async info(message) {
        await this.log(message, 'info');
    }
    async warn(message) {
        await this.log(message, 'warn');
    }
    async error(message) {
        await this.log(message, 'error');
    }
}

export { Logger };
//# sourceMappingURL=Logger.js.map
