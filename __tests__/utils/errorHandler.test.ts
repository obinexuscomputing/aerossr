import { generateErrorPage, handleError } from '../../src/utils/errorHandler';
import { IncomingMessage, ServerResponse } from 'http';

describe('Error Handler', () => {
  let req: jest.Mocked<IncomingMessage>;
  let res: jest.Mocked<ServerResponse>;
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    req = {
      url: '/test',
      method: 'GET'
    } as any;
    res = {
      writeHead: jest.fn(),
      end: jest.fn()
    } as any;
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it('should generate an error page', () => {
    const page = generateErrorPage(404, 'Not Found');
    expect(page).toContain('Error 404');
    expect(page).toContain('Not Found');
  });

  it('should handle errors with custom status codes', async () => {
    const error = new Error('Custom Error') as any;
    error.statusCode = 400;

    await handleError(error, req, res);
    expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
    expect(res.end).toHaveBeenCalled();
  });
});