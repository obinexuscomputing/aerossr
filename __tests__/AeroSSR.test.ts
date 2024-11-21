// src/__tests__/AeroSSR.test.ts
import { createServer } from 'http';
import { AddressInfo } from 'net';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import AeroSSR from '../AeroSSR';
import { StaticFileMiddleware } from '../utils/staticFileMiddleware';

jest.mock('fs/promises');
jest.mock('../utils/logger');

describe('AeroSSR Core', () => {
  let aero: AeroSSR;
  let testPort: number;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    testPort = Math.floor(Math.random() * 10000) + 50000; // Random port between 50000-60000
    aero = new AeroSSR({ port: testPort });
    
    // Mock file system
    mockFs.readFile.mockResolvedValue('<html><head></head><body></body></html>');
    mockFs.writeFile.mockResolvedValue();
    mockFs.mkdir.mockResolvedValue();
  });

  afterEach(async () => {
    await aero.stop();
    jest.clearAllMocks();
  });

  describe('Server Lifecycle', () => {
    test('should start and stop server successfully', async () => {
      const server = await aero.start();
      expect(server.listening).toBe(true);
      
      const address = server.address() as AddressInfo;
      expect(address.port).toBe(testPort);

      await aero.stop();
      expect(server.listening).toBe(false);
    });

    test('should handle multiple stop calls gracefully', async () => {
      await aero.start();
      await aero.stop();
      await expect(aero.stop()).resolves.not.toThrow();
    });
  });

  describe('Routing', () => {
    test('should handle basic routes', async () => {
      aero.route('/test', (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'success' }));
      });

      const server = await aero.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/test`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: 'success' });
    });

    test('should handle async routes', async () => {
      aero.route('/async', async (req, res) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'async success' }));
      });

      const server = await aero.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/async`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: 'async success' });
    });

    test('should handle 404 for unknown routes', async () => {
      const server = await aero.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/unknown`);
      expect(response.status).toBe(404);
    });
  });

  describe('Middleware', () => {
    test('should execute middleware in order', async () => {
      const order: number[] = [];

      aero.use(async (req, res, next) => {
        order.push(1);
        await next();
      });

      aero.use(async (req, res, next) => {
        order.push(2);
        await next();
      });

      aero.route('/middleware-test', (req, res) => {
        order.push(3);
        res.writeHead(200);
        res.end();
      });

      const server = await aero.start();
      const address = server.address() as AddressInfo;
      
      await fetch(`http://localhost:${address.port}/middleware-test`);
      expect(order).toEqual([1, 2, 3]);
    });

    test('should handle middleware errors', async () => {
      aero.use(async () => {
        throw new Error('Middleware error');
      });

      const server = await aero.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/any`);
      expect(response.status).toBe(500);
    });
  });

  describe('Static Files', () => {
    test('should serve static files', async () => {
      const staticMiddleware = new StaticFileMiddleware({
        root: path.join(__dirname, 'public'),
      });

      aero.use(staticMiddleware.middleware());

      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
        size: 1000,
      } as any);

      mockFs.readFile.mockResolvedValue(Buffer.from('static file content'));

      const server = await aero.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/test.txt`);
      const content = await response.text();

      expect(response.status).toBe(200);
      expect(content).toBe('static file content');
    });
  });

  describe('CORS', () => {
    test('should handle CORS preflight requests', async () => {
      const server = await aero.start();
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
  });

  describe('Error Handling', () => {
    test('should handle synchronous errors in routes', async () => {
      aero.route('/error', () => {
        throw new Error('Test error');
      });

      const server = await aero.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/error`);
      const html = await response.text();

      expect(response.status).toBe(500);
      expect(html).toContain('Test error');
    });

    test('should handle asynchronous errors in routes', async () => {
      aero.route('/async-error', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Async test error');
      });

      const server = await aero.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/async-error`);
      const html = await response.text();

      expect(response.status).toBe(500);
      expect(html).toContain('Async test error');
    });
  });

  describe('Caching', () => {
    test('should handle ETag caching', async () => {
      aero.route('/cached', (req, res) => {
        const content = 'cached content';
        const etag = `"${Buffer.from(content).toString('base64')}"`;
        
        if (req.headers['if-none-match'] === etag) {
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

      const server = await aero.start();
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

    test('should clear cache', async () => {
      const bundleCache = new Map();
      const templateCache = new Map();

      bundleCache.set('test', 'value');
      templateCache.set('test', 'value');

      aero = new AeroSSR({
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

      aero.clearCache();
      
      expect(bundleCache.size).toBe(0);
      expect(templateCache.size).toBe(0);
    });
  });

  describe('Configuration', () => {
    test('should use default configuration values', () => {
      const defaultAero = new AeroSSR();
      expect(defaultAero['config'].port).toBe(3000);
      expect(defaultAero['config'].compression).toBe(true);
      expect(defaultAero['config'].corsOrigins).toBe('*');
    });

    test('should override default configuration', () => {
      const customAero = new AeroSSR({
        port: 4000,
        compression: false,
        corsOrigins: 'http://localhost',
      });

      expect(customAero['config'].port).toBe(4000);
      expect(customAero['config'].compression).toBe(false);
      expect(customAero['config'].corsOrigins).toBe('http://localhost');
    });
  });
});