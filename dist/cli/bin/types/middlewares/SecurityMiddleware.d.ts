/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
declare module 'http' {
    interface IncomingMessage {
        body?: any;
    }
}
export declare class SecurityMiddleware {
    /**
     * CSRF Protection Middleware
     */
    static csrfProtection(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Rate Limiting Middleware
     */
    static rateLimit(limit: number, windowMs: number): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    /**
     * Security Headers Middleware
     */
    static securityHeaders(_req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Input Sanitization Middleware
     */
    static sanitizeInput(req: IncomingMessage, res: ServerResponse): Promise<void>;
}
//# sourceMappingURL=SecurityMiddleware.d.ts.map