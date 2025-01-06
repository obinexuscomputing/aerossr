import { setCookie, getCookie, deleteCookie, __setMockDocument, __clearMockDocument } from '../../src/utils/cookie';

describe('Cookie Utilities', () => {
  let documentCookies: string[] = [];
  let mockDoc: { cookie: string };

  beforeEach(() => {
    // Reset cookies before each test
    documentCookies = [];

    // Create mock document object
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

    // Set the mock document for testing
    __setMockDocument(mockDoc);
  });

  afterEach(() => {
    __clearMockDocument();
  });

  describe('setCookie', () => {
    it('should set expiration date correctly', () => {
      const mockDate = new Date('2025-01-01T00:00:00Z');
      const nextDay = new Date('2025-01-02T00:00:00Z');
      
      // Mock Date constructor and now() method
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

      // Set cookie and verify
      setCookie('test', 'value', 1);
      
      const expectedCookie = `test=value; expires=${nextDay.toUTCString()}; path=/`;
      const actualCookie = mockDoc.cookie;
      
      expect(actualCookie).toContain('test=value');
      expect(actualCookie).toContain(`expires=${nextDay.toUTCString()}`);
      expect(actualCookie).toContain('path=/');

      // Restore Date
      global.Date = originalDate;
    });
});

  describe('getCookie', () => {
    it('should retrieve existing cookie value', () => {
      setCookie('test', 'value', 1);
      expect(getCookie('test')).toBe('value');
    });

    it('should return null for non-existent cookie', () => {
      expect(getCookie('nonexistent')).toBeNull();
    });

    it('should handle multiple cookies', () => {
      setCookie('test1', 'value1', 1);
      setCookie('test2', 'value2', 1);
      
      expect(getCookie('test1')).toBe('value1');
      expect(getCookie('test2')).toBe('value2');
    });

    it('should handle cookies with spaces around values', () => {
      // Manually set cookie with spaces
      mockDoc.cookie = 'test=  value  ';
      expect(getCookie('test')).toBe('value');
    });

    it('should handle cookies with special characters', () => {
      const specialValue = 'value!@#$%^&*()';
      setCookie('test', specialValue, 1);
      expect(getCookie('test')).toBe(specialValue);
    });

    it('should return exact matches only', () => {
      setCookie('test', 'value', 1);
      setCookie('test123', 'other', 1);
      
      expect(getCookie('test')).toBe('value');
    });
  });

  describe('deleteCookie', () => {
    it('should delete existing cookie', () => {
      setCookie('test', 'value', 1);
      deleteCookie('test');
      
      expect(getCookie('test')).toBeNull();
    });

    it('should not throw error when deleting non-existent cookie', () => {
      expect(() => deleteCookie('nonexistent')).not.toThrow();
    });

    it('should only delete specified cookie', () => {
      setCookie('test1', 'value1', 1);
      setCookie('test2', 'value2', 1);
      
      deleteCookie('test1');
      
      expect(getCookie('test1')).toBeNull();
      expect(getCookie('test2')).toBe('value2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      setCookie('test', '', 1);
      expect(getCookie('test')).toBe('');
    });

    it('should handle empty string names', () => {
      setCookie('', 'value', 1);
      expect(getCookie('')).toBe('value');
    });

    it('should handle zero expiration days', () => {
      setCookie('test', 'value', 0);
      expect(getCookie('test')).toBe('value');
    });

    it('should handle negative expiration days', () => {
      setCookie('test', 'value', -1);
      expect(getCookie('test')).toBe('value');
    });

    it('should handle multiple sequential operations', () => {
      setCookie('test', 'value1', 1);
      expect(getCookie('test')).toBe('value1');
      
      setCookie('test', 'value2', 1);
      expect(getCookie('test')).toBe('value2');
      
      deleteCookie('test');
      expect(getCookie('test')).toBeNull();
    });
  });
});