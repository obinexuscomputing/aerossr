export interface CookieOptions {
    domain?: string;
    path?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    httpOnly?: boolean;
    maxAge?: number;
  }
  
  /**
   * Check if we're in a browser environment
   */
  function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }
  
  /**
   * Sets a cookie with the specified name, value and options
   */
  export function setCookie(
    name: string, 
    value: string, 
    days: number,
    options: CookieOptions = {}
  ): void {
    if (!isBrowser()) {
      return;
    }
  
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  
    const cookieParts = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
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
  
    document.cookie = cookieParts.join('; ');
  }
  
  /**
   * Gets a cookie value by name
   */
  export function getCookie(name: string): string | null {
    if (!isBrowser()) {
      return null;
    }
  
    const nameEQ = encodeURIComponent(name) + '=';
    const cookies = document.cookie.split(';');
  
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
  
    return null;
  }
  
  /**
   * Deletes a cookie by name
   */
  export function deleteCookie(
    name: string, 
    options: Omit<CookieOptions, 'maxAge' | 'expires'> = {}
  ): void {
    if (!isBrowser()) {
      return;
    }
  
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
  
    document.cookie = cookieParts.join('; ');
  }
  
  /**
   * Checks if cookies are enabled in the browser
   */
  export function areCookiesEnabled(): boolean {
    if (!isBrowser()) {
      return false;
    }
  
    try {
      const testKey = '__cookie_test__';
      const testValue = 'test';
      
      setCookie(testKey, testValue, 1);
      const result = getCookie(testKey) === testValue;
      deleteCookie(testKey);
      
      return result;
    } catch {
      return false;
    }
  }
  
  /**
   * Gets all cookies as a key-value object
   */
  export function getAllCookies(): Record<string, string> {
    if (!isBrowser()) {
      return {};
    }
  
    return document.cookie
      .split(';')
      .reduce((cookies: Record<string, string>, cookie) => {
        const [name, value] = cookie.split('=').map(c => c.trim());
        if (name && value) {
          cookies[decodeURIComponent(name)] = decodeURIComponent(value);
        }
        return cookies;
      }, {});
  }