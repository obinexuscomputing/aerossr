import { IncomingMessage, ServerResponse } from 'http';
import {SecurityMiddleware} from '../../src/middlewares/SecurityMiddleware';

interface IncomingMessageWithBody extends IncomingMessage {
  body?: any;
}
  let req: IncomingMessageWithBody;
import { EventEmitter } from 'events';

describe('SecurityMiddleware', () => {
  let req: IncomingMessage;
  let res: ServerResponse;
  let headersMap: Map<string, string>;

  beforeEach(() => {
    // Create mock request
    req = new EventEmitter() as IncomingMessage;
    req.headers = {};
    req.socket = { remoteAddress: '127.0.0.1' } as any;
    req.method = 'GET';

    // Create mock response
    headersMap = new Map();
    res = {
      writeHead: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn((name: string, value: string) => {
        headersMap.set(name, value);
      }),
      getHeader: jest.fn((name: string) => headersMap.get(name))
    } as unknown as ServerResponse;
  });

  describe('CSRF Protection', () => {
    it('should reject requests without CSRF token', async () => {
      await expect(SecurityMiddleware.csrfProtection(req, res))
        .rejects
        .toThrow('CSRF token missing or invalid');
      
      expect(res.writeHead).toHaveBeenCalledWith(403, {
        'Content-Type': 'text/plain'
      });
      expect(res.end).toHaveBeenCalledWith('CSRF token missing or invalid');
    });

    it('should reject requests with invalid CSRF token', async () => {
      req.headers['x-csrf-token'] = 'invalid-token';
      
      await expect(SecurityMiddleware.csrfProtection(req, res))
        .rejects
        .toThrow('CSRF token missing or invalid');
    });

    it('should accept requests with valid CSRF token', async () => {
      req.headers['x-csrf-token'] = 'your-csrf-token';
      
      await expect(SecurityMiddleware.csrfProtection(req, res))
        .resolves
        .toBeUndefined();
      
      expect(res.writeHead).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const rateLimit = SecurityMiddleware.rateLimit(2, 1000);
      
      await expect(rateLimit(req, res)).resolves.toBeUndefined();
      await expect(rateLimit(req, res)).resolves.toBeUndefined();
    });

    it('should block requests over limit', async () => {
      const rateLimit = SecurityMiddleware.rateLimit(2, 1000);
      
      await rateLimit(req, res);
      await rateLimit(req, res);
      
      await expect(rateLimit(req, res))
        .rejects
        .toThrow('Too many requests');
      
      expect(res.writeHead).toHaveBeenCalledWith(429, {
        'Content-Type': 'text/plain'
      });
    });

    it('should reset counter after window expires', async () => {
      jest.useFakeTimers();
      const rateLimit = SecurityMiddleware.rateLimit(2, 1000);
      
      await rateLimit(req, res);
      await rateLimit(req, res);
      
      // Advance time beyond window
      jest.advanceTimersByTime(1001);
      
      // Should allow new requests
      await expect(rateLimit(req, res)).resolves.toBeUndefined();
      
      jest.useRealTimers();
    });
  });

  describe('Security Headers', () => {
    it('should set all security headers', async () => {
      await SecurityMiddleware.securityHeaders(req, res);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'self'"
      );
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize request body for POST requests', async () => {
      req.method = 'POST';
      const middleware = SecurityMiddleware.sanitizeInput(req, res);
      
      req.emit('data', JSON.stringify({
        text: '<script>alert("xss")</script>',
        safe: 'normal text'
      }));
      req.emit('end');

      await middleware;
      
      expect(req.body).toEqual({
        text: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
        safe: 'normal text'
      });
    });

    it('should handle invalid JSON', async () => {
      req.method = 'POST';
      const middleware = SecurityMiddleware.sanitizeInput(req, res);
      
      req.emit('data', 'invalid json');
      req.emit('end');

      await middleware;
      
      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'text/plain'
      });
      expect(res.end).toHaveBeenCalledWith('Invalid JSON');
    });

    it('should ignore non-POST/PUT requests', async () => {
      req.method = 'GET';
      await SecurityMiddleware.sanitizeInput(req, res);
      expect(req.body).toBeUndefined();
    });

    it('should handle empty bodies', async () => {
      req.method = 'POST';
      const middleware = SecurityMiddleware.sanitizeInput(req, res);
      
      req.emit('end');
      await middleware;
      
      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'text/plain'
      });
    });

    it('should sanitize special characters', async () => {
      req.method = 'POST';
      const middleware = SecurityMiddleware.sanitizeInput(req, res);
      
      req.emit('data', JSON.stringify({
        text: '&<>"\''
      }));
      req.emit('end');

      await middleware;
      
      expect(req.body ).toEqual({
        text: '&amp;&lt;&gt;&quot;&#39;'
      });
    });
  });
});