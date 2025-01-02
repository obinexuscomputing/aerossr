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
export declare function generateErrorPage(statusCode: number, message: string, error?: CustomError, options?: ErrorPageOptions): string;
export declare function handleError(error: CustomError, req: IncomingMessage, res: ServerResponse): Promise<void>;
//# sourceMappingURL=errorHandler.d.ts.map