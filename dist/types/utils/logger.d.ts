import { IncomingMessage } from 'http';

interface LoggerOptions {
    logFilePath?: string | null;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    maxFileSize?: number;
    maxFiles?: number;
    format?: 'json' | 'text';
}
declare class Logger {
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

export { Logger, LoggerOptions };
