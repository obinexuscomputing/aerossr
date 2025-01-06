/*!
 * @obinexuscomputing/aerossr v0.1.1
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
'use strict';

function createCache(defaultOptions = {}) {
    const { maxSize = Infinity, ttl } = defaultOptions;
    const cache = new Map();
    function evictOldest() {
        if (cache.size <= 0)
            return;
        let oldestKey = '';
        let oldestAccess = Infinity;
        for (const [key, item] of cache.entries()) {
            if (item.lastAccessed < oldestAccess) {
                oldestAccess = item.lastAccessed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            cache.delete(oldestKey);
        }
    }
    function isExpired(item) {
        return item.expires !== undefined && item.expires <= Date.now();
    }
    return {
        get(key) {
            const item = cache.get(key);
            if (!item) {
                return undefined;
            }
            if (isExpired(item)) {
                cache.delete(key);
                return undefined;
            }
            // Update last accessed time
            item.lastAccessed = Date.now();
            return item.value;
        },
        set(key, value, options = {}) {
            // Handle max size - remove oldest if needed
            if (cache.size >= maxSize) {
                evictOldest();
            }
            const itemTtl = options.ttl ?? ttl;
            const expires = itemTtl ? Date.now() + itemTtl : undefined;
            cache.set(key, {
                value,
                expires,
                lastAccessed: Date.now()
            });
        },
        clear() {
            cache.clear();
        }
    };
}

exports.createCache = createCache;
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=cache.js.map
