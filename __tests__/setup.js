// __tests__/setup.ts
import { jest } from '@jest/globals';
import { TextDecoder } from 'util';

declare global {
  var TextDecoder: typeof TextDecoder;
}

global.TextDecoder = TextDecoder;

beforeAll(() => {
  jest.setTimeout(10000);
});

beforeEach(() => {
  jest.clearAllMocks();
});