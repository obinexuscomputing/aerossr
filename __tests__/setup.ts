// __tests__/setup.ts
import { jest } from '@jest/globals';
import { TextDecoder } from 'util';

declare global {
    // eslint-disable-next-line no-var
    var TextDecoder: {
        new(label?: string, options?: TextDecoderOptions): TextDecoder;
        prototype: TextDecoder;
    };
}

// Cast TextDecoder to match the expected interface
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;

beforeAll(() => {
    jest.setTimeout(10000);
});

beforeEach(() => {
    jest.clearAllMocks();
});