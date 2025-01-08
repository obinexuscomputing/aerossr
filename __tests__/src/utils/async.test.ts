import { AsyncUtils } from "../../../src/utils/AsyncUtils";

describe('AsyncUtils', () => {
  let asyncUtils: AsyncUtils;
  let mockNow: number;

  beforeEach(() => {
    mockNow = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
    asyncUtils = new AsyncUtils();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('isPromise', () => {
    it('should identify different types of promises', () => {
      expect(asyncUtils.isPromise(Promise.resolve())).toBe(true);
      expect(asyncUtils.isPromise(new Promise(() => {}))).toBe(true);
      expect(asyncUtils.isPromise({ then: () => {} })).toBe(true);
      expect(asyncUtils.isPromise(42)).toBe(false);
      expect(asyncUtils.isPromise(null)).toBe(false);
      expect(asyncUtils.isPromise({ then: 'not-a-function' })).toBe(false);
    });
  });

  describe('ensureAsync', () => {
    it('should handle timeout option', async () => {
      const fn = jest.fn(() => new Promise(resolve => setTimeout(resolve, 2000)));
      const asyncFn = asyncUtils.ensureAsync(fn, { timeout: 1000 });
      
      const promise = asyncFn();
      jest.advanceTimersByTime(1100);
      await expect(promise).rejects.toThrow('Operation timed out');
    });

    it('should handle retry option', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) throw new Error('Failing');
        return 42;
      });

      const asyncFn = asyncUtils.ensureAsync(fn, { 
        retries: 3,
        backoffDelay: 100
      });

      const promise = asyncFn();
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(100);
        await Promise.resolve(); // Let pending promises resolve
      }

      const result = await promise;
      expect(result).toBe(42);
      expect(attempts).toBe(3);
    });
  });

  describe('withConcurrency', () => {
    it('should execute promises with concurrency limit', async () => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      const tasks = [
        jest.fn().mockImplementation(() => delay(100).then(() => 1)),
        jest.fn().mockImplementation(() => delay(100).then(() => 2)),
        jest.fn().mockImplementation(() => delay(100).then(() => 3))
      ];

      const promise = asyncUtils.withConcurrency(tasks, 2);
      jest.advanceTimersByTime(200);
      await Promise.resolve(); // Let pending promises resolve

      const results = await promise;
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('debounceAsync', () => {
    it('should debounce function calls', async () => {
      const fn = jest.fn().mockResolvedValue(42);
      const debouncedFn = asyncUtils.debounceAsync(fn, 1000);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(1100);
      await Promise.resolve(); // Let promises resolve
      
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});