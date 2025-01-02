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
//# sourceMappingURL=async.js.map
