export interface CacheItem<T> {
    value: T;
    expires?: number | undefined;
}
export interface CacheOptions {
    ttl?: number;
    maxSize?: number;
}
export interface CacheStore<T> {
    get(key: string): T | undefined;
    set(key: string, value: T, itemTtl?: number, ttl?: number): void;
    clear(): void;
}
export declare function createCache<T>(): CacheStore<T>;
//# sourceMappingURL=cache.d.ts.map