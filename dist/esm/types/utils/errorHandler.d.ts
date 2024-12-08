/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
export declare function generateErrorPage(statusCode: number, message: string): string;
export declare function handleError(error: Error & {
    statusCode?: number;
}, req: IncomingMessage, res: ServerResponse): Promise<void>;
//# sourceMappingURL=errorHandler.d.ts.map