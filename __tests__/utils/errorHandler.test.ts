// __tests__/utils/errorHandler.test.ts
import { ErrorHandler, CustomError, ErrorPageOptions } from '../../src/utils/errorHandler';
import { IncomingMessage, ServerResponse } from 'http';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let req: jest.Mocked<IncomingMessage>;
  let res: jest.Mocked<ServerResponse>;
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    req = {
      url: '/test',
      method: 'GET'
    } as jest.Mocked<IncomingMessage>;
    
    res = {
      writeHead: jest.fn(),
      end: jest.fn()
    } as unknown as jest.Mocked<ServerResponse>;
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  describe('Error Page Generation', () => {
    it('should generate a basic error page', () => {
      const page = errorHandler.generateErrorPage(404, 'Not Found');
      expect(page).toContain('Error 404');
      expect(page).toContain('Not Found');
      expect(page).toContain('<style>');
    });

    it('should handle custom styles', () => {
      const customStyles = 'body { color: red; }';
      const page = errorHandler.generateErrorPage(500, 'Error', undefined, { styles: customStyles });
      expect(page).toContain(customStyles);
    });

    it('should include error details in development', () => {
      const error = new Error('Test Error') as CustomError;
      error.code = 'TEST_ERROR';
      error.details = { foo: 'bar' };
      error.stack = 'Error stack';

      const page = errorHandler.generateErrorPage(500, 'Error', error, { showDetails: true, showStack: true });
      expect(page).toContain('TEST_ERROR');
      expect(page).toContain('foo');
      expect(page).toContain('Error stack');
    });

    it('should hide error details in production', () => {
      const error = new Error('Test Error') as CustomError;
      error.code = 'TEST_ERROR';
      error.stack = 'Error stack';

      const page = errorHandler.generateErrorPage(500, 'Error', error, { showDetails: false, showStack: false });
      expect(page).not.toContain('TEST_ERROR');
      expect(page).not.toContain('Error stack');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors with custom status codes', async () => {
      const error = new Error('Custom Error') as CustomError;
      error.statusCode = 400;

      await errorHandler.handleError(error, req, res);

      expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
      expect(res.end).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should default to 500 status code', async () => {
      const error = new Error('Server Error');
      await errorHandler.handleError(error, req, res);

      expect(res.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
    });

    it('should set security headers', async () => {
      await errorHandler.handleError(new Error('Test'), req, res);

      expect(res.writeHead).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        })
      );
    });

    it('should log error details', async () => {
      const error = new Error('Test Error') as CustomError;
      error.code = 'TEST_ERROR';
      error.details = { foo: 'bar' };

      await errorHandler.handleError(error, req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Server error:',
        expect.objectContaining({
          statusCode: 500,
          message: 'Test Error',
          path: '/test',
          method: 'GET',
          error: expect.objectContaining({
            code: 'TEST_ERROR',
            details: { foo: 'bar' }
          })
        })
      );
    });
  });

  describe('Configuration', () => {
    it('should respect custom configuration', () => {
      const customConfig: ErrorPageOptions = {
        styles: 'body { color: blue; }',
        showStack: true,
        showDetails: false
      };

      const handler = new ErrorHandler(customConfig);
      const page = handler.generateErrorPage(500, 'Error');

      expect(page).toContain('color: blue');
    });

    it('should allow per-error configuration override', () => {
      const handler = new ErrorHandler({ showDetails: false });
      const error = new Error('Test') as CustomError;
      error.code = 'TEST';

      const page = handler.generateErrorPage(500, 'Error', error, { showDetails: true });
      expect(page).toContain('TEST');
    });
  });
});