/*!
 * @obinexuscomputing/aerossr v0.1.1
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
/**
 * Type guard to check if a value is a Promise
 */
function isPromise(value) {
    return Boolean(value && typeof value === 'object' && 'then' in value && typeof value.then === 'function');
}
/**
 * Ensures a function returns a Promise
 */
function ensureAsync(fn) {
    return async function (...args) {
        const result = await fn(...args);
        return result;
    };
}

export { ensureAsync, isPromise };
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=async.js.map
