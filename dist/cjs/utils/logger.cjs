'use strict';

const fs$1 = require('fs/promises');
const fs = require('fs');
const path = require('path');

function _interopNamespaceDefault(e) {
    const n = Object.create(null);
    if (e) {
        for (const k in e) {
            if (k !== 'default') {
                const d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        }
    }
    n.default = e;
    return Object.freeze(n);
}

const fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs$1);

// src/utils/logger.ts
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
        this.options = { ...Logger.DEFAULT_OPTIONS, ...options };
        this.logFilePath = this.options.logFilePath;
        if (this.logFilePath) {
            try {
                this.initializeLogFile();
            }
            catch (error) {
                console.error(`Logger initialization failed for path: ${this.logFilePath} - ${error.message}`);
                this.logFilePath = null;
            }
        }
    }
    initializeLogFile() {
        const logDir = path.dirname(this.logFilePath);
        if (!fs.existsSync(logDir)) {
            try {
                fs.mkdirSync(logDir, { recursive: true });
            }
            catch (error) {
                throw new Error(`Failed to create log directory: ${error.message}`);
            }
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
                await fs__namespace.appendFile(this.logFilePath, formattedMessage, 'utf-8');
            }
            catch (error) {
                console.error(`Failed to write to log file: ${error.message}`);
            }
        }
    }
    logRequest(req) {
        const { method = 'undefined', url = 'undefined', headers = {} } = req;
        const userAgent = headers['user-agent'] || 'unknown';
        const logMessage = `${method} ${url} - ${userAgent}`;
        this.log(logMessage);
    }
    async clear() {
        if (this.logFilePath && fs.existsSync(this.logFilePath)) {
            try {
                await fs__namespace.writeFile(this.logFilePath, '', 'utf-8');
            }
            catch (error) {
                console.error(`Failed to clear log file: ${error.message}`);
            }
        }
    }
}

exports.Logger = Logger;
//# sourceMappingURL=logger.cjs.map
