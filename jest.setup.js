import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.setTimeout(10000);

beforeEach(() => {
    jest.clearAllMocks();
});