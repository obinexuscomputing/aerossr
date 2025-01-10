// jest.setup.ts
import { jest } from '@jest/globals';

// Mock fs promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  access: jest.fn(),
  rm: jest.fn()
}));

// Setup global test environment
beforeAll(() => {
  // Clear all mocks before tests
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});