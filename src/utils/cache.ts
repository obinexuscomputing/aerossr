export interface CacheStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttl?: number): void;
  clear(): void;
  has(key: string): boolean;
  delete(key: string): boolean;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
}

export function createCache<T>(options: CacheOptions = {}): CacheStore<T> {
  const cache = new Map<string, { value: T; expires?: number }>();
  const { ttl, maxSize } = options;

  const cleanup = () => {
    if (!ttl) return;
    const now = Date.now();
    for (const [key, item] of cache.entries()) {
      if (item.expires && item.expires <= now) {
        cache.delete(key);
      }
    }
  };

  return {
    get(key: string): T | undefined {
      cleanup();
      const item = cache.get(key);
      return item && (!item.expires || item.expires > Date.now()) 
        ? item.value 
        : undefined;
    },
    set(key: string, value: T, itemTtl?: number): void {
      cleanup();
      if (maxSize && cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }
      cache.set(key, {
        value,
        expires: itemTtl || ttl ? Date.now() + (itemTtl || ttl!) : undefined
      });
    },
    clear(): void {
      cache.clear();
    },
    has(key: string): boolean {
      cleanup();
      const item = cache.get(key);
      return item !== undefined && (!item.expires || item.expires > Date.now());
    },
    delete(key: string): boolean {
      return cache.delete(key);
    }
  };
}