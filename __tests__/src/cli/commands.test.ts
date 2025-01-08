import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { IncomingMessage, ServerResponse } from 'http';
import { AeroSSRCommands } from '../../../src/cli/commands';
import { AeroSSR } from '../../../src/AeroSSR';
import { Logger } from '../../../src/utils/Logger';
import { StaticFileMiddleware } from '../../../src/middlewares/StaticFileMiddleware';
import { Middleware } from '../../../src';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn()
  }
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((dir: string) => dir.split('/').slice(0, -1).join('/')),
  parse: jest.fn(() => ({ root: '/' }))
}));

jest.mock('../../../src/middlewares/StaticFileMiddleware');

describe('AeroSSRCommands', () => {
  let commands: AeroSSRCommands;
  let mockLogger: jest.Mocked<Logger>;
  let mockFs: jest.Mocked<typeof fs>;
  const originalConsoleError = console.error;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      clear: jest.fn(),
      logRequest: jest.fn()
    } as any;

    mockFs = fs as jest.Mocked<typeof fs>;
    commands = new AeroSSRCommands(mockLogger);

    // Silence console.error during tests
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.error = originalConsoleError;
  });

  describe('Project Initialization', () => {
    it('should create project directories and files', async () => {
      mockFs.access.mockResolvedValue(undefined);
      
      await commands.initializeProject('./test-project');

      // Verify directories created
      const mkdirCalls = mockFs.mkdir.mock.calls.map(call => call[0]);
      expect(mkdirCalls).toEqual(expect.arrayContaining([
        'test-project/public',
        'test-project/logs',
        'test-project/config',
        'test-project/public/styles',
        'test-project/public/dist'
      ]));

      // Verify files created with correct content
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'test-project/public/index.html',
        expect.stringContaining('<!DOCTYPE html>'),
        'utf-8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'test-project/public/styles/main.css',
        expect.stringContaining(':root'),
        'utf-8'
      );
    });

    it('should handle project initialization errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(commands.initializeProject('./test-project'))
        .rejects.toThrow('Failed to initialize project');
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize project')
      );
    });

    it('should handle file creation errors', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error('Write error'));

      await expect(commands.initializeProject('./test-project'))
        .rejects.toThrow('Failed to create file');
    });

    it('should log initialization duration', async () => {
      mockFs.access.mockResolvedValue(undefined);
      await commands.initializeProject('./test-project');

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/completed successfully in \d+ms/)
      );
    });
  });

  describe('Middleware Configuration', () => {
    let mockApp: jest.Mocked<AeroSSR>;
    let mockReq: jest.Mocked<IncomingMessage>;
    let mockRes: jest.Mocked<ServerResponse>;
    let mockMiddlewareInstance: jest.Mock;

    beforeEach(() => {
      mockApp = {
        use: jest.fn()
      } as any;

      mockReq = {
        method: 'GET',
        url: '/test',
        headers: {}
      } as any;

      mockRes = {
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: false
      } as any;

      mockMiddlewareInstance = jest.fn();
      (StaticFileMiddleware as jest.Mock).mockImplementation(() => ({
        middleware: () => mockMiddlewareInstance
      }));
    });

    it('should configure default middleware', async () => {
      await commands.configureMiddleware(mockApp);
      
      expect(mockApp.use).toHaveBeenCalledTimes(3);
      expect(StaticFileMiddleware).toHaveBeenCalledWith(expect.objectContaining({
        root: 'public',
        dotFiles: 'deny',
        compression: true,
        etag: true
      }));
      expect(mockApp.use).toHaveBeenCalledWith(mockMiddlewareInstance);
    });

    it('should include security headers in static middleware', async () => {
      await commands.configureMiddleware(mockApp);
      
      expect(StaticFileMiddleware).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'Strict-Transport-Security': expect.any(String)
        })
      }));
    });

    it('should handle custom middleware configuration', async () => {
      mockFs.access.mockResolvedValue(undefined);
      const mockCustomMiddleware = jest.fn(() => () => Promise.resolve());
      jest.mock('./test-middleware.js', () => ({
        testMiddleware: mockCustomMiddleware
      }), { virtual: true });

      await commands.configureMiddleware(mockApp, {
        name: 'testMiddleware',
        path: './test-middleware.js',
        options: { test: true }
      });

      expect(mockCustomMiddleware).toHaveBeenCalledWith({ test: true });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully configured middleware: testMiddleware')
      );
    });

    it('should handle missing middleware module', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      await expect(commands.configureMiddleware(mockApp, {
        name: 'nonexistentMiddleware',
        path: './nonexistent.js'
      })).rejects.toThrow('Failed to load middleware');

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Middleware configuration failed')
      );
    });

    it('should handle invalid middleware exports', async () => {
      mockFs.access.mockResolvedValue(undefined);
      jest.mock('./invalid-middleware.js', () => ({
        invalidMiddleware: 'not a function'
      }), { virtual: true });

      await expect(commands.configureMiddleware(mockApp, {
        name: 'invalidMiddleware',
        path: './invalid-middleware.js'
      })).rejects.toThrow('Middleware invalidMiddleware not found');
    });

    it('should handle middleware factory errors', async () => {
      mockFs.access.mockResolvedValue(undefined);
      jest.mock('./error-middleware.js', () => ({
        errorMiddleware: () => {
          throw new Error('Factory error');
        }
      }), { virtual: true });

      await expect(commands.configureMiddleware(mockApp, {
        name: 'errorMiddleware',
        path: './error-middleware.js'
      })).rejects.toThrow('Failed to load middleware');
    });

    describe('Logging Middleware', () => {
      it('should log requests with duration', async () => {
        const loggingMiddleware = await getLoggingMiddleware();
        const next = jest.fn().mockResolvedValue(undefined);
        
        await loggingMiddleware(mockReq, mockRes, next);
        
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(/\[\w+\] GET \/test - \d+ms/)
        );
      });

      it('should log requests even if next throws', async () => {
        const loggingMiddleware = await getLoggingMiddleware();
        const next = jest.fn().mockRejectedValue(new Error('Test error'));
        
        await expect(loggingMiddleware(mockReq, mockRes, next)).rejects.toThrow('Test error');
        expect(mockLogger.log).toHaveBeenCalled();
      });
    });

    describe('Error Middleware', () => {
      it('should handle and log errors', async () => {
        const errorMiddleware = await getErrorMiddleware();
        const next = jest.fn().mockRejectedValue(new Error('Test error'));
        
        await errorMiddleware(mockReq, mockRes, next);
        
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(/\[\w+\] Server error:/)
        );
        expect(mockRes.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
        expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining('Internal Server Error'));
      });

      it('should include error ID in response', async () => {
        const errorMiddleware = await getErrorMiddleware();
        const next = jest.fn().mockRejectedValue(new Error('Test error'));
        
        await errorMiddleware(mockReq, mockRes, next);
        
        expect(mockRes.end).toHaveBeenCalledWith(
          expect.stringMatching(/Internal Server Error \(ID: \w+\)/)
        );
      });

      it('should not modify response if headers already sent', async () => {
        mockRes.headersSent = true;
        const errorMiddleware = await getErrorMiddleware();
        const next = jest.fn().mockRejectedValue(new Error('Test error'));
        
        await errorMiddleware(mockReq, mockRes, next);
        
        expect(mockRes.writeHead).not.toHaveBeenCalled();
        expect(mockRes.end).not.toBeCalled();
      });
    });
  });

  describe('Cleanup', () => {
    it('should clear logs during cleanup', async () => {
      await commands.cleanup();
      expect(mockLogger.clear).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const error = new Error('Cleanup error');
      mockLogger.clear.mockRejectedValue(error);
      
      await commands.cleanup();
      
      expect(console.error).toHaveBeenCalledWith(
        'Cleanup failed:',
        error
      );
    });
  });

  // Helper functions
  async function getLoggingMiddleware(): Promise<Middleware> {
    let loggingMiddleware: Middleware | undefined;
    await commands.configureMiddleware({
      use: (middleware: Middleware) => {
        if (!loggingMiddleware) loggingMiddleware = middleware;
      }
    } as any);
    return loggingMiddleware!;
  }

  async function getErrorMiddleware(): Promise<Middleware> {
    let errorMiddleware: Middleware | undefined;
    await commands.configureMiddleware({
      use: (middleware: Middleware) => {
        errorMiddleware = middleware;
      }
    } as any);
    return errorMiddleware!;
  }
});