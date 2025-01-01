'use strict';

function isPromise(value) {
    return Boolean(value && typeof value === 'object' && 'then' in value && typeof value.then === 'function');
}
function ensureAsync(fn) {
    return async function (...args) {
        const result = await fn(...args);
        return result;
    };
}

exports.ensureAsync = ensureAsync;
exports.isPromise = isPromise;
//# sourceMappingURL=async.cjs.map
