'use strict';

class SecurityMiddleware {
    /**
     * CSRF Protection Middleware
     */
    static async csrfProtection(req, res) {
        return new Promise((resolve, reject) => {
            const token = req.headers['x-csrf-token'];
            if (!token || token !== 'your-csrf-token') {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('CSRF token missing or invalid');
                return reject(new Error('CSRF token missing or invalid'));
            }
            resolve();
        });
    }
    /**
     * Rate Limiting Middleware
     */
    static rateLimit(limit, windowMs) {
        const requests = new Map();
        return async (req, res) => {
            return new Promise((resolve, reject) => {
                const ip = req.socket.remoteAddress || '';
                const now = Date.now();
                const record = requests.get(ip) || { count: 0, timestamp: now };
                if (now - record.timestamp > windowMs) {
                    requests.set(ip, { count: 1, timestamp: now });
                    return resolve();
                }
                record.count += 1;
                requests.set(ip, record);
                if (record.count > limit) {
                    res.writeHead(429, { 'Content-Type': 'text/plain' });
                    res.end('Too many requests');
                    return reject(new Error('Too many requests'));
                }
                resolve();
            });
        };
    }
    /**
     * Security Headers Middleware
     */
    static async securityHeaders(_req, res) {
        return new Promise((resolve) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            res.setHeader('Content-Security-Policy', "default-src 'self'");
            resolve();
        });
    }
    /**
     * Input Sanitization Middleware
     */
    static async sanitizeInput(req, res) {
        return new Promise((resolve) => {
            const sanitize = (input) => {
                return input.replace(/[&<>"'\/]/g, (char) => {
                    const escapeChars = {
                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#39;',
                        '/': '&#x2F;',
                    };
                    return escapeChars[char] || char;
                });
            };
            if (req.method === 'POST' || req.method === 'PUT') {
                let body = '';
                req.on('data', (chunk) => {
                    body += chunk.toString();
                });
                req.on('end', () => {
                    try {
                        const parsedBody = JSON.parse(body);
                        for (const key in parsedBody) {
                            if (typeof parsedBody[key] === 'string') {
                                parsedBody[key] = sanitize(parsedBody[key]);
                            }
                        }
                        req.body = parsedBody;
                        resolve();
                    }
                    catch (err) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Invalid JSON');
                        return;
                    }
                });
            }
            else {
                resolve();
            }
        });
    }
}

exports.SecurityMiddleware = SecurityMiddleware;
//# sourceMappingURL=SecurityMiddleware.js.map
