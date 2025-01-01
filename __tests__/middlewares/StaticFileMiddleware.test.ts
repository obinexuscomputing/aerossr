import { StaticFileMiddleware } from '../../src/middlewares/StaticFileMiddleware';
import { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');
jest.mock('path');

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
  });

  const createMockRequest = (method: string = 'GET', url: string = '/', headers = {}): IncomingMessage => {
    const req = new Readable() as IncomingMessage;
    req.method = method;
    req.url = url;
    req.headers = headers;
    return req;
  };

  const createMockResponse = (): jest.Mocked<ServerResponse> => {
    const res = {
      writeHead: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn()
    } as unknown as jest.Mocked<ServerResponse>;
    return res;
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

      expect(customMiddleware['root']).toBe('/test');
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

    it('should ignore dotfiles with ignore configuration', async () => {
      const ignoringMiddleware = new StaticFileMiddleware({
        root: '/test',
        dotFiles: 'ignore'
      });

      const req = createMockRequest('GET', '/.hidden');
      const res = createMockResponse();
      const next = jest.fn();

      await ignoringMiddleware.middleware()(req, res, next);
      
      expect(res.writeHead).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should allow dotfiles with allow configuration', async () => {
      const allowingMiddleware = new StaticFileMiddleware({
        root: '/test',
        dotFiles: 'allow'
      });

      const req = createMockRequest('GET', '/.allowed');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      mockReadFile.mockResolvedValueOnce(Buffer.from('content'));

      await allowingMiddleware.middleware()(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(mockStat).toHaveBeenCalled();
    });
  });

  describe('File Serving', () => {
    it('should serve files with correct headers', async () => {
      const req = createMockRequest('GET', '/test.html');
      const res = createMockResponse();
      const next = jest.fn();
      const mtime = new Date();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime,
      } as any);

      mockReadFile.mockResolvedValueOnce(Buffer.from('content'));

      await middleware.middleware()(req, res, next);

      expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
        'Last-Modified': mtime.toUTCString(),
      }));
    });

    it('should handle directory requests with index files', async () => {
      const req = createMockRequest('GET', '/dir');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
      } as any);

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as any);

      mockReadFile.mockResolvedValueOnce(Buffer.from('index content'));

      await middleware.middleware()(req, res, next);

      expect(mockPath.join).toHaveBeenCalledWith('/test/public/dir', 'index.html');
      expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
      expect(res.end).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe('MIME Type Handling', () => {
    it('should return correct MIME type for known extensions', () => {
      expect(middleware['getMimeType']('.html')).toBe('text/html');
      expect(middleware['getMimeType']('.css')).toBe('text/css');
      expect(middleware['getMimeType']('.js')).toBe('application/javascript');
      expect(middleware['getMimeType']('.jpg')).toBe('image/jpeg');
      expect(middleware['getMimeType']('.wasm')).toBe('application/wasm');
    });

    it('should return octet-stream for unknown extensions', () => {
      expect(middleware['getMimeType']('.unknown')).toBe('application/octet-stream');
    });
  });

  describe('Compression', () => {
    it('should identify compressible content types', () => {
      expect(middleware['isCompressible']('text/html')).toBe(true);
      expect(middleware['isCompressible']('application/javascript')).toBe(true);
      expect(middleware['isCompressible']('text/css')).toBe(true);
      expect(middleware['isCompressible']('image/png')).toBe(false);
      expect(middleware['isCompressible']('audio/wav')).toBe(false);
    });
  });
});