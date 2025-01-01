interface CacheItem<T> {
  value: T;
  expires?: number | undefined;
}

interface CacheStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, itemTtl?: number, ttl?: number): void;
  clear(): void;
}

export function createCache<T>(): CacheStore<T> {
  const cache = new Map<string, CacheItem<T>>();

  return {
    get: (key: string): T | undefined => {
      const item = cache.get(key);
      if (!item) return undefined;
      
      if (item.expires && item.expires < Date.now()) {
        cache.delete(key);
        return undefined;
      }
      
      return item.value;
    },
    set: (key: string, value: T, itemTtl?: number, ttl?: number): void => {
      const expires = itemTtl || ttl
        ? Date.now() + (itemTtl || ttl!)
        : undefined;
        
      cache.set(key, { value, expires });
    },
    clear: (): void => cache.clear()
  };
}