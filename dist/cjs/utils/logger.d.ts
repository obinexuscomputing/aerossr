/// <reference types="node" />
import { IncomingMessage } from 'http';
export interface LoggerOptions {
    logFilePath?: string | null;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    maxFileSize?: number;
    maxFiles?: number;
    format?: 'json' | 'text';
}
export declare class Logger {
    private logFilePath;
    private readonly options;
    private static readonly DEFAULT_OPTIONS;
    constructor(options?: LoggerOptions);
    private initializeLogFile;
    getLogPath(): string | null;
    private formatMessage;
    log(message: string): Promise<void>;
    logRequest(req: IncomingMessage): void;
    clear(): Promise<void>;
}
//# sourceMappingURL=logger.d.ts.map