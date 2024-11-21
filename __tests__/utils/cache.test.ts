
describe('Cache Utilities', () => {
  test('should create empty cache', () => {
    const cache = createCache<string>();
    expect(cache.get('any')).toBeUndefined();
  });

  test('should set and get values', () => {
    const cache = createCache<number>();
    cache.set('test', 123);
    expect(cache.get('test')).toBe(123);
  });

  test('should clear all values', () => {
    const cache = createCache<string>();
    cache.set('a', 'value1');
    cache.set('b', 'value2');
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  test('should handle different value types', () => {
    const cache = createCache<any>();
    const testObj = { test: true };
    const testArr = [1, 2, 3];
    
    cache.set('string', 'test');
    cache.set('number', 123);
    cache.set('object', testObj);
    cache.set('array', testArr);
    
    expect(cache.get('string')).toBe('test');
    expect(cache.get('number')).toBe(123);
    expect(cache.get('object')).toBe(testObj);
    expect(cache.get('array')).toBe(testArr);
  });

  test('should handle undefined and null values', () => {
    const cache = createCache<any>();
    cache.set('undefined', undefined);
    cache.set('null', null);
    
    expect(cache.get('undefined')).toBeUndefined();
    expect(cache.get('null')).toBeNull();
  });
});