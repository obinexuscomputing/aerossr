import { CookieManager } from '../../../src/utils/CookieManager';

describe('CookieManager', () => {
  let cookieManager: CookieManager;
  let documentCookies: string[] = [];
  let mockDoc: { cookie: string };

  beforeEach(() => {
    documentCookies = [];
    cookieManager = new CookieManager();

    mockDoc = {
      get cookie() {
        return documentCookies.join('; ');
      },
      set cookie(value: string) {
        // Handle cookie deletion
        if (value.includes('expires=Thu, 01 Jan 1970 00:00:00 GMT')) {
          const cookieName = value.split('=')[0];
          documentCookies = documentCookies.filter(cookie => 
            !cookie.startsWith(cookieName + '=')
          );
          return;
        }
        
        // Handle cookie setting
        const [newCookie, ...attributes] = value.split(';');
        const cookieName = newCookie.split('=')[0];
        
        // Replace existing cookie or add new one
        const existingIndex = documentCookies.findIndex(cookie => 
          cookie.startsWith(cookieName + '=')
        );
        
        if (existingIndex >= 0) {
          documentCookies[existingIndex] = [newCookie, ...attributes].join(';');
        } else {
          documentCookies.push(value);
        }
      }
    };

    cookieManager.__setMockDocument(mockDoc);
  });

  afterEach(() => {
    cookieManager.__clearMockDocument();
    documentCookies = [];
  });

  describe('Cookie Setting', () => {
    it('should set expiration date correctly', () => {
      const mockDate = new Date('2025-01-01T00:00:00Z');
      const nextDay = new Date('2025-01-02T00:00:00Z');
      
      const originalDate = global.Date;
      const MockDate = class extends Date {
        constructor(...args: any[]) {
          if (args.length) {
            return new originalDate(...args);
          }
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      } as DateConstructor;
      
      global.Date = MockDate;

      cookieManager.setCookie('test', 'value', 1);
      
      const cookieValue = mockDoc.cookie;
      expect(cookieValue).toContain('test=value');
      expect(cookieValue).toContain(`expires=${nextDay.toUTCString()}`);
      expect(cookieValue).toContain('path=/');

      global.Date = originalDate;
    });

    it('should set cookie with custom options', () => {
      cookieManager.setCookie('test', 'value', 1, {
        domain: 'example.com',
        secure: true,
        sameSite: 'Strict',
        httpOnly: true,
        path: '/custom'
      });

      const cookieValue = mockDoc.cookie;
      expect(cookieValue).toContain('test=value');
      expect(cookieValue).toContain('domain=example.com');
      expect(cookieValue).toContain('secure');
      expect(cookieValue).toContain('samesite=Strict');
      expect(cookieValue).toContain('httponly');
      expect(cookieValue).toContain('path=/custom');
    });

    it('should handle special characters in values', () => {
      const specialValue = 'Hello, World! @#$%&';
      cookieManager.setCookie('test', specialValue, 1);
      expect(cookieManager.getCookie('test')).toBe(specialValue);
    });

    it('should update existing cookie', () => {
      cookieManager.setCookie('test', 'value1', 1);
      cookieManager.setCookie('test', 'value2', 1);
      expect(cookieManager.getCookie('test')).toBe('value2');
      expect(documentCookies.length).toBe(1);
    });
  });

  describe('Cookie Retrieval', () => {
    it('should retrieve existing cookie', () => {
      cookieManager.setCookie('test', 'value', 1);
      expect(cookieManager.getCookie('test')).toBe('value');
    });

    it('should handle multiple cookies', () => {
      cookieManager.setCookie('test1', 'value1', 1);
      cookieManager.setCookie('test2', 'value2', 1);
      
      expect(cookieManager.getCookie('test1')).toBe('value1');
      expect(cookieManager.getCookie('test2')).toBe('value2');
      expect(documentCookies.length).toBe(2);
    });

    it('should return null for non-existent cookie', () => {
      expect(cookieManager.getCookie('nonexistent')).toBeNull();
    });

    it('should get all cookies', () => {
      cookieManager.setCookie('test1', 'value1', 1);
      cookieManager.setCookie('test2', 'value2', 1);

      const allCookies = cookieManager.getAllCookies();
      expect(allCookies).toEqual({
        test1: 'value1',
        test2: 'value2'
      });
    });

    it('should handle cookies with spaces around values', () => {
      documentCookies.push('test=  spaced value  ');
      expect(cookieManager.getCookie('test')).toBe('spaced value');
    });
  });

  describe('Cookie Deletion', () => {
    it('should delete existing cookie', () => {
      cookieManager.setCookie('test', 'value', 1);
      expect(documentCookies.length).toBe(1);
      
      cookieManager.deleteCookie('test');
      expect(cookieManager.getCookie('test')).toBeNull();
      expect(documentCookies.length).toBe(0);
    });

    it('should handle deleting non-existent cookie', () => {
      expect(() => cookieManager.deleteCookie('nonexistent')).not.toThrow();
    });

    it('should delete cookie with specified path', () => {
      cookieManager.setCookie('test', 'value', 1, { path: '/custom' });
      cookieManager.deleteCookie('test', { path: '/custom' });
      expect(cookieManager.getCookie('test')).toBeNull();
    });
  });

  describe('Feature Detection', () => {
    it('should detect cookie support', () => {
      expect(cookieManager.areCookiesEnabled()).toBe(true);
    });

    it('should handle cookie errors', () => {
      cookieManager.__clearMockDocument();
      expect(cookieManager.areCookiesEnabled()).toBe(false);
    });

    it('should handle browser cookie blocking', () => {
      Object.defineProperty(mockDoc, 'cookie', {
        get: () => '',
        set: () => { throw new Error('Cookie blocked'); }
      });
      expect(cookieManager.areCookiesEnabled()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid cookie names', () => {
      expect(cookieManager.setCookie('', 'value', 1)).toBe(false);
      expect(cookieManager.getCookie('')).toBeNull();
    });

    it('should handle undefined document', () => {
      cookieManager.__clearMockDocument();
      expect(cookieManager.setCookie('test', 'value', 1)).toBe(false);
      expect(cookieManager.getCookie('test')).toBeNull();
      expect(cookieManager.getAllCookies()).toEqual({});
    });
  });
});