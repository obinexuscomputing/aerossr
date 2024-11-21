import fs from 'fs';
import path from 'path';

jest.mock('fs');

describe('Logger', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const consoleSpy = jest.spyOn(console, 'log');
  const consoleErrorSpy = jest.spyOn(console, 'error');
  const logFilePath = '/test/log/file.log';

  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.accessSync.mockImplementation();
    mockFs.appendFile.mockImplementation((_, __, callback) => callback(null));
    consoleSpy.mockImplementation();
    consoleErrorSpy.mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with valid log file path', () => {
    const logger = new Logger({ logFilePath });
    expect(logger['logFilePath']).toBe(logFilePath);
  });

  test('should handle invalid log file path', () => {
    mockFs.accessSync.mockImplementation(() => {
      throw new Error('Access denied');
    });
    
    const logger = new Logger({ logFilePath });
    expect(logger['logFilePath']).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('should create log directory if it doesn\'t exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    new Logger({ logFilePath });
    expect(mockFs.mkdirSync).toHaveBeenCalled();
  });

  test('should write to log file and console', () => {
    const logger = new Logger({ logFilePath });
    const message = 'Test message';
    
    logger.log(message);
    
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockFs.appendFile).toHaveBeenCalled();
    expect(mockFs.appendFile.mock.calls[0][1]).toContain(message);
  });

  test('should handle file write errors', () => {
    mockFs.appendFile.mockImplementation((_, __, callback) => 
      callback(new Error('Write error'))
    );
    
    const logger = new Logger({ logFilePath });
    logger.log('Test message');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to write to log file')
    );
  });

  test('should log HTTP requests', () => {
    const logger = new Logger({ logFilePath });
    const mockRequest = {
      method: 'GET',
      url: '/test',
    };
    
    logger.logRequest(mockRequest as any);
    
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockFs.appendFile).toHaveBeenCalled();
    expect(mockFs.appendFile.mock.calls[0][1]).toContain('GET /test');
  });
});