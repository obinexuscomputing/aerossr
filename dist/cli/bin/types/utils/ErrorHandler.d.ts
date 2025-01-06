/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
export interface CustomError extends Error {
    statusCode?: number;
    code?: string;
    details?: unknown;
}
export interface ErrorPageOptions {
    styles?: string;
    showStack?: boolean;
    showDetails?: boolean;
}
export declare class ErrorHandler {
    private readonly defaultStyles;
    private readonly showStack;
    private readonly showDetails;
    static handleError(error: CustomError, req: IncomingMessage, res: ServerResponse): Promise<void>;
    constructor(options?: ErrorPageOptions);
    generateErrorPage(statusCode: number, message: string, error?: CustomError, options?: ErrorPageOptions): string;
    handleError(error: CustomError, req: IncomingMessage, res: ServerResponse): Promise<void>;
}
//# sourceMappingURL=ErrorHandler.d.ts.map