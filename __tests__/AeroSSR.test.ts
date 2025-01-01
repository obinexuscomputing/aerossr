// __tests__/AeroSSR.test.ts
import { AddressInfo } from 'net';
import fs from 'fs/promises';
import path from 'path';
import { IncomingMessage, ServerResponse } from 'http';
import { AeroSSR, StaticFileMiddleware } from '../src';

jest.mock('fs/promises');
jest.mock('../src/utils/logger');

describe('AeroSSR Core', () => {
  let aerossr: AeroSSR;
  let testPort: number;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    testPort = 3000 + Math.floor(Math.random() * 1000);
    aerossr = new AeroSSR({ port: testPort });

    // Mock file system
    mockFs.readFile.mockResolvedValue('<html><head></head><body></body></html>');
    mockFs.writeFile.mockResolvedValue();
    mockFs.mkdir.mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await aerossr.stop();
  });

  describe('Server Lifecycle', () => {
    it('should start the server successfully', async () => {
      const server = await aerossr.start();
      expect(server.listening).toBe(true);
      
      const address = server.address() as AddressInfo;
      expect(address.port).toBe(testPort);
    });

    it('should stop the server successfully', async () => {
      const server = await aerossr.start();
      await aerossr.stop();
      expect(server.listening).toBe(false);
    });

    it('should handle multiple stop calls gracefully', async () => {
      await aerossr.start();
      await aerossr.stop();
      await expect(aerossr.stop()).resolves.not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use default configuration values', () => {
      const defaultAero = new AeroSSR();
      expect(defaultAero.config.port).toBe(3000);
      expect(defaultAero.config.compression).toBe(true);
      expect(defaultAero.config.corsOrigins).toBe('*');
      expect(defaultAero.config.cacheMaxAge).toBe(3600);
      expect(defaultAero.config.logFilePath).toBeNull();
    });

    it('should override default configuration', () => {
      const customAero = new AeroSSR({
        port: 4000,
        compression: false,
        corsOrigins: 'http://localhost',
        cacheMaxAge: 7200,
        logFilePath: 'custom.log'
      });

      expect(customAero.config.port).toBe(4000);
      expect(customAero.config.compression).toBe(false);
      expect(customAero.config.corsOrigins).toBe('http://localhost');
      expect(customAero.config.cacheMaxAge).toBe(7200);
      expect(customAero.config.logFilePath).toBe('custom.log');
    });

    it('should use default meta tags when not provided', () => {
      const defaultAero = new AeroSSR();
      expect(defaultAero.config.defaultMeta).toEqual({
        title: 'AeroSSR App',
        description: 'Built with AeroSSR bundler',
        charset: 'UTF-8',
        viewport: 'width=device-width, initial-scale=1.0'
      });
    });
  });

  describe('Routing', () => {
    it('should handle basic routes', async () => {
      aerossr.route('/test', (req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'success' }));
      });

      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/test`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: 'success' });
    });

    it('should handle async routes', async () => {
      aerossr.route('/async', async (_req: IncomingMessage, res: ServerResponse) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'async success' }));
      });

      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/async`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: 'async success' });
    });

    it('should handle 404 for unknown routes', async () => {
      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/unknown`);
      expect(response.status).toBe(404);
    });
  });

  describe('Middleware', () => {
    it('should execute middleware in order', async () => {
      const order: number[] = [];

      aerossr.use(async (_req, _res, next) => {
        order.push(1);
        await next();
      });

      aerossr.use(async (_req, _res, next) => {
        order.push(2);
        await next();
      });

      aerossr.route('/middleware-test', (_req, res) => {
        order.push(3);
        res.writeHead(200);
        res.end();
      });

      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      await fetch(`http://localhost:${address.port}/middleware-test`);
      expect(order).toEqual([1, 2, 3]);
    });

    it('should handle middleware errors', async () => {
      aerossr.use(async () => {
        throw new Error('Middleware error');
      });

      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/any`);
      expect(response.status).toBe(500);
      const html = await response.text();
      expect(html).toContain('Middleware error');
    });

    it('should allow middleware to modify request/response', async () => {
      aerossr.use(async (_req, res, next) => {
        res.setHeader('X-Custom-Header', 'test-value');
        await next();
      });

      aerossr.route('/test', (_req, res) => {
        res.writeHead(200);
        res.end();
      });

      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/test`);
      expect(response.headers.get('x-custom-header')).toBe('test-value');
    });
  });

  describe('Error Handling', () => {
    it('should handle synchronous errors in routes', async () => {
      aerossr.route('/error', () => {
        throw new Error('Test error');
      });

      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/error`);
      const html = await response.text();

      expect(response.status).toBe(500);
      expect(html).toContain('Test error');
    });

    it('should handle asynchronous errors in routes', async () => {
      aerossr.route('/async-error', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async test error');
      });

      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/async-error`);
      const html = await response.text();

      expect(response.status).toBe(500);
      expect(html).toContain('Async test error');
    });
  });

  describe('Cache Management', () => {
    it('should handle ETag caching', async () => {
      aerossr.route('/cached', (_req: IncomingMessage, res: ServerResponse) => {
        const content = 'cached content';
        const etag = `"${Buffer.from(content).toString('base64')}"`;
        
        if (_req.headers['if-none-match'] === etag) {
          res.writeHead(304);
          res.end();
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'ETag': etag,
        });
        res.end(content);
      });

      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      // First request
      const response1 = await fetch(`http://localhost:${address.port}/cached`);
      const etag = response1.headers.get('etag');

      // Second request with ETag
      const response2 = await fetch(`http://localhost:${address.port}/cached`, {
        headers: { 'If-None-Match': etag! },
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(304);
    });

    it('should clear cache successfully', () => {
      const bundleCache = new Map();
      const templateCache = new Map();

      bundleCache.set('test', 'value');
      templateCache.set('test', 'value');

      const customAero = new AeroSSR({
        port: testPort,
        bundleCache: {
          get: (key: string) => bundleCache.get(key),
          set: (key: string, value: string) => bundleCache.set(key, value),
          clear: () => bundleCache.clear(),
        },
        templateCache: {
          get: (key: string) => templateCache.get(key),
          set: (key: string, value: string) => templateCache.set(key, value),
          clear: () => templateCache.clear(),
        },
      });

      customAero.clearCache();
      
      expect(bundleCache.size).toBe(0);
      expect(templateCache.size).toBe(0);
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/test`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost',
          'Access-Control-Request-Method': 'POST',
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    });

    it('should respect custom CORS origins', async () => {
      const customAero = new AeroSSR({
        port: testPort,
        corsOrigins: 'http://example.com'
      });

      const server = await customAero.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/test`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://example.com',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(response.headers.get('access-control-allow-origin')).toBe('http://example.com');
      await customAero.stop();
    });
  });
});