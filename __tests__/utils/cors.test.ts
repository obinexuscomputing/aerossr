import { setCorsHeaders } from '../../src/utils/cors';
import type { ServerResponse } from 'http';

describe('CORS', () => {
  test('should set CORS headers', () => {
    const res = {
      setHeader: jest.fn(),
    } as unknown as ServerResponse;

    setCorsHeaders(res);
    expect(res.setHeader).toHaveBeenCalled();
  });
});
describe('CORS Utilities', () => {
  let mockResponse: jest.Mocked<ServerResponse>;

  beforeEach(() => {
    mockResponse = {
      setHeader: jest.fn(),
    } as any;
  });

  test('should set default CORS headers', () => {
    setCorsHeaders(mockResponse);
    
    expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS, HEAD'
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
  });

  test('should set custom origin', () => {
    setCorsHeaders(mockResponse, 'http://example.com');
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'http://example.com'
    );
  });

  test('should set max age header', () => {
    setCorsHeaders(mockResponse);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
  });
});

// src/utils/__tests__/errorHandler.test.ts
import { IncomingMessage, ServerResponse } from 'http';
import { handleError, generateErrorPage } from '../errorHandler';

describe('Error Handler Utilities', () => {
  let mockRequest: jest.Mocked<IncomingMessage>;
  let mockResponse: jest.Mocked<ServerResponse>;
  const consoleError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
    mockRequest = {} as any;
    mockResponse = {
      writeHead: jest.fn(),
      end: jest.fn(),
    } as any;
  });

  afterEach(() => {
    console.error = consoleError;
  });

  describe('generateErrorPage', () => {
    test('should generate HTML error page', () => {
      const html = generateErrorPage(404, 'Not Found');
      expect(html).toContain('<title>Error 404</title>');
      expect(html).toContain('Not Found');
      expect(html).toContain('<div class="error">');
    });

    test('should escape HTML in error message', () => {
      const html = generateErrorPage(500, '<script>alert("xss")</script>');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('handleError', () => {
    test('should handle basic error', async () => {
      const error = new Error('Test error');
      await handleError(error, mockRequest, mockResponse);
      
      expect(mockResponse.writeHead).toHaveBeenCalledWith(500, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
      });
      expect(mockResponse.end).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });

    test('should handle custom status code', async () => {
      const error: any = new Error('Not Found');
      error.statusCode = 404;
      
      await handleError(error, mockRequest, mockResponse);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
    });

    test('should log error to console', async () => {
      const error = new Error('Test error');
      await handleError(error, mockRequest, mockResponse);
      expect(console.error).toHaveBeenCalledWith('Server error:', error);
    });
  });
});
