#!/usr/bin/env node
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
            console.error(`Logger initialization failed for path: ${this.logFilePath} - ${error.message}`);
            this.logFilePath = null;
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
//# sourceMappingURL=index5.js.map
