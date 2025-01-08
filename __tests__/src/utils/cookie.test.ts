import { CookieManager } from "../../../src/utils/CookieManager";

describe('Cookie Manager', () => {
  let cookieManager: CookieManager;
  let documentCookies: string[] = [];
  let mockDoc: { cookie: string };

  beforeEach(() => {
    cookieManager = new CookieManager();
    documentCookies = [];

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
        const newCookie = value.split(';')[0]; // Get just name=value part
        const cookieName = newCookie.split('=')[0];
        
        // Replace existing cookie or add new one
        const existingIndex = documentCookies.findIndex(cookie => 
          cookie.startsWith(cookieName + '=')
        );
        
        if (existingIndex >= 0) {
          documentCookies[existingIndex] = newCookie;
        } else {
          documentCookies.push(newCookie);
        }
      }
    };

    cookieManager.__setMockDocument(mockDoc);
  });

  afterEach(() => {
    cookieManager.__clearMockDocument();
  });

  describe('Cookie Setting', () => {
    it('should set expiration date correctly', () => {
      const mockDate = new Date('2025-01-01T00:00:00Z');
      const nextDay = new Date('2025-01-02T00:00:00Z');
      
      const MockDate = class extends Date {
        constructor() {
          super();
          return mockDate;
        }
      };
      
      const originalDate = global.Date;
      global.Date = MockDate as DateConstructor;
      global.Date.UTC = originalDate.UTC;
      global.Date.now = () => mockDate.getTime();
      global.Date.parse = originalDate.parse;
      Object.setPrototypeOf(global.Date, originalDate);

      cookieManager.setCookie('test', 'value', 1);
      
      expect(mockDoc.cookie).toContain('test=value');
      expect(mockDoc.cookie).toContain(`expires=${nextDay.toUTCString()}`);
      expect(mockDoc.cookie).toContain('path=/');

      global.Date = originalDate;
    });

    it('should set cookie with custom options', () => {
      cookieManager.setCookie('test', 'value', 1, {
        domain: 'example.com',
        secure: true,
        sameSite: 'Strict'
      });

      expect(mockDoc.cookie).toContain('domain=example.com');
      expect(mockDoc.cookie).toContain('secure');
      expect(mockDoc.cookie).toContain('samesite=Strict');
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
  });

  describe('Cookie Deletion', () => {
    it('should delete existing cookie', () => {
      cookieManager.setCookie('test', 'value', 1);
      cookieManager.deleteCookie('test');
      
      expect(cookieManager.getCookie('test')).toBeNull();
    });

    it('should handle deleting non-existent cookie', () => {
      expect(() => cookieManager.deleteCookie('nonexistent')).not.toThrow();
    });
  });

  describe('Feature Detection', () => {
    it('should detect cookie support', () => {
      expect(cookieManager.areCookiesEnabled()).toBe(true);
    });

    it('should handle cookie errors', () => {
      mockDoc.cookie = '';
      Object.defineProperty(mockDoc, 'cookie', {
        set: () => { throw new Error('Cookie error'); }
      });

      expect(cookieManager.areCookiesEnabled()).toBe(false);
    });
  });
});


describe('Cookie Manager', () => {
  let documentCookies: string[] = [];
  
  beforeEach(() => {
    documentCookies = [];
    const mockDoc = {
      get cookie() { return documentCookies.join('; '); },
      set cookie(value: string) {
        if (value.includes('=')) {
          documentCookies.push(value);
        } else {
          const cookieName = value.split('=')[0];
          documentCookies = documentCookies.filter(c => !c.startsWith(cookieName + '='));
        }
      }
    };
    cookieManager.__setMockDocument(mockDoc);
  });

  afterEach(() => {
    cookieManager.__clearMockDocument();
  });

  describe('setCookie', () => {
    test('should set cookie with correct attributes', () => {
      cookieManager.setCookie('test', 'value', 1, { path: '/test' });
      expect(documentCookies[0]).toMatch(/^test=value/);
      expect(documentCookies[0]).toMatch(/path=\/test/);
    });

    test('should handle special characters', () => {
      cookieManager.setCookie('test', 'value with spaces', 1);
      expect(documentCookies[0]).toContain('test=value%20with%20spaces');
    });
  });

  describe('getCookie', () => {
    test('should retrieve existing cookie', () => {
      cookieManager.setCookie('test', 'value', 1);
      expect(cookieManager.getCookie('test')).toBe('value');
    });

    test('should return null for non-existent cookie', () => {
      expect(cookieManager.getCookie('nonexistent')).toBeNull();
    });
  });
});