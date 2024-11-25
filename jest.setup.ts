export {};

import { TextEncoder, TextDecoder } from 'util';

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

jest.setTimeout(10000);

beforeEach(() => {
    jest.clearAllMocks();
});