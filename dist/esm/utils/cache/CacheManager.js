/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
function createCache() {
    const store = new Map();
    return {
        get(key) {
            return store.get(key);
        },
        set(key, value) {
            store.set(key, value);
        },
        clear() {
            store.clear();
        }
    };
}

export { createCache };
//# sourceMappingURL=CacheManager.js.map
