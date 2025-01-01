import { IncomingMessage, ServerResponse } from 'http';

declare class SecurityMiddleware {
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
    static securityHeaders(req: IncomingMessage, res: ServerResponse): Promise<void>;
    /**
     * Input Sanitization Middleware
     */
    static sanitizeInput(req: IncomingMessage, res: ServerResponse): Promise<void>;
}

export { SecurityMiddleware };
