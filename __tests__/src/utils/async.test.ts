import { AsyncUtils } from "../../../src/utils/AsyncUtils";

describe('AsyncUtils', () => {
  let asyncUtils: AsyncUtils;

  beforeEach(() => {
    asyncUtils = new AsyncUtils();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    asyncUtils.clearTimeouts();
  });

  describe('isPromise', () => {
    it('should identify different types of promises', () => {
      expect(asyncUtils.isPromise(Promise.resolve())).toBe(true);
      expect(asyncUtils.isPromise(new Promise(() => {}))).toBe(true);
      expect(asyncUtils.isPromise({ then: () => {} })).toBe(true);
      expect(asyncUtils.isPromise({ then: 'not a function' })).toBe(false);
    });
  });

  describe('ensureAsync', () => {
    it('should handle timeout option', async () => {
      const fn = jest.fn().mockImplementation(() => new Promise(resolve => {
        setTimeout(resolve, 2000);
      }));
      
      const asyncFn = asyncUtils.ensureAsync(fn, { timeout: 1000 });
      
      const promise = asyncFn();
      jest.advanceTimersByTime(1000);
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
      
      // Advance timers for retries
      for (let i = 0; i < 2; i++) {
        jest.advanceTimersByTime(100);
        await Promise.resolve(); // Let retry promises resolve
      }

      const result = await promise;
      expect(result).toBe(42);
      expect(attempts).toBe(3);
    }, 1000);

    it('should handle exponential backoff', async () => {
      const onRetry = jest.fn();
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);

      const asyncFn = asyncUtils.ensureAsync(fn, {
        retries: 3,
        backoff: 'exponential',
        backoffDelay: 100,
        onRetry
      });

      const promise = asyncFn();

      // Advance timers for exponential backoff
      for (let i = 0; i < 3; i++) {
        const delay = 100 * Math.pow(2, i);
        jest.advanceTimersByTime(delay);
        await Promise.resolve();
      }

      await expect(promise).rejects.toThrow('Test error');
      expect(onRetry).toHaveBeenCalledTimes(3);
    }, 1000);
  });

  describe('withConcurrency', () => {
    it('should execute promises with concurrency limit', async () => {
      const resolved: number[] = [];
      const tasks = [1, 2, 3, 4].map(num => () => 
        new Promise<number>(resolve => {
          setTimeout(() => {
            resolved.push(num);
            resolve(num);
          }, 100);
        })
      );

      const promise = asyncUtils.withConcurrency(tasks, 2);
      
      // Advance time to allow first batch to complete
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(resolved.length).toBe(2);

      // Advance time for second batch
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const results = await promise;
      expect(results).toEqual([1, 2, 3, 4]);
      expect(resolved.length).toBe(4);
    });

    it('should handle errors in concurrent tasks', async () => {
      const tasks = [
        () => Promise.resolve(1),
        () => Promise.reject(new Error('Task failed')),
        () => Promise.resolve(3)
      ];

      await expect(asyncUtils.withConcurrency(tasks, 2))
        .rejects.toThrow('Task failed');
    });
  });

  describe('debounceAsync', () => {
    it('should debounce function calls', async () => {
      const fn = jest.fn().mockResolvedValue(42);
      const debouncedFn = asyncUtils.debounceAsync(fn, 1000);

      // Call function multiple times
      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(500);
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);
      await Promise.resolve(); // Let promises resolve
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should return latest call result', async () => {
      let counter = 0;
      const fn = jest.fn().mockImplementation(() => Promise.resolve(++counter));
      const debouncedFn = asyncUtils.debounceAsync(fn, 1000);

      const promise1 = debouncedFn();
      const promise2 = debouncedFn();
      const promise3 = debouncedFn();

      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Let promises resolve

      const results = await Promise.all([promise1, promise2, promise3]);
      expect(results).toEqual([1, 1, 1]);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should clear all timeouts', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const fn = () => new Promise(resolve => setTimeout(resolve, 1000));
      
      asyncUtils.ensureAsync(fn)();
      asyncUtils.clearTimeouts();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});