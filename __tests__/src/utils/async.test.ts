import { AsyncUtils } from "../../../src/utils/AsyncUtils";

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
    it('should return true for Promise objects', () => {
      expect(asyncUtils.isPromise(Promise.resolve())).toBe(true);
      expect(asyncUtils.isPromise(new Promise(() => {}))).toBe(true);
      expect(asyncUtils.isPromise(Promise.reject().catch(() => {}))).toBe(true);
    });

    it('should return true for thenable objects', () => {
      const thenable = { then: () => {} };
      expect(asyncUtils.isPromise(thenable)).toBe(true);
    });

    it('should return false for non-Promise values', () => {
      expect(asyncUtils.isPromise(undefined)).toBe(false);
      expect(asyncUtils.isPromise(null)).toBe(false);
      expect(asyncUtils.isPromise(42)).toBe(false);
      expect(asyncUtils.isPromise('string')).toBe(false);
      expect(asyncUtils.isPromise({})).toBe(false);
      expect(asyncUtils.isPromise([])).toBe(false);
      expect(asyncUtils.isPromise(() => {})).toBe(false);
    });

    it('should return false for objects with non-function then property', () => {
      expect(asyncUtils.isPromise({ then: 'not a function' })).toBe(false);
      expect(asyncUtils.isPromise({ then: 42 })).toBe(false);
    });
  });

  describe('ensureAsync', () => {
    it('should wrap synchronous functions to return promises', async () => {
      const syncFn = (x: number) => x * 2;
      const asyncFn = asyncUtils.ensureAsync(syncFn);
      const result = await asyncFn(21);
      expect(result).toBe(42);
      expect(asyncUtils.isPromise(asyncFn(21))).toBe(true);
    });

    it('should handle timeout option', async () => {
      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 42;
      };
      const asyncFn = asyncUtils.ensureAsync(slowFn, { timeout: 1000 });
      
      await expect(asyncFn()).rejects.toThrow('Operation timed out');
    });

    it('should handle retry option', async () => {
      let attempts = 0;
      const failingFn = () => {
        attempts++;
        if (attempts < 3) throw new Error('Failing');
        return 42;
      };

      const asyncFn = asyncUtils.ensureAsync(failingFn, { 
        retries: 3,
        backoffDelay: 100
      });

      const result = await asyncFn();
      expect(result).toBe(42);
      expect(attempts).toBe(3);
    });

    it('should handle exponential backoff', async () => {
      const onRetry = jest.fn();
      const failingFn = () => {
        throw new Error('Failing');
      };

      const asyncFn = asyncUtils.ensureAsync(failingFn, {
        retries: 3,
        backoff: 'exponential',
        backoffDelay: 100,
        onRetry
      });

      await expect(asyncFn()).rejects.toThrow('Failing');
      expect(onRetry).toHaveBeenCalledTimes(3);
    });
  });

  describe('withConcurrency', () => {
    it('should execute promises with concurrency limit', async () => {
      const tasks = [
        () => Promise.resolve(1),
        () => Promise.resolve(2),
        () => Promise.resolve(3),
        () => Promise.resolve(4)
      ];

      const results = await asyncUtils.withConcurrency(tasks, 2);
      expect(results).toEqual([1, 2, 3, 4]);
    });

    it('should handle errors in concurrent tasks', async () => {
      const tasks = [
        () => Promise.resolve(1),
        () => Promise.reject(new Error('Task failed')),
        () => Promise.resolve(3)
      ];

      await expect(asyncUtils.withConcurrency(tasks, 2)).rejects.toThrow('Task failed');
    });
  });

  describe('debounceAsync', () => {
    it('should debounce function calls', async () => {
      const fn = jest.fn().mockResolvedValue(42);
      const debouncedFn = asyncUtils.debounceAsync(fn, 1000);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(1000);
      
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
      
      const results = await Promise.all([promise1, promise2, promise3]);
      expect(results).toEqual([1, 1, 1]);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration', () => {
    it('should allow updating default options', () => {
      asyncUtils.setDefaultOptions({ timeout: 5000 });
      const options = asyncUtils.getDefaultOptions();
      expect(options.timeout).toBe(5000);
    });

    it('should merge options correctly', async () => {
      const fn = jest.fn().mockResolvedValue(42);
      const defaultOptions = { timeout: 5000, retries: 3 };
      const instanceOptions = { timeout: 1000 };
      
      asyncUtils.setDefaultOptions(defaultOptions);
      const wrappedFn = asyncUtils.ensureAsync(fn, instanceOptions);
      
      await wrappedFn();
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle synchronous errors', async () => {
      const errorFn = () => {
        throw new Error('Sync error');
      };
      const asyncFn = asyncUtils.ensureAsync(errorFn);
      await expect(asyncFn()).rejects.toThrow('Sync error');
    });

    it('should handle asynchronous errors', async () => {
      const errorFn = async () => {
        throw new Error('Async error');
      };
      const asyncFn = asyncUtils.ensureAsync(errorFn);
      await expect(asyncFn()).rejects.toThrow('Async error');
    });

    it('should handle non-Error objects', async () => {
      const errorFn = () => {
        throw 'String error';
      };
      const asyncFn = asyncUtils.ensureAsync(errorFn);
      await expect(asyncFn()).rejects.toThrow('String error');
    });
  });
});