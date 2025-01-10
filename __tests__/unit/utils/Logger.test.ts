import { promises as fs } from 'fs';
import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Logger } from '../../../src/utils/logger';
import { IncomingMessage } from 'http';

jest.mock('fs', () => ({
  promises: {
    appendFile: jest.fn(),
    writeFile: jest.fn(),
    stat: jest.fn(),
    rename: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  dirname: jest.fn(),
}));

describe('Logger', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;
  const testLogDir = '/test/logs';
  const consoleSpy = jest.spyOn(console, 'log');
  const consoleErrorSpy = jest.spyOn(console, 'error');

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.dirname.mockReturnValue(testLogDir);
    (existsSync as jest.Mock).mockReturnValue(true);
    (mkdirSync as jest.Mock).mockReturnValue(undefined);
    mockFs.appendFile.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 1000 } as any);
    mockFs.rename.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('should create logger without file path', () => {
      const logger = new Logger();
      expect(logger).toBeDefined();
      expect(logger.getLogPath()).toBeNull();
    });

    it('should create logger with valid file path', () => {
      const logPath = '/test/logs/app.log';
      const logger = new Logger({ logFilePath: logPath });
      expect(logger).toBeDefined();
      expect(logger.getLogPath()).toBe(logPath);
    });

    it('should handle string constructor argument', () => {
      const logPath = '/test/logs/app.log';
      const logger = new Logger(logPath);
      expect(logger.getLogPath()).toBe(logPath);
    });

    it('should create log directory if it does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      const logger = new Logger('/test/logs/app.log');
      expect(mkdirSync).toHaveBeenCalledWith(testLogDir, { recursive: true });
    });

    it('should handle directory creation errors', () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => new Logger('/test/logs/app.log')).toThrow('Permission denied');
    });
  });

  describe('Log Levels', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger({ logFilePath: '/test/logs/app.log', logLevel: 'info' });
    });

    it('should respect log level hierarchy', async () => {
      await logger.debug('Debug message');
      await logger.info('Info message');
      await logger.warn('Warning message');
      await logger.error('Error message');

      expect(mockFs.appendFile).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Debug message')
      );
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Info message')
      );
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Warning message')
      );
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Error message')
      );
    });

    it('should include log level in formatted message', async () => {
      await logger.error('Test error');
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('[ERROR]')
      );
    });
  });

  describe('Formatting', () => {
    it('should format messages in text format', async () => {
      const logger = new Logger({ format: 'text' });
      await logger.log('Test message');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*\] \[INFO\] Test message/)
      );
    });

    it('should format messages in JSON format', async () => {
      const logger = new Logger({ format: 'json' });
      await logger.log('Test message');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/"timestamp":.*"level":"info".*"message":"Test message"/)
      );
    });
  });

  describe('File Operations', () => {
    it('should handle file write errors', async () => {
      mockFs.appendFile.mockRejectedValue(new Error('Write error'));
      const logger = new Logger({ logFilePath: '/test/logs/app.log' });

      await expect(logger.log('Test message')).rejects.toThrow('Write error');
    });

    it('should rotate log files when size limit is reached', async () => {
      mockFs.stat.mockResolvedValue({ size: 11 * 1024 * 1024 } as any);
      const logger = new Logger({
        logFilePath: '/test/logs/app.log',
        maxFileSize: 10 * 1024 * 1024,
        maxFiles: 3
      });

      await logger.log('Test message');

      expect(mockFs.rename).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle rotation errors gracefully', async () => {
      mockFs.stat.mockRejectedValue(new Error('Stat error'));
      const logger = new Logger({ logFilePath: '/test/logs/app.log' });

      await logger.log('Test message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check log rotation')
      );
    });
  });

  describe('Request Logging', () => {
    it('should log request details', async () => {
      const logger = new Logger();
      const req = {
        method: 'GET',
        url: '/api/test',
        headers: { 'user-agent': 'test-agent' }
      } as IncomingMessage;

      await logger.logRequest(req);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/test - test-agent')
      );
    });

    it('should handle missing request properties', async () => {
      const logger = new Logger();
      const req = { headers: {} } as IncomingMessage;

      await logger.logRequest(req);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('undefined undefined - unknown')
      );
    });
  });

  describe('Error Logging', () => {
    it('should log error with stack trace', async () => {
      const logger = new Logger();
      const error = new Error('Test error');

      await logger.logError(error);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error: Test error')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Stack:')
      );
    });
  });

  describe('Clear Operation', () => {
    it('should clear log file', async () => {
      const logger = new Logger({ logFilePath: '/test/logs/app.log' });
      await logger.clear();
      
      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/logs/app.log', '');
    });

    it('should handle clear errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Clear error'));
      const logger = new Logger({ logFilePath: '/test/logs/app.log' });

      await expect(logger.clear()).rejects.toThrow('Clear error');
    });

    it('should not attempt to clear if no file path', async () => {
      const logger = new Logger();
      await logger.clear();
      
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Methods', () => {
    it('should provide level-specific logging methods', async () => {
      const logger = new Logger();
      
      await logger.debug('Debug');
      await logger.info('Info');
      await logger.warn('Warn');
      await logger.error('Error');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] Debug'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO] Info'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN] Warn'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR] Error'));
    });
  });
});