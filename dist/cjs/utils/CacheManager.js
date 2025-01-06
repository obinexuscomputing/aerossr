/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

// src/utils/cacheManager.ts
class CacheManager {
    cache;
    maxSize;
    ttl;
    stats;
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize ?? Infinity;
        this.ttl = options.ttl;
        this.stats = {
            size: 0,
            hits: 0,
            misses: 0,
            expired: 0,
            evicted: 0
        };
    }
    /**
     * Gets a value from cache
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.stats.misses++;
            return undefined;
        }
        if (this.isExpired(item)) {
            this.cache.delete(key);
            this.stats.expired++;
            this.stats.misses++;
            return undefined;
        }
        // Update last accessed time and stats
        item.lastAccessed = Date.now();
        this.stats.hits++;
        return item.value;
    }
    /**
     * Sets a value in cache
     */
    set(key, value, options = {}) {
        // Handle max size - remove oldest if needed
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        const itemTtl = options.ttl ?? this.ttl;
        const expires = itemTtl ? Date.now() + itemTtl : undefined;
        this.cache.set(key, {
            value,
            expires,
            lastAccessed: Date.now()
        });
        this.stats.size = this.cache.size;
    }
    /**
     * Clears the entire cache
     */
    clear() {
        this.cache.clear();
        this.resetStats();
    }
    /**
     * Removes a specific key from cache
     */
    delete(key) {
        const result = this.cache.delete(key);
        if (result) {
            this.stats.size = this.cache.size;
        }
        return result;
    }
    /**
     * Checks if a key exists in cache
     */
    has(key) {
        const item = this.cache.get(key);
        if (!item)
            return false;
        if (this.isExpired(item)) {
            this.cache.delete(key);
            this.stats.expired++;
            return false;
        }
        return true;
    }
    /**
     * Gets all valid keys in cache
     */
    keys() {
        const validKeys = [];
        for (const [key, item] of this.cache.entries()) {
            if (!this.isExpired(item)) {
                validKeys.push(key);
            }
            else {
                this.cache.delete(key);
                this.stats.expired++;
            }
        }
        return validKeys;
    }
    /**
     * Gets cache statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Updates cache configuration
     */
    configure(options) {
        if (options.maxSize !== undefined) {
            this.maxSize = options.maxSize;
            while (this.cache.size > this.maxSize) {
                this.evictOldest();
            }
        }
        if (options.ttl !== undefined) {
            this.ttl = options.ttl;
        }
    }
    /**
     * Removes expired items from cache
     */
    prune() {
        let pruned = 0;
        for (const [key, item] of this.cache.entries()) {
            if (this.isExpired(item)) {
                this.cache.delete(key);
                this.stats.expired++;
                pruned++;
            }
        }
        this.stats.size = this.cache.size;
        return pruned;
    }
    /**
     * Checks if an item is expired
     */
    isExpired(item) {
        return item.expires !== undefined && item.expires <= Date.now();
    }
    /**
     * Evicts the oldest item from cache
     */
    evictOldest() {
        if (this.cache.size <= 0)
            return;
        let oldestKey = '';
        let oldestAccess = Infinity;
        for (const [key, item] of this.cache.entries()) {
            if (item.lastAccessed < oldestAccess) {
                oldestAccess = item.lastAccessed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.stats.evicted++;
            this.stats.size = this.cache.size;
        }
    }
    /**
     * Resets cache statistics
     */
    resetStats() {
        this.stats = {
            size: 0,
            hits: 0,
            misses: 0,
            expired: 0,
            evicted: 0
        };
    }
}
function createCache() {
    const store = new Map();
    return {
        size: store.size,
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

exports.CacheManager = CacheManager;
exports.createCache = createCache;
//# sourceMappingURL=CacheManager.js.map
