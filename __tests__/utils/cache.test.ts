import { createCache } from '../../src/utils/cache';

describe('Cache Store', () => {
  it('should store and retrieve values', () => {
    const cache = createCache<string>();
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('should handle TTL expiration', async () => {
    const cache = createCache<string>({ ttl: 100 });
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
    
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('key')).toBeUndefined();
  });

  it('should respect max size limit', () => {
    const cache = createCache<string>({ maxSize: 2 });
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
  });
});