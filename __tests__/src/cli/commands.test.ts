// __tests__/cli/commands.test.ts
import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { IncomingMessage, ServerResponse } from 'http';
import { AeroSSRCommands } from '../../../src/cli/commands';
import { AeroSSR } from '../../../src/AeroSSR';
import { Logger } from '../../../src/utils/Logger';

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

describe('AeroSSRCommands', () => {
  let commands: AeroSSRCommands;
  let mockLogger: jest.Mocked<Logger>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      clear: jest.fn(),
      logRequest: jest.fn()
    } as any;

    commands = new AeroSSRCommands(mockLogger);
    jest.clearAllMocks();
  });

  describe('Project Initialization', () => {
    it('should create project directories and files', async () => {
      mockFs.access.mockResolvedValue(undefined);
      
      await commands.initializeProject('./test-project');

      // Verify directories created
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('public'),
        expect.any(Object)
      );
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        expect.any(Object)
      );

      // Verify files created
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        expect.stringContaining('<!DOCTYPE html>'),
        'utf-8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('main.css'),
        expect.stringContaining('body'),
        'utf-8'
      );
    });

    it('should handle project initialization errors', async () => {
      const error = new Error('Permission denied');
      mockFs.mkdir.mockRejectedValue(error);

      await expect(commands.initializeProject('./test-project'))
        .rejects.toThrow('Failed to initialize project');
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize project')
      );
    });
  });

  describe('Middleware Configuration', () => {
    let mockApp: jest.Mocked<AeroSSR>;
    let mockReq: jest.Mocked<IncomingMessage>;
    let mockRes: jest.Mocked<ServerResponse>;

    beforeEach(() => {
      mockApp = {
        use: jest.fn()
      } as any;

      mockReq = {
        method: 'GET',
        url: '/test'
      } as any;

      mockRes = {
        writeHead: jest.fn(),
        end: jest.fn(),
        headersSent: false
      } as any;
    });

    it('should configure default middleware', async () => {
      await commands.configureMiddleware(mockApp);
      expect(mockApp.use).toHaveBeenCalledTimes(3); // Static, logging, error middleware
    });

    it('should handle custom middleware configuration', async () => {
      mockFs.access.mockResolvedValue(undefined);
      const mockMiddleware = jest.fn();
      jest.mock('./test-middleware.js', () => ({
        testMiddleware: () => mockMiddleware
      }), { virtual: true });

      await commands.configureMiddleware(mockApp, {
        name: 'testMiddleware',
        path: './test-middleware.js'
      });

      expect(mockApp.use).toHaveBeenCalledWith(mockMiddleware);
    });

    it('should handle middleware loading errors', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      await expect(commands.configureMiddleware(mockApp, {
        name: 'nonexistentMiddleware',
        path: './nonexistent.js'
      })).rejects.toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Middleware configuration failed')
      );
    });

    it('should handle runtime middleware errors', async () => {
      const error = new Error('Runtime error');
      const middleware = await commands['createErrorMiddleware']();
      
      await middleware(mockReq, mockRes, async () => { throw error; });

      expect(mockRes.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
      expect(mockRes.end).toHaveBeenCalledWith('Internal Server Error');
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Server error')
      );
    });
  });

  describe('Cleanup', () => {
    it('should clear logs during cleanup', async () => {
      await commands.cleanup();
      expect(mockLogger.clear).toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      const error = new Error('Cleanup error');
      mockLogger.clear.mockRejectedValue(error);
      
      const consoleSpy = jest.spyOn(console, 'error');
      await commands.cleanup();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Cleanup failed:',
        error
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete project setup flow', async () => {
      mockFs.access.mockResolvedValue(undefined);
      
      // Initialize project
      await commands.initializeProject('./test-project');
      
      // Configure middleware
      const app = new AeroSSR();
      await commands.configureMiddleware(app);

      // Cleanup
      await commands.cleanup();

      // Verify all steps completed
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockLogger.clear).toHaveBeenCalled();
    });
  });
});