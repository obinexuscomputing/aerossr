import { IncomingMessage, ServerResponse } from 'http';

interface CustomError extends Error {
    statusCode?: number;
    code?: string;
    details?: unknown;
}
interface ErrorPageOptions {
    styles?: string;
    showStack?: boolean;
    showDetails?: boolean;
}
declare function generateErrorPage(statusCode: number, message: string, error?: CustomError, options?: ErrorPageOptions): string;
declare function handleError(error: CustomError, req: IncomingMessage, res: ServerResponse): Promise<void>;

export { CustomError, ErrorPageOptions, generateErrorPage, handleError };
