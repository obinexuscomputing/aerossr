/*!
 * @obinexuscomputing/aerossr v0.1.1
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
// Mock document object for testing environments
let mockDocument;
/**
 * Set mock document for testing
 */
function __setMockDocument(doc) {
    mockDocument = doc;
}
/**
 * Clear mock document
 */
function __clearMockDocument() {
    mockDocument = undefined;
}
/**
 * Check if we're in a browser environment or have a mock document
 */
function getDocument() {
    if (mockDocument) {
        return mockDocument;
    }
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        return document;
    }
    return null;
}
/**
 * Sets a cookie with the specified name, value and options
 */
function setCookie(name, value, days, options = {}) {
    const doc = getDocument();
    if (!doc)
        return;
    const date = new Date();
    date.setTime(date.getTime() + Math.max(0, days) * 24 * 60 * 60 * 1000);
    const cookieParts = [];
    // Main cookie part
    cookieParts.push(`${encodeURIComponent(name)}=${encodeURIComponent(value.trim())}`);
    // Expiration date
    const expires = date.toUTCString();
    cookieParts.push(`expires=${expires}`);
    // Path
    cookieParts.push(`path=${options.path || '/'}`);
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
    // Join all parts and set the cookie
    const cookieString = cookieParts.join('; ');
    doc.cookie = cookieString;
}
/**
 * Gets a cookie value by name
 */
function getCookie(name) {
    const doc = getDocument();
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
function deleteCookie(name, options = {}) {
    const doc = getDocument();
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
 * Checks if cookies are enabled
 */
function areCookiesEnabled() {
    const doc = getDocument();
    if (!doc)
        return false;
    try {
        const testKey = '__cookie_test__';
        const testValue = 'test';
        setCookie(testKey, testValue, 1);
        const result = getCookie(testKey) === testValue;
        deleteCookie(testKey);
        return result;
    }
    catch {
        return false;
    }
}
/**
 * Gets all cookies as a key-value object
 */
function getAllCookies() {
    const doc = getDocument();
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

export { __clearMockDocument, __setMockDocument, areCookiesEnabled, deleteCookie, getAllCookies, getCookie, setCookie };
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=cookie.js.map
