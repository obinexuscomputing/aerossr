// cookie.ts
export interface CookieOptions {
  domain?: string;
  path?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  httpOnly?: boolean;
  maxAge?: number;
}

export class CookieManager {
  private mockDocument?: { cookie: string };

  constructor() {}

  /**
   * Sets mock document for testing
   */
  public __setMockDocument(doc: { cookie: string }): void {
    this.mockDocument = doc;
  }

  /**
   * Clears mock document
   */
  public __clearMockDocument(): void {
    this.mockDocument = undefined;
  }

  /**
   * Gets document object for browser or mock environment
   */
  private getDocument(): { cookie: string } | null {
    if (this.mockDocument) {
      return this.mockDocument;
    }
    
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return document;
    }
    
    return null;
  }

  /**
   * Sets a cookie with the specified name, value and options
   */
  public setCookie(
    name: string,
    value: string,
    days: number,
    options: CookieOptions = {}
  ): boolean {
    const doc = this.getDocument();
    if (!doc) return false;

    try {
      const date = new Date();
      date.setTime(date.getTime() + (Math.max(0, days) * 24 * 60 * 60 * 1000));
      
      const cookieParts = [
        `${encodeURIComponent(name)}=${encodeURIComponent(value.trim())}`,
        `expires=${date.toUTCString()}`,
        `path=${options.path || '/'}`
      ];

      if (options.domain) {
        cookieParts.push(`domain=${options.domain}`);
      }

      if (options.secure) {
        cookieParts.push('secure');
      }

      if (options.sameSite) {
        cookieParts.push(`samesite=${options.sameSite}`);
      }

      if (options.httpOnly) {
        cookieParts.push('httponly');
      }

      const cookieString = cookieParts.join('; ');
      doc.cookie = cookieString;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets a cookie value by name
   */
  public getCookie(name: string): string | null {
    const doc = this.getDocument();
    if (!doc) return null;

    try {
      const nameEQ = encodeURIComponent(name) + '=';
      const cookies = doc.cookie.split(';');

      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
          const value = cookie.substring(nameEQ.length).trim();
          return decodeURIComponent(value);
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Deletes a cookie by name
   */
  public deleteCookie(
    name: string,
    options: Omit<CookieOptions, 'maxAge' | 'expires'> = {}
  ): boolean {
    const doc = this.getDocument();
    if (!doc) return false;

    try {
      const cookieParts = [
        `${encodeURIComponent(name)}=`,
        'expires=Thu, 01 Jan 1970 00:00:00 GMT',
        `path=${options.path || '/'}`
      ];

      if (options.domain) {
        cookieParts.push(`domain=${options.domain}`);
      }

      if (options.secure) {
        cookieParts.push('secure');
      }

      if (options.sameSite) {
        cookieParts.push(`samesite=${options.sameSite}`);
      }

      if (options.httpOnly) {
        cookieParts.push('httponly');
      }

      doc.cookie = cookieParts.join('; ');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets all cookies as a key-value object
   */
  public getAllCookies(): Record<string, string> {
    const doc = this.getDocument();
    if (!doc) return {};

    try {
      return doc.cookie
        .split(';')
        .reduce((cookies: Record<string, string>, cookie) => {
          const [name, value] = cookie.split('=').map(c => c.trim());
          if (name && value) {
            cookies[decodeURIComponent(name)] = decodeURIComponent(value);
          }
          return cookies;
        }, {});
    } catch {
      return {};
    }
  }

  /**
   * Checks if cookies are enabled
   */
  public areCookiesEnabled(): boolean {
    const doc = this.getDocument();
    if (!doc) return false;

    try {
      const testKey = '__cookie_test__';
      const testValue = 'test';
      
      const success = this.setCookie(testKey, testValue, 1);
      if (!success) return false;
      
      const result = this.getCookie(testKey) === testValue;
      this.deleteCookie(testKey);
      
      return result;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const cookieManager = new CookieManager();