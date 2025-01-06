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

export function createCache<T>(defaultOptions: CacheOptions = {}): CacheStore<T> {
  const { maxSize = Infinity, ttl } = defaultOptions;
  const cache = new Map<string, CacheItem<T>>();

  function evictOldest() {
    if (cache.size <= 0) return;
    
    let oldestKey = '';
    let oldestAccess = Infinity;

    for (const [key, item] of cache.entries()) {
      if (item.lastAccessed < oldestAccess) {
        oldestAccess = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  function isExpired(item: CacheItem<T>): boolean {
    return item.expires !== undefined && item.expires <= Date.now();
  }

  return {
    get(key: string): T | undefined {
      const item = cache.get(key);
      
      if (!item) {
        return undefined;
      }

      if (isExpired(item)) {
        cache.delete(key);
        return undefined;
      }

      // Update last accessed time
      item.lastAccessed = Date.now();
      return item.value;
    },

    set(key: string, value: T, options: CacheOptions = {}): void {
      // Handle max size - remove oldest if needed
      if (cache.size >= maxSize) {
        evictOldest();
      }

      const itemTtl = options.ttl ?? ttl;
      const expires = itemTtl ? Date.now() + itemTtl : undefined;
      
      cache.set(key, {
        value,
        expires,
        lastAccessed: Date.now()
      });
    },

    clear(): void {
      cache.clear();
    }
  };
}