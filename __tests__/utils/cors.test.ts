// __tests__/utils/corsManager.test.ts
import { CORSManager, CorsOptions } from '../../src/utils/cors';
import { ServerResponse } from 'http';

describe('CORS Manager', () => {
  let corsManager: CORSManager;
  let res: jest.Mocked<ServerResponse>;

  beforeEach(() => {
    corsManager = new CORSManager();
    res = {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn()
    } as unknown as jest.Mocked<ServerResponse>;
  });

  describe('Default Headers', () => {
    it('should set default CORS headers', () => {
      corsManager.setCorsHeaders(res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
    });

    it('should use custom default options from constructor', () => {
      const customOptions: CorsOptions = {
        origins: 'https://example.com',
        methods: ['GET', 'POST'],
        allowedHeaders: ['X-Custom-Header'],
        maxAge: 3600
      };

      const manager = new CORSManager(customOptions);
      manager.setCorsHeaders(res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'X-Custom-Header');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '3600');
    });
  });

  describe('Header Configuration', () => {
    it('should handle multiple origins', () => {
      corsManager.setCorsHeaders(res, {
        origins: ['https://example.com', 'https://app.example.com']
      });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://example.com,https://app.example.com'
      );
    });

    it('should set exposed headers when provided', () => {
      corsManager.setCorsHeaders(res, {
        exposedHeaders: ['X-Custom-Header', 'X-Another-Header']
      });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Expose-Headers',
        'X-Custom-Header, X-Another-Header'
      );
    });

    it('should handle credentials flag', () => {
      corsManager.setCorsHeaders(res, { credentials: true });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true'
      );
    });
  });

  describe('Options Normalization', () => {
    it('should normalize string options to origins config', () => {
      const normalized = corsManager.normalizeCorsOptions('https://example.com');
      expect(normalized).toEqual({ origins: 'https://example.com' });
    });

    it('should return default options for undefined input', () => {
      const normalized = corsManager.normalizeCorsOptions(undefined);
      expect(normalized).toEqual({ origins: '*' });
    });

    it('should pass through valid options object', () => {
      const options: CorsOptions = {
        origins: 'https://example.com',
        methods: ['GET']
      };
      const normalized = corsManager.normalizeCorsOptions(options);
      expect(normalized).toEqual(options);
    });
  });

  describe('Preflight Handling', () => {
    it('should handle preflight requests', () => {
      corsManager.handlePreflight(res);

      expect(res.setHeader).toHaveBeenCalled();
      expect(res.writeHead).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it('should handle preflight with custom options', () => {
      corsManager.handlePreflight(res, {
        origins: 'https://example.com',
        methods: ['GET', 'POST'],
        credentials: true
      });

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(res.writeHead).toHaveBeenCalledWith(204);
    });
  });

  describe('Default Options Management', () => {
    it('should allow updating default options', () => {
      corsManager.updateDefaults({
        origins: 'https://example.com',
        methods: ['GET', 'POST']
      });

      const defaults = corsManager.getDefaults();
      expect(defaults.origins).toBe('https://example.com');
      expect(defaults.methods).toEqual(['GET', 'POST']);
    });

    it('should preserve unmodified default options', () => {
      const originalDefaults = corsManager.getDefaults();
      corsManager.updateDefaults({ origins: 'https://example.com' });
      
      const newDefaults = corsManager.getDefaults();
      expect(newDefaults.origins).toBe('https://example.com');
      expect(newDefaults.methods).toEqual(originalDefaults.methods);
      expect(newDefaults.maxAge).toBe(originalDefaults.maxAge);
    });

    it('should return a copy of defaults to prevent mutation', () => {
      const defaults = corsManager.getDefaults();
      defaults.origins = 'mutated';

      expect(corsManager.getDefaults().origins).toBe('*');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays', () => {
      corsManager.setCorsHeaders(res, {
        methods: [],
        allowedHeaders: [],
        exposedHeaders: []
      });

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', '');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', '');
      expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Expose-Headers', expect.any(String));
    });

    it('should handle malformed options gracefully', () => {
      corsManager.setCorsHeaders(res, {
        origins: undefined,
        methods: null as any,
        allowedHeaders: undefined
      });

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', '');
    });
  });
});