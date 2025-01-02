/*!
 * @obinexuscomputing/aerossr v0.1.0
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
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

export { createCache };
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=cache.js.map
