/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

var fs$1 = require('fs/promises');
var fs = require('fs');
var path = require('path');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs$1);

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
            const logDir = path.dirname(this.logFilePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
        catch (error) {
            const err = error;
            console.error(`Logger initialization failed for path: ${this.logFilePath} - ${err.message}`);
            throw err;
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
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const configuredLevel = levels.indexOf(this.options.logLevel);
        const messageLevel = levels.indexOf(level);
        return messageLevel >= configuredLevel;
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
                await fs__namespace.appendFile(this.logFilePath, formattedMessage, 'utf-8');
            }
            catch (error) {
                const err = error;
                console.error(`Failed to write to log file: ${err.message}`);
                throw err;
            }
        }
    }
    async checkRotation() {
        if (!this.logFilePath || !this.options.maxFileSize)
            return;
        try {
            const stats = await fs__namespace.stat(this.logFilePath);
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
        try {
            for (let i = this.options.maxFiles - 1; i > 0; i--) {
                const oldPath = `${this.logFilePath}.${i}`;
                const newPath = `${this.logFilePath}.${i + 1}`;
                if (fs.existsSync(oldPath)) {
                    await fs__namespace.rename(oldPath, newPath);
                }
            }
            if (fs.existsSync(this.logFilePath)) {
                await fs__namespace.rename(this.logFilePath, `${this.logFilePath}.1`);
            }
            await fs__namespace.writeFile(this.logFilePath, '', 'utf-8');
        }
        catch (error) {
            console.error(`Failed to rotate log files: ${error.message}`);
        }
    }
    formatErrorDetails(details) {
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
        }
        else if (error) {
            parts.push(`Additional Info: ${JSON.stringify(error)}`);
        }
        if (context && Object.keys(context).length > 0) {
            parts.push(`Context: ${JSON.stringify(context, null, 2)}`);
        }
        return parts.join('\n');
    }
    async error(messageOrDetails, error) {
        let details;
        if (typeof messageOrDetails === 'string') {
            details = {
                message: messageOrDetails,
                error: error
            };
        }
        else {
            details = messageOrDetails;
        }
        const formattedMessage = this.formatErrorDetails(details);
        await this.log(formattedMessage, 'error');
    }
    async debug(message, context) {
        const formattedMessage = context
            ? `${message}\nContext: ${JSON.stringify(context, null, 2)}`
            : message;
        await this.log(formattedMessage, 'debug');
    }
    async info(message, context) {
        const formattedMessage = context
            ? `${message}\nContext: ${JSON.stringify(context, null, 2)}`
            : message;
        await this.log(formattedMessage, 'info');
    }
    async warn(message, context) {
        const formattedMessage = context
            ? `${message}\nContext: ${JSON.stringify(context, null, 2)}`
            : message;
        await this.log(formattedMessage, 'warn');
    }
    async clear() {
        if (this.logFilePath && fs.existsSync(this.logFilePath)) {
            try {
                await fs__namespace.writeFile(this.logFilePath, '', 'utf-8');
            }
            catch (error) {
                const err = error;
                console.error(`Failed to clear log file: ${err.message}`);
                throw err;
            }
        }
    }
    logRequest(req) {
        const { method = 'undefined', url = 'undefined', headers = {} } = req;
        const userAgent = headers['user-agent'] || 'unknown';
        const logMessage = `${method} ${url} - ${userAgent}`;
        void this.log(logMessage, 'info');
    }
}

exports.Logger = Logger;
//# sourceMappingURL=logging.js.map
