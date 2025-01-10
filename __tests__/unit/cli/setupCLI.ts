// __tests__/unit/cli/setupCLI.ts
import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '@/utils';
import { AeroSSR } from '@/core/AeroSSR';
import { AeroSSRCLI } from '@/cli';

export interface TestContext {
  cli: AeroSSRCLI;
  mockLogger: jest.Mocked<Logger>;
  tempDir: string;
  originalCwd: string;
}

export async function setupCLITest(): Promise<TestContext> {
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    clear: jest.fn(),
    logRequest: jest.fn()
  } as unknown as jest.Mocked<Logger>;

  // Create temporary test directory
  const tempDir = path.join(process.cwd(), 'test-' + Math.random().toString(36).substring(7));
  await fs.mkdir(tempDir, { recursive: true });
  
  const originalCwd = process.cwd();
  process.chdir(tempDir);

  const cli = new AeroSSRCLI(mockLogger);

  // Reset all mocks
  jest.clearAllMocks();
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  mockExit.mockClear();

  return {
    cli,
    mockLogger,
    tempDir,
    originalCwd
  };
}

export async function teardownCLITest(context: TestContext): Promise<void> {
  process.chdir(context.originalCwd);
  try {
    await fs.rm(context.tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}