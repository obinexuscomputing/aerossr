/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
import { Logger } from './logging';
export interface CustomError extends Error {
    statusCode?: number;
    code?: string;
    details?: unknown;
    cause?: Error;
}
export interface ErrorPageOptions {
    styles?: string;
    showStack?: boolean;
    showDetails?: boolean;
    logger?: Logger;
}
export declare class ErrorHandler {
    private readonly defaultStyles;
    private readonly showStack;
    private readonly showDetails;
    private readonly logger?;
    constructor(options?: ErrorPageOptions);
    static generateBasicErrorPage(statusCode: number, message: string): string;
    generateErrorPage(statusCode: number, message: string, error?: CustomError, options?: ErrorPageOptions): string;
    handleError(error: CustomError, req: IncomingMessage, res: ServerResponse): Promise<void>;
    static handleErrorStatic(error: CustomError, req: IncomingMessage, res: ServerResponse, options?: ErrorPageOptions): Promise<void>;
}
//# sourceMappingURL=error.d.ts.map