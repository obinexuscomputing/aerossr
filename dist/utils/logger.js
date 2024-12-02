"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Logger {
    constructor(options = {}) {
        this.logFilePath = options.logFilePath || null;
        if (this.logFilePath) {
            try {
                const logDir = path_1.default.dirname(this.logFilePath);
                if (!fs_1.default.existsSync(logDir)) {
                    fs_1.default.mkdirSync(logDir, { recursive: true });
                }
                fs_1.default.accessSync(this.logFilePath, fs_1.default.constants.W_OK | fs_1.default.constants.R_OK);
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
            fs_1.default.appendFile(this.logFilePath, `${logMessage}\n`, (err) => {
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
//# sourceMappingURL=logger.js.map