export interface CookieOptions {
    domain?: string;
    path?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    httpOnly?: boolean;
    maxAge?: number;
}
export declare class CookieManager {
    private mockDocument?;
    constructor();
    /**
     * Sets mock document for testing
     */
    __setMockDocument(doc: {
        cookie: string;
    }): void;
    /**
     * Clears mock document
     */
    __clearMockDocument(): void;
    /**
     * Gets document object for browser or mock environment
     */
    private getDocument;
    /**
     * Sets a cookie with the specified name, value and options
     */
    setCookie(name: string, value: string, days: number, options?: CookieOptions): void;
    /**
     * Gets a cookie value by name
     */
    getCookie(name: string): string | null;
    /**
     * Deletes a cookie by name
     */
    deleteCookie(name: string, options?: Omit<CookieOptions, 'maxAge' | 'expires'>): void;
    /**
     * Gets all cookies as a key-value object
     */
    getAllCookies(): Record<string, string>;
    /**
     * Checks if cookies are enabled
     */
    areCookiesEnabled(): boolean;
}
export declare const cookieManager: CookieManager;
//# sourceMappingURL=CookieManager.d.ts.map