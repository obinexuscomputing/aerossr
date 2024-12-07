function createCache() {
    const cache = new Map();
    return {
        get: (key) => cache.get(key),
        set: (key, value) => { cache.set(key, value); },
        clear: () => cache.clear()
    };
}

export { createCache };
//# sourceMappingURL=cache.js.map
