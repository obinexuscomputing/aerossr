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
  // types/cache.d.ts

/**
 * Options for configuring individual cache items
 */
export interface CacheItemOptions {
    /** Time-to-live in milliseconds */
    ttl?: number;
    /** Maximum size in bytes (for size-based eviction) */
    maxSize?: number;
    /** Priority level for eviction policies */
    priority?: number;
  }
  
  /**
   * Represents a cached item with metadata
   */
  export interface CacheItem<T> {
    /** The actual cached value */
    value: T;
    /** When the item was created */
    createdAt: number;
    /** When the item expires (if TTL is set) */
    expiresAt?: number;
    /** Size in bytes (if tracking) */
    size?: number;
    /** Number of times this item has been accessed */
    hits: number;
    /** Priority level for eviction */
    priority: number;
  }
  
  /**
   * Statistics about cache operations and state
   */
  export interface CacheStats {
    /** Total number of items in cache */
    size: number;
    /** Total hits (cache retrievals) */
    hits: number;
    /** Total misses (failed retrievals) */
    misses: number;
    /** Number of items evicted */
    evictions: number;
    /** Number of items expired */
    expirations: number;
    /** Estimated memory usage in bytes */
    memoryUsage?: number;
  }
  
  /**
   * Configuration options for the cache store
   */
  export interface CacheStoreOptions {
    /** Default TTL for items in milliseconds */
    ttl?: number;
    /** Maximum number of items to store */
    maxSize?: number;
    /** Maximum memory usage in bytes */
    maxMemory?: number;
    /** Eviction policy: 'lru' | 'lfu' | 'priority' */
    evictionPolicy?: 'lru' | 'lfu' | 'priority';
    /** Whether to track memory usage */
    trackMemoryUsage?: boolean;
    /** Whether to persist cache to disk */
    persist?: boolean;
    /** Path for persistence (if enabled) */
    persistPath?: string;
  }
  
  /**
   * Core cache store interface
   */
  export interface CacheStoreBase<T> {
    /** Get a cached value by key */
    get(key: string): T | undefined;
    /** Set a cached value with key */
    set(key: string, value: T): void;
    /** Clear all cached values */
    clear(): void;
  }
  
  /**
   * Extended cache store interface with additional features
   */
  export interface CacheStore<T> extends CacheStoreBase<T> {
    /** Get a value with options */
    get(key: string, defaultValue?: T): T | undefined;
    
    /** Set a value with options */
    set(key: string, value: T, options?: CacheItemOptions): void;
    
    /** Check if key exists */
    has(key: string): boolean;
    
    /** Delete a specific key */
    delete(key: string): boolean;
    
    /** Get all keys */
    keys(): string[];
    
    /** Get all values */
    values(): T[];
    
    /** Get all entries */
    entries(): [string, T][];
    
    /** Get cache statistics */
    getStats(): CacheStats;
    
    /** Configure cache options */
    configure(options: Partial<CacheStoreOptions>): void;
    
    /** Prune expired entries */
    prune(): number;
    
    /** Subscribe to cache events */
    on(event: 'hit' | 'miss' | 'set' | 'delete' | 'clear' | 'expire', 
       callback: (key: string, value?: T) => void): void;
    
    /** Unsubscribe from cache events */
    off(event: 'hit' | 'miss' | 'set' | 'delete' | 'clear' | 'expire',
        callback: (key: string, value?: T) => void): void;
}
  /**
   * Factory function to create a new cache store
   */
  export declare function createCache<T>(options?: CacheStoreOptions): CacheStore<T>;
  
  /**
   * Cache persistence manager interface
   */
  export interface CachePersistenceManager<T> {
    /** Save cache to storage */
    save(cache: Map<string, CacheItem<T>>): Promise<void>;
    /** Load cache from storage */
    load(): Promise<Map<string, CacheItem<T>>>;
    /** Clear persisted cache */
    clear(): Promise<void>;
  }
  
  /**
   * Cache eviction manager interface
   */
  export interface CacheEvictionManager<T> {
    /** Select items to evict based on policy */
    selectItemsToEvict(
      items: Map<string, CacheItem<T>>,
      count: number
    ): string[];
    /** Update item metadata for eviction decisions */
    updateMetadata(key: string, item: CacheItem<T>): void;
  }