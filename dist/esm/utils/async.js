/**
 * Type guard to check if a value is a Promise
 */
/**
 * Ensures a function returns a Promise
 */
function ensureAsync(fn) {
    return async function (...args) {
        const result = await fn(...args);
        return result;
    };
}

export { ensureAsync };
//# sourceMappingURL=async.js.map
