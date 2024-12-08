/// <reference types="node" />
import { IncomingMessage } from 'http';
import { LoggerOptions } from '../@types/index';
export declare class Logger {
    private logFilePath;
    constructor(options?: LoggerOptions);
    log(message: string): void;
    logRequest(req: IncomingMessage): void;
}
//# sourceMappingURL=logger.d.ts.map