// __tests__/middlewares/StaticFileMiddleware.test.ts
import { StaticFileMiddleware } from '../../src/middlewares/StaticFileMiddleware';
import { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';

jest.mock('fs/promises');

describe('StaticFileMiddleware', () => {
  let middleware: StaticFileMiddleware;
  
  beforeEach(() => {
    middleware = new StaticFileMiddleware({
      root: '/test/public',
      maxAge: 3600,
      compression: true
    });
  });

  const createMockRequest = (method: string = 'GET', url: string = '/'): IncomingMessage => {
    const req = new Readable() as IncomingMessage;
    req.method = method;
    req.url = url;
    req.headers = {};
    return req;
  };

  const createMockResponse = (): ServerResponse => {
    const res = {
      writeHead: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn()
    } as unknown as ServerResponse;
    return res;
  };

  describe('Configuration', () => {
    it('should use default options when not provided', () => {
      const defaultMiddleware = new StaticFileMiddleware({ root: '/test' });
      expect(defaultMiddleware['maxAge']).toBe(86400);
      expect(defaultMiddleware['compression']).toBe(true);
      expect(defaultMiddleware['dotFiles']).toBe('ignore');
    });

    it('should use provided options', () => {
      expect(middleware['root']).toBe('/test/public');
      expect(middleware['maxAge']).toBe(3600);
      expect(middleware['compression']).toBe(true);
    });
  });

  describe('Request Handling', () => {
    it('should call next() for non-GET/HEAD requests', async () => {
      const req = createMockRequest('POST');
      const res = createMockResponse();
      const next = jest.fn();

      await middleware.middleware()(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should handle dotfiles according to configuration', async () => {
      const restrictedMiddleware = new StaticFileMiddleware({
        root: '/test',
        dotFiles: 'deny'
      });

      const req = createMockRequest('GET', '/.hidden');
      const res = createMockResponse();
      const next = jest.fn();

      await restrictedMiddleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(403);
    });
  });

  describe('MIME Type Handling', () => {
    it('should return correct MIME type for known extensions', () => {
      expect(middleware['getMimeType']('.html')).toBe('text/html');
      expect(middleware['getMimeType']('.css')).toBe('text/css');
      expect(middleware['getMimeType']('.js')).toBe('application/javascript');
    });

    it('should return octet-stream for unknown extensions', () => {
      expect(middleware['getMimeType']('.unknown')).toBe('application/octet-stream');
    });
  });

  describe('Compression', () => {
    it('should identify compressible content types', () => {
      expect(middleware['isCompressible']('text/html')).toBe(true);
      expect(middleware['isCompressible']('application/javascript')).toBe(true);
      expect(middleware['isCompressible']('image/png')).toBe(false);
    });
  });
});