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
    constructor(options?: LoggerOptions | string);
    private initializeLogFile;
    getLogPath(): string | null;
    private formatMessage;
    private shouldLog;
    log(message: string, level?: 'debug' | 'info' | 'warn' | 'error'): Promise<void>;
    private checkRotation;
    private rotateLogFiles;
    logRequest(req: IncomingMessage): void;
    logError(error: Error): Promise<void>;
    clear(): Promise<void>;
    debug(message: string): Promise<void>;
    info(message: string): Promise<void>;
    warn(message: string): Promise<void>;
    error(message: string): Promise<void>;
}
//# sourceMappingURL=logging.d.ts.map