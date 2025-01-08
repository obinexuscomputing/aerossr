import { promises as fs } from 'fs';
import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Logger } from '../../../src/utils/logger';
import { IncomingMessage } from 'http';

jest.mock('fs', () => ({
  promises: {
    appendFile: jest.fn(),
    writeFile: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.dirname.mockReturnValue(testLogDir);
    (existsSync as jest.Mock).mockReturnValue(true);
    (mkdirSync as jest.Mock).mockReturnValue(undefined);
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
      const logPath = '/test/logs/app.log';
      const logger = new Logger({ logFilePath: logPath });
      expect(logger).toBeDefined();
      expect(logger.getLogPath()).toBe(logPath);
    });

    it('should create log directory if it does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      const logger = new Logger('/test/logs/app.log');
      expect(mkdirSync).toHaveBeenCalledWith(testLogDir, { recursive: true });
    });

    it('should handle directory creation errors gracefully', () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (mkdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => new Logger('/test/logs/app.log')).toThrow('Permission denied');
    });
  });

  describe('Logging Operations', () => {
    it('should log to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const logger = new Logger();

      await logger.log('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test message'));
      consoleSpy.mockRestore();
    });

    it('should format messages with timestamp', () => {
      const logger = new Logger();
      const consoleSpy = jest.spyOn(console, 'log');
      void logger.log('test');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      );
    });

    it('should log to file when path provided', async () => {
      const logger = new Logger({ logFilePath: '/test/logs/app.log' });
      await logger.log('File log message');

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        '/test/logs/app.log',
        expect.stringContaining('File log message')
      );
    });

    it('should handle file write errors gracefully', async () => {
      mockFs.appendFile.mockRejectedValue(new Error('Write error'));
      const logger = new Logger({ logFilePath: '/test/logs/app.log' });

      await expect(logger.log('File log message')).rejects.toThrow('Write error');
    });
  });

  describe('Request Logging', () => {
    it('should log request details', async () => {
      const logger = new Logger({ logFilePath: '/test/logs/app.log' });
      const req = { method: 'GET', url: '/api/test', headers: {} } as unknown as IncomingMessage;
      logger.logRequest(req);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        '/test/logs/app.log',
        expect.stringContaining('GET /api/test')
      );
    });

    it('should handle missing request properties gracefully', async () => {
      const logger = new Logger({ logFilePath: '/test/logs/app.log' });
      const req = { headers: {} };
      await logger.logRequest(req as any);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        '/test/logs/app.log',
        expect.stringContaining('undefined undefined')
      );
    });
  });

  describe('Clear Operation', () => {
    it('should clear log file when it exists', async () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      const logger = new Logger({ logFilePath: '/test/logs/app.log' });

      await logger.clear();

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/logs/app.log',
        ''
      );
    });

    it('should handle clear errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Clear error'));
      const logger = new Logger({ logFilePath: '/test/logs/app.log' });

      await expect(logger.clear()).rejects.toThrow('Clear error');
    });
  });
});