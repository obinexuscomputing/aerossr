import { StaticFileMiddleware } from '../../src/middlewares/StaticFileMiddleware';
import { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { gzip } from 'zlib';
import { promisify } from 'util';

jest.mock('fs/promises');
jest.mock('path');
jest.mock('zlib');

const gzipAsync = promisify(gzip) as jest.MockedFunction<typeof promisify>;

describe('StaticFileMiddleware', () => {
  let middleware: StaticFileMiddleware;
  const mockStat = stat as jest.MockedFunction<typeof stat>;
  const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
  const mockPath = path as jest.Mocked<typeof path>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new StaticFileMiddleware({
      root: '/test/public',
      maxAge: 3600,
      compression: true
    });

    mockPath.normalize.mockImplementation(p => p);
    mockPath.join.mockImplementation((...parts) => parts.join('/'));
    mockPath.extname.mockImplementation(p => '.' + p.split('.').pop());
  });

  const createMockRequest = (method: string = 'GET', url: string = '/', headers = {}): IncomingMessage => {
    const req = new Readable() as IncomingMessage;
    req.method = method;
    req.url = url;
    req.headers = headers;
    return req;
  };

  const createMockResponse = (): jest.Mocked<ServerResponse> => {
    return {
      writeHead: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
    } as unknown as jest.Mocked<ServerResponse>;
  };

  describe('Configuration', () => {
    it('should use default options when not provided', () => {
      const defaultMiddleware = new StaticFileMiddleware({ root: '/test' });
      expect(defaultMiddleware['maxAge']).toBe(86400);
      expect(defaultMiddleware['compression']).toBe(true);
      expect(defaultMiddleware['dotFiles']).toBe('ignore');
      expect(defaultMiddleware['index']).toEqual(['index.html']);
      expect(defaultMiddleware['etag']).toBe(true);
    });

    it('should use provided options', () => {
      const customMiddleware = new StaticFileMiddleware({
        root: '/test',
        maxAge: 7200,
        compression: false,
        dotFiles: 'allow',
        index: ['index.htm'],
        etag: false
      });

      expect(customMiddleware['maxAge']).toBe(7200);
      expect(customMiddleware['compression']).toBe(false);
      expect(customMiddleware['dotFiles']).toBe('allow');
      expect(customMiddleware['index']).toEqual(['index.htm']);
      expect(customMiddleware['etag']).toBe(false);
    });
  });

  describe('Request Handling', () => {
    it('should call next() for non-GET/HEAD requests', async () => {
      const req = createMockRequest('POST');
      const res = createMockResponse();
      const next = jest.fn();

      await middleware.middleware()(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.writeHead).not.toHaveBeenCalled();
    });

    it('should handle HEAD requests same as GET but without body', async () => {
      const req = createMockRequest('HEAD', '/test.txt');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      mockReadFile.mockResolvedValueOnce(Buffer.from('content'));

      await middleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
      expect(res.end).toHaveBeenCalledWith();
    });

    it('should handle URL-encoded paths', async () => {
      const req = createMockRequest('GET', '/test%20file.txt');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      await middleware.middleware()(req, res, next);
      expect(mockPath.join).toHaveBeenCalledWith('/test/public', 'test file.txt');
    });

    it('should strip query strings from URLs', async () => {
      const req = createMockRequest('GET', '/test.txt?param=value');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      await middleware.middleware()(req, res, next);
      expect(mockPath.join).toHaveBeenCalledWith('/test/public', 'test.txt');
    });
  });

  describe('Security', () => {
    it('should handle dotfiles with deny configuration', async () => {
      const restrictedMiddleware = new StaticFileMiddleware({
        root: '/test',
        dotFiles: 'deny'
      });

      const req = createMockRequest('GET', '/.hidden');
      const res = createMockResponse();
      const next = jest.fn();

      await restrictedMiddleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(403, { 'Content-Type': 'text/plain' });
      expect(res.end).toHaveBeenCalledWith('Forbidden');
      expect(next).not.toHaveBeenCalled();
    });

    it('should prevent directory traversal attempts', async () => {
      const req = createMockRequest('GET', '/../secret.txt');
      const res = createMockResponse();
      const next = jest.fn();

      mockPath.normalize.mockReturnValueOnce('/../secret.txt');
      
      await middleware.middleware()(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.writeHead).not.toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    it('should handle ETags correctly', async () => {
      const req = createMockRequest('GET', '/test.txt', {
        'if-none-match': '"123456"'
      });
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      mockReadFile.mockResolvedValueOnce(Buffer.from('content'));

      await middleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({
        'ETag': expect.any(String)
      }));
    });

    it('should set correct cache headers', async () => {
      const req = createMockRequest('GET', '/test.txt');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      mockReadFile.mockResolvedValueOnce(Buffer.from('content'));

      await middleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({
        'Cache-Control': 'public, max-age=3600'
      }));
    });
  });

  describe('Compression', () => {
    it('should compress content when appropriate', async () => {
      const req = createMockRequest('GET', '/test.txt', {
        'accept-encoding': 'gzip'
      });
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      const content = Buffer.from('x'.repeat(2000));
      mockReadFile.mockResolvedValueOnce(content);
      (gzip as unknown as jest.Mock).mockImplementation((buffer, callback) => 
        callback(null, Buffer.from('compressed')));

      await middleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding'
      }));
    });

    it('should not compress small files', async () => {
      const req = createMockRequest('GET', '/test.txt', {
        'accept-encoding': 'gzip'
      });
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      mockReadFile.mockResolvedValueOnce(Buffer.from('small'));

      await middleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(expect.any(Number), expect.not.objectContaining({
        'Content-Encoding': 'gzip'
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle file not found gracefully', async () => {
      const req = createMockRequest('GET', '/missing.txt');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockRejectedValueOnce(new Error('ENOENT'));

      await middleware.middleware()(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should handle read errors gracefully', async () => {
      const req = createMockRequest('GET', '/error.txt');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      mockReadFile.mockRejectedValueOnce(new Error('Read error'));

      await middleware.middleware()(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('MIME Types', () => {
    it.each([
      ['.html', 'text/html'],
      ['.css', 'text/css'],
      ['.js', 'application/javascript'],
      ['.json', 'application/json'],
      ['.png', 'image/png'],
      ['.jpg', 'image/jpeg'],
      ['.svg', 'image/svg+xml'],
      ['.wasm', 'application/wasm'],
      ['.unknown', 'application/octet-stream']
    ])('should return correct MIME type for %s extension', async (ext, expectedMime) => {
      const req = createMockRequest('GET', `/test${ext}`);
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      mockReadFile.mockResolvedValueOnce(Buffer.from('content'));
      mockPath.extname.mockReturnValueOnce(ext);

      await middleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({
        'Content-Type': expectedMime
      }));
    });
  });
});