import { CacheStoreBase } from "@/types";
export interface CacheItem<T> {
    value: T;
    expires?: number;
    lastAccessed: number;
}
export interface CacheOptions {
    ttl?: number;
    maxSize?: number;
}
export interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    expired: number;
    evicted: number;
}
export declare class CacheManager<T> {
    private cache;
    private maxSize;
    private ttl?;
    private stats;
    constructor(options?: CacheOptions);
    /**
     * Gets a value from cache
     */
    get(key: string): T | undefined;
    /**
     * Sets a value in cache
     */
    set(key: string, value: T, options?: CacheOptions): void;
    /**
     * Clears the entire cache
     */
    clear(): void;
    /**
     * Removes a specific key from cache
     */
    delete(key: string): boolean;
    /**
     * Checks if a key exists in cache
     */
    has(key: string): boolean;
    /**
     * Gets all valid keys in cache
     */
    keys(): string[];
    /**
     * Gets cache statistics
     */
    getStats(): CacheStats;
    /**
     * Updates cache configuration
     */
    configure(options: CacheOptions): void;
    /**
     * Removes expired items from cache
     */
    prune(): number;
    /**
     * Checks if an item is expired
     */
    private isExpired;
    /**
     * Evicts the oldest item from cache
     */
    private evictOldest;
    /**
     * Resets cache statistics
     */
    private resetStats;
}
export declare function createCache<T>(): CacheStoreBase<T>;
//# sourceMappingURL=CacheManager.d.ts.map