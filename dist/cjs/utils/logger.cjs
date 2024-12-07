'use strict';

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

var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs);
var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

class Logger {
    constructor(options = {}) {
        this.logFilePath = options.logFilePath || null;
        if (this.logFilePath) {
            try {
                const logDir = path__namespace.dirname(this.logFilePath);
                if (!fs__namespace.existsSync(logDir)) {
                    fs__namespace.mkdirSync(logDir, { recursive: true });
                }
                fs__namespace.accessSync(this.logFilePath, fs__namespace.constants.W_OK | fs__namespace.constants.R_OK);
            }
            catch (error) {
                console.error(`Logger initialization failed for path: ${this.logFilePath} - ${error.message}`);
                this.logFilePath = null;
            }
        }
    }
    log(message) {
        const logMessage = `[${new Date().toISOString()}] ${message}`;
        console.log(logMessage);
        if (this.logFilePath) {
            fs__namespace.appendFile(this.logFilePath, `${logMessage}\n`, (err) => {
                if (err) {
                    console.error(`Failed to write to log file: ${err.message}`);
                }
            });
        }
    }
    logRequest(req) {
        const { method, url } = req;
        this.log(`${method} ${url}`);
    }
}

exports.Logger = Logger;
//# sourceMappingURL=logger.cjs.map
