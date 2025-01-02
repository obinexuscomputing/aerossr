'use strict';

function createCache() {
    const cache = new Map();
    return {
        get: (key) => {
            const item = cache.get(key);
            if (!item)
                return undefined;
            if (item.expires && item.expires < Date.now()) {
                cache.delete(key);
                return undefined;
            }
            return item.value;
        },
        set: (key, value, itemTtl, ttl) => {
            const expires = itemTtl || ttl
                ? Date.now() + (itemTtl || ttl)
                : undefined;
            cache.set(key, { value, expires });
        },
        clear: () => cache.clear()
    };
}

exports.createCache = createCache;
//# sourceMappingURL=cache.js.map
