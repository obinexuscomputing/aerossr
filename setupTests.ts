// setupTests.ts
import { jest } from '@jest/globals';
import { TextDecoder, TextEncoder } from 'util';
import { Buffer } from 'buffer';
import { EventEmitter } from 'events';

// Extend NodeJS.Global
declare global {
  // eslint-disable-next-line no-var
  var TextDecoder: {
    new(label?: string, options?: TextDecoderOptions): TextDecoder;
    prototype: TextDecoder;
  };
  // eslint-disable-next-line no-var
  var TextEncoder: {
    new(): TextEncoder;
    prototype: TextEncoder;
  };
}

// Setup global mocks and polyfills
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;
global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder;
global.Buffer = Buffer;
global.EventEmitter = EventEmitter;

// Mock fs promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn(),
  stat: jest.fn()
}));

// Mock path
jest.mock('path', () => ({
  resolve: jest.fn((...paths: string[]) => paths.join('/')),
  join: jest.fn((...paths: string[]) => paths.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  extname: jest.fn((path: string) => '.' + path.split('.').pop()),
  normalize: jest.fn((path: string) => path)
}));

// Setup console spies
let consoleSpies: { [key: string]: jest.SpyInstance } = {};

// Configure Jest timeouts and setup
beforeAll(() => {
  jest.setTimeout(10000);
  
  // Setup console spies
  consoleSpies = {
    log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {})
  };
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset console spies
  Object.values(consoleSpies).forEach(spy => spy.mockClear());
});

afterAll(() => {
  // Restore console spies
  Object.values(consoleSpies).forEach(spy => spy.mockRestore());
});

// Add custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Add global test utilities
global.createMockRequest = (method = 'GET', url = '/', headers = {}) => ({
  method,
  url,
  headers,
  socket: { remoteAddress: '127.0.0.1' }
});

global.createMockResponse = () => {
  const res: any = {
    writeHead: jest.fn(),
    setHeader: jest.fn(),
    end: jest.fn(),
    headersSent: false,
    getHeader: jest.fn(),
    removeHeader: jest.fn()
  };
  return res;
};