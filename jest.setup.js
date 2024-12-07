import { TextDecoder } from 'util';
import '@jest/globals';

global.TextDecoder = TextDecoder;

// Move setTimeout to beforeAll
beforeAll(() => {
  jest.setTimeout(10000);
});

beforeEach(() => {
  jest.clearAllMocks();
});