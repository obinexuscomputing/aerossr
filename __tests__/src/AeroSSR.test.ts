import { AddressInfo } from 'net';
import { IncomingMessage, ServerResponse } from 'http';
import { jest } from '@jest/globals';
import AeroSSR from '../../src/AeroSSR';
import { Logger } from '../../src/utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';

// Mock all required dependencies
jest.mock('fs/promises');
jest.mock('../src/utils/logger');
jest.mock('../src/utils/bundler');
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  constants: { W_OK: 4, R_OK: 4 },
}));
jest.mock('path');

// Test utilities
const createMockRequest = (method: string = 'GET', url: string = '/', headers = {}): IncomingMessage => {
  return {
    method,
    url,
    headers,
    socket: { remoteAddress: '127.0.0.1' }
  } as unknown as IncomingMessage;
};

const createMockResponse = (): ServerResponse => {
  return {
    writeHead: jest.fn(),
    setHeader: jest.fn(),
    end: jest.fn(),
    headersSent: false
  } as unknown as jest.Mocked<ServerResponse>;
};

describe('AeroSSR Core Tests', () => {
  let aerossr: AeroSSR;
  let mockFs: jest.Mocked<typeof fs>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    aerossr = new AeroSSR({
      port: Math.floor(3000 + Math.random() * 1000),
      logFilePath: null
    });
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.readFile.mockResolvedValue('<html><head></head><body></body></html>');
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

    it('should override default configuration with provided values', () => {
      const customAero = new AeroSSR({
        port: 4000,
        compression: false,
        corsOrigins: { origins: 'http://localhost' },
        cacheMaxAge: 7200,
        logFilePath: 'test.log'
      });

      expect(customAero.config.port).toBe(4000);
      expect(customAero.config.compression).toBe(false);
      expect(customAero.config.corsOrigins).toEqual({ origins: 'http://localhost' });
      expect(customAero.config.cacheMaxAge).toBe(7200);
      expect(customAero.config.logFilePath).toBe('test.log');
    });
  });

  describe('Middleware', () => {
    it('should execute middleware in correct order', async () => {
      const order: number[] = [];
      
      const middleware1 = async (_req: IncomingMessage, _res: ServerResponse, next: () => Promise<void>) => {
        order.push(1);
        await next();
      };
      
      const middleware2 = async (_req: IncomingMessage, _res: ServerResponse, next: () => Promise<void>) => {
        order.push(2);
        await next();
      };

      aerossr.use(middleware1);
      aerossr.use(middleware2);

      const server = await aerossr.start();
      const address = server.address() as AddressInfo;

      await fetch(`http://localhost:${address.port}/`);
      expect(order).toEqual([1, 2]);
    });

    it('should handle middleware errors', async () => {
      const errorMiddleware = async () => {
        throw new Error('Middleware error');
      };

      aerossr.use(errorMiddleware);
      const server = await aerossr.start();
      const address = server.address() as AddressInfo;

      const response = await fetch(`http://localhost:${address.port}/`);
      expect(response.status).toBe(500);
    });
  });

});

describe('Logger Tests', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;
  const mockFsSync = require('fs') as jest.Mocked<typeof import('fs')>;
  const testLogPath = '/test/logs/test.log';
  const testLogDir = '/test/logs';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.dirname.mockReturnValue(testLogDir);
    mockFsSync.existsSync.mockReturnValue(true);
    mockFsSync.mkdirSync.mockReturnValue(undefined);
    mockFs.appendFile.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should create logger without file path', () => {
      const logger = new Logger();
      expect(logger).toBeDefined();
      expect(logger.getLogPath()).toBeNull();
    });

    it('should create logger with valid file path', () => {
      const logger = new Logger({ logFilePath: testLogPath });
      expect(logger.getLogPath()).toBe(testLogPath);
    });

    it('should create log directory if it does not exist', () => {
      mockFsSync.existsSync.mockReturnValue(false);
      new Logger({ logFilePath: testLogPath });
      expect(mockFsSync.mkdirSync).toHaveBeenCalledWith(testLogDir, { recursive: true });
    });
  });

});

// Integration Tests
describe('Integration Tests', () => {
  let aerossr: AeroSSR;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ logFilePath: null });
    aerossr = new AeroSSR({ 
      port: Math.floor(3000 + Math.random() * 1000),
      logFilePath: null,
      logger 
    });
  });

  afterEach(async () => {
    await aerossr.stop();
  });

  it('should log requests through the server', async () => {
    const logSpy = jest.spyOn(logger, 'logRequest');
    
    const server = await aerossr.start();
    const address = server.address() as AddressInfo;

    await fetch(`http://localhost:${address.port}/test`);
    
    expect(logSpy).toHaveBeenCalled();
  });

  it('should handle errors and log them', async () => {
    const logSpy = jest.spyOn(logger, 'log');
    
    aerossr.route('/error', async () => {
      throw new Error('Test error');
    });

    const server = await aerossr.start();
    const address = server.address() as AddressInfo;

    await fetch(`http://localhost:${address.port}/error`);
    
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Test error'));
  });

  it('should use logger for server lifecycle events', async () => {
    const logSpy = jest.spyOn(logger, 'log');
    
    await aerossr.start();
    await aerossr.stop();
    
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('running on port'));
    expect(logSpy).toHaveBeenCalledWith('Server stopped');
  });
});

describe('AeroSSR Core', () => {
  let aerossr: AeroSSR;
  
  beforeEach(() => {
    aerossr = new AeroSSR();
  });

  afterEach(async () => {
    await aerossr.stop();
  });

  describe('Configuration', () => {
    it('should initialize with default config', () => {
      expect(aerossr.config.port).toBe(3000);
      expect(aerossr.config.compression).toBe(true);
    });

    it('should override defaults with custom config', () => {
      const customAero = new AeroSSR({
        port: 4000,
        compression: false
      });
      expect(customAero.config.port).toBe(4000);
      expect(customAero.config.compression).toBe(false);
    });
  });

  describe('Server Lifecycle', () => {
    it('should start and stop server', async () => {
      const server = await aerossr.start();
      expect(server.listening).toBe(true);
      await aerossr.stop();
      expect(server.listening).toBe(false);
    });

    it('should handle start errors', async () => {
      // Start server on same port to cause conflict
      const server1 = new AeroSSR({ port: 5000 });
      const server2 = new AeroSSR({ port: 5000 });
      
      await server1.start();
      await expect(server2.start()).rejects.toThrow();
      await server1.stop();
    });
  });

  describe('Request Handling', () => {
    it('should handle GET requests', async () => {
      aerossr.route('/test', async (req, res) => {
        res.writeHead(200);
        res.end('success');
      });

      const server = await aerossr.start();
      const address = server.address() as AddressInfo | null;
      if (address) {
        const response = await fetch(`http://localhost:${address.port}/test`);
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('success');
      } else {
        throw new Error('Server address is null');
      }
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('success');
    });

    it('should handle 404s', async () => {
      const server = await aerossr.start();
      const response = await fetch(`http://localhost:${server.address().port}/notfound`);
      expect(response.status).toBe(404);
    });

    it('should execute middleware chain', async () => {
      const order: number[] = [];
      
      aerossr.use(async (req, res, next) => {
        order.push(1);
        await next();
      });

      aerossr.use(async (req, res, next) => {
        order.push(2);
        await next();
      });

      const server = await aerossr.start();
      await fetch(`http://localhost:${server.address().port}/`);
      expect(order).toEqual([1, 2]);
    });
  });
});