class SecurityMiddleware {
    static csrfProtection(req, res, next) {
        const token = req.headers['x-csrf-token'];
        if (!token || token !== 'your-csrf-token') {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('CSRF token missing or invalid');
            return;
        }
        next();
    }
    static rateLimit(limit, windowMs) {
        const requests = new Map();
        return (req, res, next) => {
            const ip = req.socket.remoteAddress || '';
            const now = Date.now();
            const record = requests.get(ip) || { count: 0, timestamp: now };
            if (now - record.timestamp > windowMs) {
                requests.set(ip, { count: 1, timestamp: now });
                next();
                return;
            }
            record.count += 1;
            requests.set(ip, record);
            if (record.count > limit) {
                res.writeHead(429, { 'Content-Type': 'text/plain' });
                res.end('Too many requests');
                return;
            }
            next();
        };
    }
    static securityHeaders(req, res, next) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Content-Security-Policy', "default-src 'self'");
        next();
    }
    static sanitizeInput(req, res, next) {
        // A placeholder for sanitizing inputs from query, body, or headers
        // Implement as per application needs, e.g., escape special characters
        next();
    }
}

export { SecurityMiddleware };
//# sourceMappingURL=SecurityMiddleware.js.map
