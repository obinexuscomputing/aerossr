
import { CacheItem, CacheStats, CacheOptions } from "@/types";
import { CacheStoreBase } from "@/types/index.d";


export class CacheManager<T> {
  private cache: Map<string, CacheItem<T>>;
  private maxSize: number;
  private ttl?: number;
  private stats: CacheStats;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? Infinity;
    this.ttl = options.ttl;
    this.stats = {
      size: 0,
      hits: 0,
      misses: 0,
      expired: 0,
      evicted: 0,
      evictions: 0,
      expirations: 0
    };
  }

  /**
   * Gets a value from cache
   */
  public get(key: string): T | undefined {
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
  public set(key: string, value: T, options: CacheOptions = {}): void {
    // Handle max size - remove oldest if needed
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const itemTtl = options.ttl ?? this.ttl;
    const expires = itemTtl ? Date.now() + itemTtl : undefined;
    
    this.cache.set(key, {
      value,
      expires,
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      hits: 0,
      priority: 0
    });

    this.stats.size = this.cache.size;
  }

  /**
   * Clears the entire cache
   */
  public clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Removes a specific key from cache
   */
  public delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.stats.size = this.cache.size;
    }
    return result;
  }

  /**
   * Checks if a key exists in cache
   */
  public has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
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
  public keys(): string[] {
    const validKeys: string[] = [];
    for (const [key, item] of this.cache.entries()) {
      if (!this.isExpired(item)) {
        validKeys.push(key);
      } else {
        this.cache.delete(key);
        this.stats.expired++;
      }
    }
    return validKeys;
  }

  /**
   * Gets cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Updates cache configuration
   */
  public configure(options: CacheOptions): void {
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
  public prune(): number {
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
  private isExpired(item: CacheItem<T>): boolean {
    return item.expires !== undefined && item.expires <= Date.now();
  }

  /**
   * Evicts the oldest item from cache
   */
  private evictOldest(): void {
    if (this.cache.size <= 0) return;
    
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
  private resetStats(): void {
    this.stats = {
      size: 0,
      hits: 0,
      misses: 0,
      expired: 0,
      evicted: 0,
      evictions: 0,
      expirations: 0
    };
  }
}

export function createCache<T>(): CacheStoreBase<T> {
  const store = new Map<string, T>();

  return {
    size: store.size,

    get(key: string) {
      return store.get(key);
    },

    set(key: string, value: T) {
      store.set(key, value);
    },

    clear() {
      store.clear();
    }
  };
}