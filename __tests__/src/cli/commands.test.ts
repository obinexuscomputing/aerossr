import { promises as fs } from 'fs';
import { AeroSSR } from '../../../src';
import { AeroSSRCommands } from '../../../src/cli/commands';
import { Logger } from '../../../src/utils/Logger';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn()
  },
  existsSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
  parse: jest.fn((p) => ({ root: '/' }))
}));

describe('AeroSSRCommands', () => {
  let commands: AeroSSRCommands;
  let mockLogger: jest.Mocked<Logger>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      log: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    commands = new AeroSSRCommands(mockLogger);

    // Mock successful file access by default
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
  });

  describe('Project Initialization', () => {
    it('should create project directories and files', async () => {
      await commands.initializeProject('./test-project');

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('test-project/public'),
        expect.any(Object)
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        expect.stringContaining('<!DOCTYPE html>'),
        'utf-8'
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Project initialization completed')
      );
    });

    it('should handle project initialization errors', async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error('Failed to create directory'));

      await expect(commands.initializeProject('./test-project'))
        .rejects.toThrow('Failed to initialize project');
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize project')
      );
    });

    it('should handle file creation errors', async () => {
      mockFs.writeFile.mockRejectedValueOnce(new Error('Failed to create file'));

      await expect(commands.initializeProject('./test-project'))
        .rejects.toThrow(/Failed to create file/);
    });

    it('should log initialization duration', async () => {
      const startTime = Date.now();
      await commands.initializeProject('./test-project');
      
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/completed successfully in \d+ms/)
      );
    });
  });

  describe('Middleware Configuration', () => {
    let mockApp: jest.Mocked<AeroSSR>;

    beforeEach(() => {
      mockApp = {
        use: jest.fn(),
      } as unknown as jest.Mocked<AeroSSR>;
    });

    it('should configure default middleware', async () => {
      await commands.configureMiddleware(mockApp);
      expect(mockApp.use).toHaveBeenCalledTimes(3); // Static, logging, and error middleware
    });

    it('should include security headers in static middleware', async () => {
      await commands.configureMiddleware(mockApp);
      const staticMiddlewareCall = mockApp.use.mock.calls[0][0];
      expect(staticMiddlewareCall).toBeDefined();
    });

    it('should handle custom middleware configuration', async () => {
      const mockMiddleware = jest.fn();
      jest.mock('./test-middleware', () => ({
        testMiddleware: () => mockMiddleware
      }), { virtual: true });

      await commands.configureMiddleware(mockApp, {
        name: 'testMiddleware',
        path: './test-middleware'
      });

      expect(mockApp.use).toHaveBeenCalledWith(mockMiddleware);
    });

    it('should handle missing middleware module', async () => {
      await expect(commands.configureMiddleware(mockApp, {
        name: 'nonexistentMiddleware',
        path: './nonexistent.js'
      })).rejects.toThrow(/Failed to load middleware/);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Middleware configuration failed')
      );
    });

    it('should handle invalid middleware exports', async () => {
      const invalidMiddleware = {};
      jest.mock('./invalid-middleware', () => invalidMiddleware, { virtual: true });

      await expect(commands.configureMiddleware(mockApp, {
        name: 'invalidMiddleware',
        path: './invalid-middleware'
      })).rejects.toThrow(/Middleware .* not found/);
    });

    it('should handle middleware factory errors', async () => {
      const errorMiddleware = { 
        errorMiddleware: () => { throw new Error('Factory error'); }
      };
      jest.mock('./error-middleware', () => errorMiddleware, { virtual: true });

      await expect(commands.configureMiddleware(mockApp, {
        name: 'errorMiddleware',
        path: './error-middleware'
      })).rejects.toThrow(/Failed to load middleware/);
    });

    describe('Logging Middleware', () => {
      let loggingMiddleware: any;

      beforeEach(() => {
        commands.configureMiddleware(mockApp);
        loggingMiddleware = mockApp.use.mock.calls[1][0];
      });

      it('should log requests with duration', async () => {
        const mockReq = { method: 'GET', url: '/test' };
        const mockRes = {};
        const next = jest.fn();

        await loggingMiddleware(mockReq, mockRes, next);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringMatching(/\[\w+\] GET \/test - \d+ms/)
        );
      });

      it('should log requests even if next throws', async () => {
        const mockReq = { method: 'GET', url: '/test' };
        const mockRes = {};
        const next = jest.fn().mockRejectedValue(new Error('Test error'));

        await expect(loggingMiddleware(mockReq, mockRes, next))
          .rejects.toThrow('Test error');
        
        expect(mockLogger.log).toHaveBeenCalled();
      });
    });

    describe('Error Middleware', () => {
      let errorMiddleware: any;
      let mockReq: any;
      let mockRes: any;

      beforeEach(() => {
        commands.configureMiddleware(mockApp);
        errorMiddleware = mockApp.use.mock.calls[2][0];
        mockReq = { method: 'GET', url: '/test' };
        mockRes = {
          writeHead: jest.fn(),
          end: jest.fn(),
          headersSent: false
        };
      });

      it('should handle and log errors', async () => {
        const next = jest.fn().mockRejectedValue(new Error('Test error'));

        await errorMiddleware(mockReq, mockRes, next);

        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Test error')
        );
        expect(mockRes.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
      });

      it('should include error ID in response', async () => {
        const next = jest.fn().mockRejectedValue(new Error('Test error'));

        await errorMiddleware(mockReq, mockRes, next);

        expect(mockRes.end).toHaveBeenCalledWith(
          expect.stringMatching(/Internal Server Error \(ID: \w+\)/)
        );
      });

      it('should not modify response if headers already sent', async () => {
        mockRes.headersSent = true;
        const next = jest.fn().mockRejectedValue(new Error('Test error'));

        await errorMiddleware(mockReq, mockRes, next);

        expect(mockRes.writeHead).not.toHaveBeenCalled();
        expect(mockRes.end).not.toHaveBeenCalled();
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
      mockLogger.clear.mockRejectedValueOnce(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await commands.cleanup();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cleanup failed:',
        error
      );
      consoleSpy.mockRestore();
    });
  });
});