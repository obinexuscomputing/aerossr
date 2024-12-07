import '@jest/globals';
import { TextDecoder } from 'util';

global.TextDecoder = TextDecoder;

beforeAll(() => {
  jest.setTimeout(10000);
});

beforeEach(() => {
  jest.clearAllMocks();
});