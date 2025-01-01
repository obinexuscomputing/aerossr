// __tests__/utils/logger.test.ts
import { Logger } from '../../src/utils/logger';
import fs from 'fs/promises';
import { IncomingMessage } from 'http';
import path from 'path';

jest.mock('fs/promises');
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  constants: { W_OK: 4, R_OK: 4 },
}));
jest.mock('path');

describe('Logger', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;
  const mockFsSync = require('fs') as jest.Mocked<typeof import('fs')>;
  const testLogPath = '/test/logs/test.log';
  const testLogDir = '/test/logs';

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup path mocks
    mockPath.dirname.mockReturnValue(testLogDir);
    // Setup fs mocks
    mockFsSync.existsSync.mockReturnValue(true);
    mockFsSync.mkdirSync.mockReturnValue(undefined);
    mockFs.appendFile.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should create logger without file path', () => {
      const logger = new Logger();
      expect(logger).toBeDefined();
      expect(logger.getLogPath()).toBeNull();
    });

    it('should create logger with valid file path', async () => {
      const logger = new Logger({ logFilePath: testLogPath });
      expect(logger.getLogPath()).toBe(testLogPath);
    });

    it('should create log directory if it does not exist', async () => {
      mockFsSync.existsSync.mockReturnValue(false);
      new Logger({ logFilePath: testLogPath });
      expect(mockFsSync.mkdirSync).toHaveBeenCalledWith(testLogDir, { recursive: true });
    });

    it('should handle directory creation errors gracefully', async () => {
      mockFsSync.existsSync.mockReturnValue(false);
      mockFsSync.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const consoleSpy = jest.spyOn(console, 'error');
      const logger = new Logger({ logFilePath: testLogPath });
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(logger.getLogPath()).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('Logging Operations', () => {
    it('should log to console', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const logger = new Logger();
      const message = 'test message';
      
      logger.log(message);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(message));
      consoleSpy.mockRestore();
    });

    it('should format log messages with timestamp', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const logger = new Logger();
      const message = 'test message';
      
      logger.log(message);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] test message/)
      );
      consoleSpy.mockRestore();
    });

    it('should log to file when path provided', async () => {
      const logger = new Logger({ logFilePath: testLogPath });
      const message = 'test message';
      
      await logger.log(message);
      
      expect(mockFs.appendFile).toHaveBeenCalledWith(
        testLogPath,
        expect.stringContaining(message),
        'utf-8'
      );
    });

    it('should handle file write errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      mockFs.appendFile.mockRejectedValue(new Error('Write error'));
      
      const logger = new Logger({ logFilePath: testLogPath });
      await logger.log('test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Write error'));
      consoleSpy.mockRestore();
    });
  });

  describe('Request Logging', () => {
    it('should log request details', () => {
      const logger = new Logger();
      const mockReq = {
        method: 'GET',
        url: '/test',
        headers: { 'user-agent': 'test-agent' }
      } as IncomingMessage;
      
      const logSpy = jest.spyOn(logger, 'log');
      logger.logRequest(mockReq);
      
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GET /test'));
    });

    it('should handle missing request properties gracefully', () => {
      const logger = new Logger();
      const mockReq = {} as IncomingMessage;
      
      const logSpy = jest.spyOn(logger, 'log');
      logger.logRequest(mockReq);
      
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('undefined undefined'));
    });
  });
});