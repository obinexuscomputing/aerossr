import { IncomingMessage, ServerResponse } from 'http';
import { SecurityMiddleware } from '../src/middlewares/SecurityMiddleware';
import { EventEmitter } from 'events';

describe('SecurityMiddleware', () => {
  // Test utilities
  const createMockRequest = (options: {
    method?: string;
    headers?: Record<string, string>;
    remoteAddress?: string;
  } = {}): IncomingMessage => {
    const req = new EventEmitter() as IncomingMessage;
    req.method = options.method || 'GET';
    req.headers = options.headers || {};
    req.socket = { remoteAddress: options.remoteAddress || '127.0.0.1' } as any;
    return req;
  };

  const createMockResponse = (): jest.Mocked<ServerResponse> => {
    return {
      writeHead: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
      getHeader: jest.fn(),
    } as unknown as jest.Mocked<ServerResponse>;
  };

  describe('CSRF Protection', () => {
    it('should allow requests with valid CSRF token', async () => {
      const req = createMockRequest({
        headers: { 'x-csrf-token': 'your-csrf-token' }
      });
      const res = createMockResponse();

      await expect(SecurityMiddleware.csrfProtection(req, res)).resolves.toBeUndefined();
      expect(res.writeHead).not.toHaveBeenCalled();
    });

    it('should reject requests with missing CSRF token', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await expect(SecurityMiddleware.csrfProtection(req, res)).rejects.toThrow('CSRF token missing or invalid');
      expect(res.writeHead).toHaveBeenCalledWith(403, expect.any(Object));
    });

    it('should reject requests with invalid CSRF token', async () => {
      const req = createMockRequest({
        headers: { 'x-csrf-token': 'invalid-token' }
      });
      const res = createMockResponse();

      await expect(SecurityMiddleware.csrfProtection(req, res)).rejects.toThrow('CSRF token missing or invalid');
      expect(res.writeHead).toHaveBeenCalledWith(403, expect.any(Object));
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const rateLimit = SecurityMiddleware.rateLimit(2, 1000);
      const req = createMockRequest();
      const res = createMockResponse();

      await expect(rateLimit(req, res)).resolves.toBeUndefined();
      await expect(rateLimit(req, res)).resolves.toBeUndefined();
    });

    it('should reject requests exceeding rate limit', async () => {
      const rateLimit = SecurityMiddleware.rateLimit(2, 1000);
      const req = createMockRequest();
      const res = createMockResponse();

      await rateLimit(req, res);
      await rateLimit(req, res);
      await expect(rateLimit(req, res)).rejects.toThrow('Too many requests');
      expect(res.writeHead).toHaveBeenCalledWith(429, expect.any(Object));
    });

    it('should reset counter after window expires', async () => {
      jest.useFakeTimers();
      const windowMs = 1000;
      const rateLimit = SecurityMiddleware.rateLimit(2, windowMs);
      const req = createMockRequest();
      const res = createMockResponse();

      await rateLimit(req, res);
      await rateLimit(req, res);
      
      // Advance time beyond window
      jest.advanceTimersByTime(windowMs + 100);
      
      // Should allow requests again
      await expect(rateLimit(req, res)).resolves.toBeUndefined();
      
      jest.useRealTimers();
    });

    it('should handle requests from different IPs separately', async () => {
      const rateLimit = SecurityMiddleware.rateLimit(2, 1000);
      const req1 = createMockRequest({ remoteAddress: '1.1.1.1' });
      const req2 = createMockRequest({ remoteAddress: '2.2.2.2' });
      const res = createMockResponse();

      // First IP
      await rateLimit(req1, res);
      await rateLimit(req1, res);
      await expect(rateLimit(req1, res)).rejects.toThrow('Too many requests');

      // Second IP should still be allowed
      await expect(rateLimit(req2, res)).resolves.toBeUndefined();
    });
  });

  describe('Security Headers', () => {
    it('should set all required security headers', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await SecurityMiddleware.securityHeaders(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 
        'max-age=31536000; includeSubDomains');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', 
        "default-src 'self'");
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize POST request body', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      const sanitizePromise = SecurityMiddleware.sanitizeInput(req, res);
      
      // Simulate request data
      req.emit('data', JSON.stringify({
        text: '<script>alert("xss")</script>',
        name: "O'Reilly & Sons"
      }));
      req.emit('end');

      await sanitizePromise;

      expect(req.body).toEqual({
        text: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
        name: "O&#39;Reilly &amp; Sons"
      });
    });

    it('should handle invalid JSON in request body', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      const sanitizePromise = SecurityMiddleware.sanitizeInput(req, res);
      
      // Simulate invalid JSON data
      req.emit('data', 'invalid json{');
      req.emit('end');

      await sanitizePromise;

      expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
      expect(res.end).toHaveBeenCalledWith('Invalid JSON');
    });

    it('should only sanitize string values', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      const sanitizePromise = SecurityMiddleware.sanitizeInput(req, res);
      
      // Simulate request with mixed data types
      req.emit('data', JSON.stringify({
        text: '<script>alert("xss")</script>',
        number: 42,
        boolean: true,
        object: { nested: '<b>test</b>' }
      }));
      req.emit('end');

      await sanitizePromise;

      expect(req.body).toEqual({
        text: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
        number: 42,
        boolean: true,
        object: { nested: '&lt;b&gt;test&lt;/b&gt;' }
      });
    });

    it('should ignore non-POST/PUT requests', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();

      await SecurityMiddleware.sanitizeInput(req, res);

      expect(req.body).toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    it('should work with all middleware combined', async () => {
      const req = createMockRequest({
        method: 'POST',
        headers: { 'x-csrf-token': 'your-csrf-token' }
      });
      const res = createMockResponse();

      // Apply all middleware
      await SecurityMiddleware.csrfProtection(req, res);
      await SecurityMiddleware.securityHeaders(req, res);
      const rateLimit = SecurityMiddleware.rateLimit(5, 1000);
      await rateLimit(req, res);
      await SecurityMiddleware.sanitizeInput(req, res);

      // Simulate POST data
      req.emit('data', JSON.stringify({ text: '<script>alert("test")</script>' }));
      req.emit('end');

      // Verify all middleware effects
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(req.body.text).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
    });
  });
});