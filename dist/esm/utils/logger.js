import * as fs from 'fs';

class Logger {
    logFilePath;
    constructor(options = {}) {
        this.logFilePath = options.logFilePath || null;
        if (this.logFilePath) {
            try {
                const logDir = path.dirname(this.logFilePath);
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                fs.accessSync(this.logFilePath, fs.constants.W_OK | fs.constants.R_OK);
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
            fs.appendFile(this.logFilePath, `${logMessage}\n`, (err) => {
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

export { Logger };
//# sourceMappingURL=logger.js.map
