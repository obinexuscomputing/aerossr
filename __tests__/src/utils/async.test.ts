import { AsyncUtils } from '../../../src/utils/AsyncUtils';

describe('AsyncUtils', () => {
  let asyncUtils: AsyncUtils;

  beforeEach(() => {
    asyncUtils = new AsyncUtils();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isPromise', () => {
    it('should identify different types of promises', () => {
      expect(asyncUtils.isPromise(Promise.resolve())).toBe(true);
      expect(asyncUtils.isPromise(new Promise(() => {}))).toBe(true);
      expect(asyncUtils.isPromise({ then: () => {} })).toBe(true);
      
      expect(asyncUtils.isPromise(undefined)).toBe(false);
      expect(asyncUtils.isPromise(null)).toBe(false);
      expect(asyncUtils.isPromise(42)).toBe(false);
      expect(asyncUtils.isPromise({ then: 'not a function' })).toBe(false);
    });
  });

  describe('ensureAsync', () => {
    it('should handle timeout option', async () => {
      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 42;
      };
      
      const wrappedFn = asyncUtils.ensureAsync(slowFn, { timeout: 1000 });
      
      const promise = wrappedFn();
      jest.advanceTimersByTime(1500);
      
      await expect(promise).rejects.toThrow('Operation timed out');
    });

    it('should handle retry option', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) throw new Error('Failed attempt');
        return Promise.resolve(42);
      });

      const wrappedFn = asyncUtils.ensureAsync(fn, {
        retries: 3,
        backoffDelay: 100
      });

      const promise = wrappedFn();
      
      // Advance past retries
      for (let i = 0; i < 2; i++) {
        jest.advanceTimersByTime(100);
        await Promise.resolve(); // Let promises resolve
      }

      const result = await promise;
      expect(result).toBe(42);
      expect(attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should handle exponential backoff', async () => {
      const onRetry = jest.fn();
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);

      const wrappedFn = asyncUtils.ensureAsync(fn, {
        retries: 3,
        backoff: 'exponential',
        backoffDelay: 100,
        onRetry
      });

      const promise = wrappedFn();

      // Advance through exponential delays: 100, 200, 400
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      jest.advanceTimersByTime(200);
      await Promise.resolve();
      jest.advanceTimersByTime(400);
      await Promise.resolve();

      await expect(promise).rejects.toThrow(error);
      expect(onRetry).toHaveBeenCalledTimes(3);
    });
  });

  describe('withConcurrency', () => {
    it('should execute promises with concurrency limit', async () => {
      const taskResults = [1, 2, 3, 4];
      const tasks = taskResults.map((result) => 
        jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return result;
        })
      );

      const promise = asyncUtils.withConcurrency(tasks, 2);
      
      // Advance time to allow first batch to complete
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      
      // Advance for second batch
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const results = await promise;
      expect(results).toEqual(taskResults);
    });

    it('should handle errors in concurrent tasks', async () => {
      const error = new Error('Task failed');
      const tasks = [
        jest.fn().mockResolvedValue(1),
        jest.fn().mockRejectedValue(error),
        jest.fn().mockResolvedValue(3)
      ];

      const promise = asyncUtils.withConcurrency(tasks, 2);
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      await expect(promise).rejects.toThrow(error);
    });
  });

  describe('debounceAsync', () => {
    it('should debounce function calls', async () => {
      const fn = jest.fn().mockResolvedValue(42);
      const debouncedFn = asyncUtils.debounceAsync(fn, 1000);

      // Multiple calls within debounce window
      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(500);
      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);
      await Promise.resolve();
      
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
      await Promise.resolve();

      const results = await Promise.all([promise1, promise2, promise3]);
      expect(results).toEqual([1, 1, 1]);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});