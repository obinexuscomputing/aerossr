import { IncomingMessage } from 'http';
export interface LoggerOptions {
    logFilePath?: string | null;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    maxFileSize?: number;
    maxFiles?: number;
    format?: 'json' | 'text';
}
interface ErrorDetails {
    message: string;
    error?: Error | unknown;
    context?: Record<string, unknown>;
}
export declare class Logger {
    private logFilePath;
    private readonly options;
    private static readonly DEFAULT_OPTIONS;
    constructor(options?: LoggerOptions | string);
    private initializeLogFile;
    getLogPath(): string | null;
    private formatMessage;
    private shouldLog;
    log(message: string, level?: 'debug' | 'info' | 'warn' | 'error'): Promise<void>;
    private checkRotation;
    private rotateLogFiles;
    private formatErrorDetails;
    error(messageOrDetails: string | ErrorDetails, error?: Error): Promise<void>;
    debug(message: string, context?: Record<string, unknown>): Promise<void>;
    info(message: string, context?: Record<string, unknown>): Promise<void>;
    warn(message: string, context?: Record<string, unknown>): Promise<void>;
    clear(): Promise<void>;
    logRequest(req: IncomingMessage): void;
}
export {};
//# sourceMappingURL=logging.d.ts.map