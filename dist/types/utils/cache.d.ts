interface CacheStore<T> {
    get(key: string): T | undefined;
    set(key: string, value: T, ttl?: number): void;
    clear(): void;
    has(key: string): boolean;
    delete(key: string): boolean;
}
interface CacheOptions {
    ttl?: number;
    maxSize?: number;
}
declare function createCache<T>(options?: CacheOptions): CacheStore<T>;

export { CacheOptions, CacheStore, createCache };
