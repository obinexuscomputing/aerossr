export interface CookieOptions {
    domain?: string;
    path?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    httpOnly?: boolean;
    maxAge?: number;
}
/**
 * Sets a cookie with the specified name, value and options
 */
export declare function setCookie(name: string, value: string, days: number, options?: CookieOptions): void;
/**
 * Gets a cookie value by name
 */
export declare function getCookie(name: string): string | null;
/**
 * Deletes a cookie by name
 */
export declare function deleteCookie(name: string, options?: Omit<CookieOptions, 'maxAge' | 'expires'>): void;
/**
 * Checks if cookies are enabled in the browser
 */
export declare function areCookiesEnabled(): boolean;
/**
 * Gets all cookies as a key-value object
 */
export declare function getAllCookies(): Record<string, string>;
//# sourceMappingURL=cookie.d.ts.map