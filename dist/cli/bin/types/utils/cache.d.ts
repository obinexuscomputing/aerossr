export interface CacheItem<T> {
    value: T;
    expires?: number;
    lastAccessed: number;
}
export interface CacheOptions {
    ttl?: number;
    maxSize?: number;
}
export interface CacheStore<T> {
    get(key: string): T | undefined;
    set(key: string, value: T, options?: CacheOptions): void;
    clear(): void;
}
export declare function createCache<T>(defaultOptions?: CacheOptions): CacheStore<T>;
//# sourceMappingURL=cache.d.ts.map