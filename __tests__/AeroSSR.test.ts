import { AddressInfo } from 'net';
import fs from 'fs/promises';
import path from 'path';
import { IncomingMessage, ServerResponse } from 'http';
import { AeroSSR, StaticFileMiddleware } from '../src';
import type { Middleware, RouteHandler } from '../src/types';

jest.mock('fs/promises');
jest.mock('../src/utils/logger');

describe('AeroSSR Core', () => {
  let aerossr: AeroSSR;
  let testPort: number;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    testPort = 3000 + Math.floor(Math.random() * 1000);
    aerossr = new AeroSSR({ port: testPort });
    mockFs.readFile.mockResolvedValue('<html><head></head><body></body></html>');
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await aerossr.stop();
  });

  describe('Configuration', () => {
    it('should use default configuration values', () => {
      const defaultAero = new AeroSSR();
      expect(defaultAero.config.port).toBe(3000);
      expect(defaultAero.config.compression).toBe(true);
      expect(defaultAero.config.corsOrigins).toEqual({ origins: '*' });
      expect(defaultAero.config.cacheMaxAge).toBe(3600);
      expect(defaultAero.config.logFilePath).toBeNull();
    });

    it('should override default configuration', () => {
      const customAero = new AeroSSR({
        port: 4000,
        compression: false,
        corsOrigins: { origins: 'http://localhost' },
        cacheMaxAge: 7200,
        logFilePath: 'custom.log'
      });

      expect(customAero.config.port).toBe(4000);
      expect(customAero.config.compression).toBe(false);
      expect(customAero.config.corsOrigins).toEqual({ origins: 'http://localhost' });
      expect(customAero.config.cacheMaxAge).toBe(7200);
      expect(customAero.config.logFilePath).toBe('custom.log');
    });
  });

  describe('Routing', () => {
    it('should handle basic routes', async () => {
      const handler: RouteHandler = async (req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'success' }));
      };

      aerossr.route('/test', handler);
      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/test`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: 'success' });
    });

    it('should handle middleware correctly', async () => {
      const order: number[] = [];

      const firstMiddleware: Middleware = async (_req: IncomingMessage, _res: ServerResponse, next: () => Promise<void>) => {
        order.push(1);
        await next();
      };

      const secondMiddleware: Middleware = async (_req: IncomingMessage, _res: ServerResponse, next: () => Promise<void>) => {
        order.push(2);
        await next();
      };

      const handler: RouteHandler = async (_req: IncomingMessage, res: ServerResponse) => {
        order.push(3);
        res.writeHead(200);
        res.end();
      };

      aerossr.use(firstMiddleware);
      aerossr.use(secondMiddleware);
      aerossr.route('/middleware-test', handler);

      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      await fetch(`http://localhost:${address.port}/middleware-test`);
      expect(order).toEqual([1, 2, 3]);
    });

    it('should handle response headers', async () => {
      const handler: RouteHandler = async (_req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, {
          'X-Custom-Header': 'test-value'
        });
        res.end();
      };

      aerossr.route('/test', handler);
      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/test`);
      expect(response.headers.get('x-custom-header')).toBe('test-value');
    });

    it('should handle caching with ETags', async () => {
      const handler: RouteHandler = async (_req: IncomingMessage, res: ServerResponse) => {
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
      };

      aerossr.route('/cached', handler);
      const server = await aerossr.start();
      const address = server.address() as AddressInfo;
      
      const response1 = await fetch(`http://localhost:${address.port}/cached`);
      const etag = response1.headers.get('etag');

      const response2 = await fetch(`http://localhost:${address.port}/cached`, {
        headers: { 'If-None-Match': etag! }
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(304);
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const customAero = new AeroSSR({
        port: testPort,
        corsOrigins: { origins: 'http://example.com' }
      });

      const server = await customAero.start();
      const address = server.address() as AddressInfo;
      
      const response = await fetch(`http://localhost:${address.port}/test`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://example.com',
          'Access-Control-Request-Method': 'GET'
        }
      });

      expect(response.headers.get('access-control-allow-origin')).toBe('http://example.com');
      await customAero.stop();
    });
  });
});