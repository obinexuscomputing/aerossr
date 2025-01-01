export interface CacheStore<T> {
    get(key: string): T | undefined;
    set(key: string, value: T, ttl?: number): void;
    clear(): void;
    has(key: string): boolean;
    delete(key: string): boolean;
}
export interface CacheOptions {
    ttl?: number;
    maxSize?: number;
}
export declare function createCache<T>(options?: CacheOptions): CacheStore<T>;
//# sourceMappingURL=cache.d.ts.map