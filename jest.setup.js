import { TextEncoder, TextDecoder } from 'util';
import jest from 'jest';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.setTimeout(10000);

beforeEach(() => {
    jest.clearAllMocks();
});