import { StaticFileMiddleware } from '../../src/middlewares/StaticFileMiddleware';
import { IncomingMessage, ServerResponse } from 'http';
import { Readable, Transform } from 'stream';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import { gzip, createGzip } from 'zlib';
import { promisify } from 'util';
import * as fs from 'fs';

jest.mock('fs/promises');
jest.mock('path');
jest.mock('zlib');
jest.mock('fs');

const gzipAsync = promisify(gzip) as unknown as jest.MockedFunction<typeof promisify>;

describe('StaticFileMiddleware', () => {
  let middleware: StaticFileMiddleware;
  const mockStat = stat as jest.MockedFunction<typeof stat>;
  const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
  const mockPath = path as jest.Mocked<typeof path>;
  const mockCreateReadStream = jest.spyOn(fs, 'createReadStream');
  const mockCreateGzip = createGzip as jest.MockedFunction<typeof createGzip>;
  
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
    
    // Setup mock stream
    const mockStream = new Transform({
      transform(chunk, encoding, callback) {
        callback(null, chunk);
      }
    });
    mockCreateReadStream.mockReturnValue(mockStream as any);
    (mockCreateGzip as jest.Mock).mockReturnValue(mockStream);
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
      end: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      pipe: jest.fn(),
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
        size: 500, // Small file
      } as any);

      mockReadFile.mockResolvedValueOnce(Buffer.from('content'));

      await middleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
      expect(res.end).toHaveBeenCalled();
    });

    it('should handle large files with streaming', async () => {
      const req = createMockRequest('GET', '/large-file.txt');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        size: 2 * 1024 * 1024, // 2MB file
      } as any);

      await middleware.middleware()(req, res, next);
      expect(mockCreateReadStream).toHaveBeenCalled();
    });

    it('should handle conditional requests with If-Modified-Since', async () => {
      const lastModified = new Date();
      const req = createMockRequest('GET', '/test.txt', {
        'if-modified-since': lastModified.toUTCString()
      });
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: lastModified,
        size: 500,
      } as any);

      await middleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(304);
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
      mockPath.join.mockReturnValueOnce('/test/public/../secret.txt');
      
      await middleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(403);
      expect(res.end).toHaveBeenCalledWith('Forbidden');
    });
  });

  describe('Compression', () => {
    it('should use streaming compression for large files', async () => {
      const req = createMockRequest('GET', '/large-file.txt', {
        'accept-encoding': 'gzip'
      });
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        size: 2 * 1024 * 1024, // 2MB file
      } as any);

      await middleware.middleware()(req, res, next);
      expect(mockCreateGzip).toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding'
      }));
    });

    it('should use buffer compression for small files', async () => {
      const req = createMockRequest('GET', '/small-file.txt', {
        'accept-encoding': 'gzip'
      });
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        size: 2000, // Small file
      } as any);

      const content = Buffer.from('x'.repeat(2000));
      mockReadFile.mockResolvedValueOnce(content);
      (gzip as unknown as jest.Mock).mockImplementation((buffer, callback) => 
        callback(null, Buffer.from('compressed')));

      await middleware.middleware()(req, res, next);
      expect(gzip).toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding'
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle ENOENT with next()', async () => {
      const req = createMockRequest('GET', '/missing.txt');
      const res = createMockResponse();
      const next = jest.fn();

      const error = new Error('ENOENT');
      (error as NodeJS.ErrnoException).code = 'ENOENT';
      mockStat.mockRejectedValueOnce(error);

      await middleware.middleware()(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should handle other errors with 500', async () => {
      const req = createMockRequest('GET', '/error.txt');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockRejectedValueOnce(new Error('Unknown error'));

      await middleware.middleware()(req, res, next);
      expect(res.writeHead).toHaveBeenCalledWith(500);
      expect(res.end).toHaveBeenCalledWith('Internal Server Error');
    });

    it('should handle stream errors', async () => {
      const req = createMockRequest('GET', '/large-file.txt');
      const res = createMockResponse();
      const next = jest.fn();

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        size: 2 * 1024 * 1024,
      } as any);

      const mockStream = new Transform({
        transform(chunk, encoding, callback) {
          callback(new Error('Stream error'));
        }
      });
      mockCreateReadStream.mockReturnValueOnce(mockStream as any);

      await middleware.middleware()(req, res, next);
      // Stream error handling is done through event handlers
      mockStream.emit('error', new Error('Stream error'));
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