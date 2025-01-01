import { setCorsHeaders } from '../../src/utils/cors';
import { ServerResponse } from 'http';

describe('CORS Headers', () => {
  let res: jest.Mocked<ServerResponse>;
  
  beforeEach(() => {
    res = {
      setHeader: jest.fn(),
    } as any;
  });

  it('should set default CORS headers', () => {
    setCorsHeaders(res);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  });

  it('should handle custom origins array', () => {
    setCorsHeaders(res, { origins: ['http://localhost:3000', 'https://example.com'] });
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000,https://example.com');
  });
});