/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
declare module 'http' {
    interface IncomingMessage {
        body?: unknown;
    }
}
export interface RateLimitConfig {
    limit: number;
    windowMs: number;
    skipSuccessfulRequests?: boolean;
    keyGenerator?: (req: IncomingMessage) => string;
}
export interface CSRFConfig {
    tokenKey?: string;
    cookieName?: string;
    headerName?: string;
}
export interface SecurityHeadersConfig {
    xssProtection?: boolean;
    noSniff?: boolean;
    noCache?: boolean;
    frameOptions?: 'DENY' | 'SAMEORIGIN';
    hsts?: {
        maxAge: number;
        includeSubDomains: boolean;
        preload?: boolean;
    };
    csp?: {
        defaultSrc: string[];
        scriptSrc?: string[];
        styleSrc?: string[];
        imgSrc?: string[];
        connectSrc?: string[];
    };
}
export declare class SecurityMiddleware {
    private static readonly DEFAULT_CSRF_TOKEN;
    private static readonly DEFAULT_RATE_LIMIT_WINDOW;
    private static readonly DEFAULT_RATE_LIMIT;
    /**
     * CSRF Protection Middleware
     */
    static csrfProtection(config?: CSRFConfig): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    /**
     * Rate Limiting Middleware
     */
    static rateLimit(config: RateLimitConfig): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    /**
     * Security Headers Middleware
     */
    static securityHeaders(config?: SecurityHeadersConfig): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    /**
     * Input Sanitization Middleware
     */
    static sanitizeInput(options?: {
        maxBodySize?: number;
    }): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    /**
     * Recursively sanitize an object
     */
    private static sanitizeObject;
    /**
     * Sanitize a string
     */
    private static sanitizeString;
}
//# sourceMappingURL=SecurityMiddleware.d.ts.map