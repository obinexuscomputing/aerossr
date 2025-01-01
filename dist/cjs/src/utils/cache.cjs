'use strict';

function createCache(options = {}) {
    const cache = new Map();
    const { ttl, maxSize } = options;
    const cleanup = () => {
        if (!ttl)
            return;
        const now = Date.now();
        for (const [key, item] of cache.entries()) {
            if (item.expires && item.expires <= now) {
                cache.delete(key);
            }
        }
    };
    return {
        get(key) {
            cleanup();
            const item = cache.get(key);
            return item && (!item.expires || item.expires > Date.now())
                ? item.value
                : undefined;
        },
        set(key, value, itemTtl) {
            cleanup();
            if (maxSize && cache.size >= maxSize) {
                const firstKey = cache.keys().next().value;
                if (firstKey !== undefined) {
                    cache.delete(firstKey);
                }
            }
            cache.set(key, {
                value,
                expires: itemTtl || ttl ? Date.now() + (itemTtl || ttl) : undefined
            });
        },
        clear() {
            cache.clear();
        },
        has(key) {
            cleanup();
            const item = cache.get(key);
            return item !== undefined && (!item.expires || item.expires > Date.now());
        },
        delete(key) {
            return cache.delete(key);
        }
    };
}

exports.createCache = createCache;
//# sourceMappingURL=cache.cjs.map
