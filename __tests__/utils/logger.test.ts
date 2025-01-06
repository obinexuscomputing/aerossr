import * as fs from 'fs';
import * as path from 'path';
import {Logger} from '../../src/utils/logger'; 
import { setCookie, getCookie, deleteCookie } from '../../src/types';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  appendFile: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  dirname: jest.fn(),
}));

describe('Logger', () => {
  const mockPath = path as jest.Mocked<typeof path>;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const testLogDir = '/test/logs';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.dirname.mockReturnValue(testLogDir);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.appendFile.mockResolvedValue(Promise.resolve() as never);

  });

  describe('Initialization', () => {
    it('should create logger without file path', () => {
      const logger = new Logger();
      expect(logger).toBeDefined();
    });

    it('should create logger with valid file path', () => {
      const logger = new Logger('/test/logs/app.log');
      expect(logger).toBeDefined();
    });

    it('should create log directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      const logger = new Logger('/test/logs/app.log');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(testLogDir, { recursive: true });
    });

    it('should handle directory creation errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => new Logger('/test/logs/app.log')).toThrow('Permission denied');
    });
  });

  describe('Logging Operations', () => {
    it('should log to console', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const logger = new Logger();

      logger.log('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test message'));
      consoleSpy.mockRestore();
    });

    it('should format log messages with timestamp', () => {
      const logger = new Logger();
      const message = 'Test message';
      const formattedMessage = logger.formatMessage(message);

      expect(formattedMessage).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] Test message/);
    });

    it('should log to file when path provided', async () => {
      const logger = new Logger('/test/logs/app.log');
      await logger.log('File log message');

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        '/test/logs/app.log',
        expect.stringContaining('File log message'),
        expect.any(Function)
      );
    });

    it('should handle file write errors gracefully', async () => {
      mockFs.appendFile.mockRejectedValue(new Error('Write error') as never);
      const logger = new Logger('/test/logs/app.log');

      await expect(logger.log('File log message')).rejects.toThrow('Write error');
    });
  });

  describe('Request Logging', () => {
    it('should log request details', () => {
      const logger = new Logger();
      const req = { method: 'GET', url: '/api/test' };
      logger.logRequest(req);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('GET /api/test'),
        expect.any(Function)
      );
    });

    it('should handle missing request properties gracefully', () => {
      const logger = new Logger();
      const req = { method: undefined, url: undefined };
      logger.logRequest(req);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('undefined undefined'),
        expect.any(Function)
      );
    });
  });

  describe('Clear Operation', () => {
    it('should clear log file when it exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      const logger = new Logger('/test/logs/app.log');

      logger.clear();

      expect(mockFs.appendFile).toHaveBeenCalledWith('/test/logs/app.log', '', expect.any(Function));
    });

    it('should handle clear errors gracefully', () => {
      mockFs.appendFile.mockImplementation(() => {
        throw new Error('Clear error');
      });
      const logger = new Logger('/test/logs/app.log');

      expect(() => logger.clear()).toThrow('Clear error');
    });
  });
});


describe('Logger', () => {
  let mockFs: jest.Mocked<typeof fs>;
  
  beforeEach(() => {
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.appendFile.mockResolvedValue(Promise.resolve() as never);
  });

  it('should initialize without file path', () => {
    const logger = new Logger();
    expect(logger.getLogPath()).toBeNull();
  });

  it('should write to file when path provided', async () => {
    const logger = new Logger({ logFilePath: '/test.log' });
    await logger.log('test message');
    expect(mockFs.appendFile).toHaveBeenCalled();
  });

  it('should format messages with timestamp', async () => {
    const logger = new Logger();
    const consoleSpy = jest.spyOn(console, 'log');
    await logger.log('test');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    );
  });
});

// Priority 4: Cookie Tests
describe('Cookie Utils', () => {
  beforeEach(() => {
    // Mock document.cookie
    Object.defineProperty(window.document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  it('should set cookie with correct attributes', () => {
    setCookie('test', 'value', 1, {
      path: '/test',
      secure: true
    });
    
    expect(document.cookie).toContain('test=value');
    expect(document.cookie).toContain('path=/test');
    expect(document.cookie).toContain('secure');
  });

  it('should get cookie value', () => {
    document.cookie = 'test=value';
    expect(getCookie('test')).toBe('value');
  });

  it('should delete cookie', () => {
    setCookie('test', 'value', 1);
    deleteCookie('test');
    expect(getCookie('test')).toBeNull();
  });
});