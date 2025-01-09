/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

class SecurityMiddleware {
    static DEFAULT_CSRF_TOKEN = 'your-csrf-token';
    static DEFAULT_RATE_LIMIT_WINDOW = 60000; // 1 minute
    static DEFAULT_RATE_LIMIT = 100;
    /**
     * CSRF Protection Middleware
     */
    static csrfProtection(config = {}) {
        const headerName = config.headerName || 'x-csrf-token';
        return async (req, res) => {
            const token = req.headers[headerName];
            if (!token || (Array.isArray(token) ? token[0] : token) !== this.DEFAULT_CSRF_TOKEN) {
                res.writeHead(403, {
                    'Content-Type': 'application/json',
                    'X-Content-Type-Options': 'nosniff'
                });
                res.end(JSON.stringify({
                    error: 'CSRF token missing or invalid',
                    code: 'CSRF_ERROR'
                }));
                throw new Error('CSRF token missing or invalid');
            }
        };
    }
    /**
     * Rate Limiting Middleware
     */
    static rateLimit(config) {
        const { limit = this.DEFAULT_RATE_LIMIT, windowMs = this.DEFAULT_RATE_LIMIT_WINDOW, skipSuccessfulRequests = false, keyGenerator = (req) => req.socket.remoteAddress || 'unknown' } = config;
        const requests = new Map();
        return async (req, res) => {
            const key = keyGenerator(req);
            const now = Date.now();
            const record = requests.get(key) || { count: 0, timestamp: now };
            // Reset if window has passed
            if (now - record.timestamp > windowMs) {
                record.count = 0;
                record.timestamp = now;
            }
            record.count += 1;
            requests.set(key, record);
            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', limit.toString());
            res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - record.count).toString());
            res.setHeader('X-RateLimit-Reset', (record.timestamp + windowMs).toString());
            if (record.count > limit) {
                res.writeHead(429, {
                    'Content-Type': 'application/json',
                    'Retry-After': Math.ceil((record.timestamp + windowMs - now) / 1000).toString()
                });
                res.end(JSON.stringify({
                    error: 'Too many requests',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil((record.timestamp + windowMs - now) / 1000)
                }));
                throw new Error('Rate limit exceeded');
            }
            // Clean up old records periodically
            if (requests.size > 10000) { // Prevent memory leaks
                const oldestAllowed = now - windowMs;
                for (const [k, v] of requests.entries()) {
                    if (v.timestamp < oldestAllowed) {
                        requests.delete(k);
                    }
                }
            }
        };
    }
    /**
     * Security Headers Middleware
     */
    static securityHeaders(config = {}) {
        return async (_req, res) => {
            // Basic security headers
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', config.frameOptions || 'DENY');
            if (config.xssProtection !== false) {
                res.setHeader('X-XSS-Protection', '1; mode=block');
            }
            // HSTS configuration
            if (config.hsts) {
                const hsts = [`max-age=${config.hsts.maxAge}`];
                if (config.hsts.includeSubDomains)
                    hsts.push('includeSubDomains');
                if (config.hsts.preload)
                    hsts.push('preload');
                res.setHeader('Strict-Transport-Security', hsts.join('; '));
            }
            // CSP configuration
            if (config.csp) {
                const cspDirectives = [
                    `default-src ${config.csp.defaultSrc.join(' ')}`,
                    config.csp.scriptSrc && `script-src ${config.csp.scriptSrc.join(' ')}`,
                    config.csp.styleSrc && `style-src ${config.csp.styleSrc.join(' ')}`,
                    config.csp.imgSrc && `img-src ${config.csp.imgSrc.join(' ')}`,
                    config.csp.connectSrc && `connect-src ${config.csp.connectSrc.join(' ')}`
                ].filter(Boolean).join('; ');
                res.setHeader('Content-Security-Policy', cspDirectives);
            }
            else {
                res.setHeader('Content-Security-Policy', "default-src 'self'");
            }
            // Cache control
            if (config.noCache) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
        };
    }
    /**
     * Input Sanitization Middleware
     */
    static sanitizeInput(options = {}) {
        const MAX_BODY_SIZE = options.maxBodySize || 1024 * 1024; // 1MB default
        return async (req, res) => {
            if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
                return;
            }
            let body = '';
            let bodySize = 0;
            return new Promise((resolve, reject) => {
                req.on('data', (chunk) => {
                    bodySize += chunk.length;
                    if (bodySize > MAX_BODY_SIZE) {
                        res.writeHead(413, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: 'Request entity too large',
                            code: 'PAYLOAD_TOO_LARGE'
                        }));
                        reject(new Error('Payload too large'));
                        return;
                    }
                    body += chunk.toString();
                });
                req.on('end', () => {
                    try {
                        if (!body) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                error: 'Empty request body',
                                code: 'EMPTY_BODY'
                            }));
                            reject(new Error('Empty request body'));
                            return;
                        }
                        const parsedBody = JSON.parse(body);
                        const sanitizedBody = this.sanitizeObject(parsedBody);
                        req.body = sanitizedBody;
                        resolve();
                    }
                    catch (err) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            error: 'Invalid JSON',
                            code: 'INVALID_JSON'
                        }));
                        reject(new Error('Invalid JSON'));
                    }
                });
                req.on('error', (err) => {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Request error',
                        code: 'REQUEST_ERROR'
                    }));
                    reject(err);
                });
            });
        };
    }
    /**
     * Recursively sanitize an object
     */
    static sanitizeObject(obj) {
        if (typeof obj === 'string') {
            return this.sanitizeString(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }
        if (obj && typeof obj === 'object') {
            return Object.fromEntries(Object.entries(obj).map(([key, value]) => [
                this.sanitizeString(key),
                this.sanitizeObject(value)
            ]));
        }
        return obj;
    }
    /**
     * Sanitize a string
     */
    static sanitizeString(input) {
        const escapeChars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        return input.replace(/[&<>"'`=\/]/g, char => escapeChars[char]);
    }
}

exports.SecurityMiddleware = SecurityMiddleware;
//# sourceMappingURL=SecurityMiddleware.js.map
