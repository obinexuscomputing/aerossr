"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCache = void 0;
function createCache() {
    const cache = new Map();
    return {
        get: (key) => cache.get(key),
        set: (key, value) => { cache.set(key, value); },
        clear: () => cache.clear()
    };
}
exports.createCache = createCache;
//# sourceMappingURL=cache.js.map