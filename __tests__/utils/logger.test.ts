import { Logger } from '../../src/utils/logger';
import fs from 'fs/promises';

jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.writeFile.mockResolvedValue();
    mockFs.mkdir.mockResolvedValue(undefined);
  });

  test('should create logger without file path', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });

  test('should log to console', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const logger = new Logger();
    logger.log('test message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('should log to file when path provided', async () => {
    const logger = new Logger({ logFilePath: 'test.log' });
    await logger.log('test message');
    expect(mockFs.appendFile).toHaveBeenCalled();
  });

  test('should handle file write errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    mockFs.appendFile.mockRejectedValue(new Error('Write error'));
    
    const logger = new Logger({ logFilePath: 'test.log' });
    await logger.log('test message');
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});