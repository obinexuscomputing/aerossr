import { isPromise, ensureAsync } from '../../src/utils/async';

describe('Async Utilities', () => {
  describe('isPromise', () => {
    it('should return true for Promise objects', () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      expect(isPromise(new Promise(() => {}))).toBe(true);
      expect(isPromise(Promise.reject().catch(() => {}))).toBe(true);
    });

    it('should return true for thenable objects', () => {
      const thenable = { then: () => {} };
      expect(isPromise(thenable)).toBe(true);
    });

    it('should return false for non-Promise values', () => {
      expect(isPromise(undefined)).toBe(false);
      expect(isPromise(null)).toBe(false);
      expect(isPromise(42)).toBe(false);
      expect(isPromise('string')).toBe(false);
      expect(isPromise({})).toBe(false);
      expect(isPromise([])).toBe(false);
      expect(isPromise(() => {})).toBe(false);
    });

    it('should return false for objects with non-function then property', () => {
      expect(isPromise({ then: 'not a function' })).toBe(false);
      expect(isPromise({ then: 42 })).toBe(false);
    });
  });

  describe('ensureAsync', () => {
    it('should wrap synchronous functions to return promises', async () => {
      const syncFn = (x: number) => x * 2;
      const asyncFn = ensureAsync(syncFn);

      const result = await asyncFn(21);
      expect(result).toBe(42);
      expect(isPromise(asyncFn(21))).toBe(true);
    });

    it('should preserve async function behavior', async () => {
      const originalAsyncFn = async (x: number) => x * 2;
      const wrappedAsyncFn = ensureAsync(originalAsyncFn);

      const result = await wrappedAsyncFn(21);
      expect(result).toBe(42);
      expect(isPromise(wrappedAsyncFn(21))).toBe(true);
    });

    it('should handle promises returned by functions', async () => {
      const promiseFn = (x: number) => Promise.resolve(x * 2);
      const wrappedFn = ensureAsync(promiseFn);

      const result = await wrappedFn(21);
      expect(result).toBe(42);
      expect(isPromise(wrappedFn(21))).toBe(true);
    });

    it('should handle functions with multiple arguments', async () => {
      const syncFn = (a: number, b: string, c: boolean) => ({a, b, c});
      const asyncFn = ensureAsync(syncFn);

      const result = await asyncFn(1, 'test', true);
      expect(result).toEqual({a: 1, b: 'test', c: true});
    });

    it('should propagate errors from synchronous functions', async () => {
      const errorFn = () => {
        throw new Error('Test error');
      };
      const asyncFn = ensureAsync(errorFn);

      await expect(asyncFn()).rejects.toThrow('Test error');
    });

    it('should propagate errors from asynchronous functions', async () => {
      const errorFn = async () => {
        throw new Error('Async test error');
      };
      const wrappedFn = ensureAsync(errorFn);

      await expect(wrappedFn()).rejects.toThrow('Async test error');
    });

    it('should handle functions that return undefined', async () => {
      const voidFn = () => undefined;
      const asyncFn = ensureAsync(voidFn);

      const result = await asyncFn();
      expect(result).toBeUndefined();
    });

    it('should maintain this context', async () => {
      class TestClass {
        private value: number;

        constructor(value: number) {
          this.value = value;
        }

        getValue() {
          return this.value;
        }
      }

      const instance = new TestClass(42);
      const asyncGetValue = ensureAsync(instance.getValue.bind(instance));

      const result = await asyncGetValue();
      expect(result).toBe(42);
    });
  });
});