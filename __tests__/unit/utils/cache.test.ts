import { CacheManager } from "../../../src/utils/CacheManager";

describe('CacheManager', () => {
  let cache: CacheManager<string>;
  let mockNow: number;

  beforeEach(() => {
    mockNow = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
    cache = new CacheManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete specific keys', () => {
      cache.set('key', 'value');
      expect(cache.delete('key')).toBe(true);
      expect(cache.get('key')).toBeUndefined();
    });

    it('should clear all cache entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.keys()).toHaveLength(0);
    });
  });

  describe('Expiration', () => {
    it('should respect TTL option', () => {
      cache = new CacheManager({ ttl: 1000 });
      cache.set('key', 'value');
      
      mockNow += 500;
      expect(cache.get('key')).toBe('value');
      
      mockNow += 600; // Total 1100ms
      expect(cache.get('key')).toBeUndefined();
    });

    it('should handle per-item TTL', () => {
      cache.set('key1', 'value1', { ttl: 1000 });
      cache.set('key2', 'value2', { ttl: 2000 });
      
      mockNow += 1500;
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should prune expired items', () => {
      cache.set('key1', 'value1', { ttl: 1000 });
      cache.set('key2', 'value2', { ttl: 2000 });
      
      mockNow += 1500;
      const pruned = cache.prune();
      expect(pruned).toBe(1);
      expect(cache.keys()).toHaveLength(1);
    });
  });

  describe('Size Management', () => {
    it('should respect max size', () => {
      cache = new CacheManager({ maxSize: 2 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.keys()).toHaveLength(2);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should evict least recently accessed items', () => {
      cache = new CacheManager({ maxSize: 2 });
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      mockNow += 100;
      cache.get('key1'); // Access key1 to make it more recent
      mockNow += 100;
      cache.set('key3', 'value3');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key', 'value');
      
      cache.get('key');
      cache.get('key');
      cache.get('nonexistent');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should track evictions', () => {
      cache = new CacheManager({ maxSize: 1 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.evicted).toBe(1);
    });
  });
});
