/*!
 * @obinexuscomputing/aerossr v0.1.1
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
class CookieManager {
    mockDocument;
    constructor() { }
    /**
     * Sets mock document for testing
     */
    __setMockDocument(doc) {
        this.mockDocument = doc;
    }
    /**
     * Clears mock document
     */
    __clearMockDocument() {
        this.mockDocument = undefined;
    }
    /**
     * Gets document object for browser or mock environment
     */
    getDocument() {
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
    setCookie(name, value, days, options = {}) {
        const doc = this.getDocument();
        if (!doc)
            return;
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
        doc.cookie = cookieParts.join('; ');
    }
    /**
     * Gets a cookie value by name
     */
    getCookie(name) {
        const doc = this.getDocument();
        if (!doc)
            return null;
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
    }
    /**
     * Deletes a cookie by name
     */
    deleteCookie(name, options = {}) {
        const doc = this.getDocument();
        if (!doc)
            return;
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
    }
    /**
     * Gets all cookies as a key-value object
     */
    getAllCookies() {
        const doc = this.getDocument();
        if (!doc)
            return {};
        return doc.cookie
            .split(';')
            .reduce((cookies, cookie) => {
            const [name, value] = cookie.split('=').map(c => c.trim());
            if (name && value) {
                cookies[decodeURIComponent(name)] = decodeURIComponent(value);
            }
            return cookies;
        }, {});
    }
    /**
     * Checks if cookies are enabled
     */
    areCookiesEnabled() {
        const doc = this.getDocument();
        if (!doc)
            return false;
        try {
            const testKey = '__cookie_test__';
            const testValue = 'test';
            this.setCookie(testKey, testValue, 1);
            const result = this.getCookie(testKey) === testValue;
            this.deleteCookie(testKey);
            return result;
        }
        catch {
            return false;
        }
    }
}
// Export singleton instance
const cookieManager = new CookieManager();

export { CookieManager, cookieManager };
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=CookieManager.js.map
