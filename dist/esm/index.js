export { A as AeroSSR, L as Logger, c as createCache, b as generateBundle, a as generateETag, g as generateErrorPage, h as handleError, i as injectMetaTags, m as minifyBundle, n as normalizeCorsOptions, r as resolveDependencies, s as setCorsHeaders } from './AeroSSR-78d66d5f.js';
export { S as StaticFileMiddleware } from './StaticFileMiddleware-3a909d94.js';
import 'http';
import 'fs';
import 'url';
import 'path';
import 'zlib';
import 'fs/promises';
import 'crypto';

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ')
            c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0)
            return c.substring(nameEQ.length, c.length);
    }
    return null;
}
function deleteCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
}

/**
 * Type guard to check if a value is a Promise
 */
function isPromise(value) {
    return Boolean(value && typeof value === 'object' && 'then' in value && typeof value.then === 'function');
}
/**
 * Ensures a function returns a Promise
 */
function ensureAsync(fn) {
    return async function (...args) {
        const result = await fn(...args);
        return result;
    };
}

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
    static async securityHeaders(req, res) {
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
            // A placeholder for input sanitization
            // Implement as needed, e.g., escaping special characters
            resolve();
        });
    }
}

export { SecurityMiddleware, deleteCookie, ensureAsync, getCookie, isPromise, setCookie };
//# sourceMappingURL=index.js.map
