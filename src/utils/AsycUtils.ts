// src/utils/AsyncUtils.ts
import type { AnyFunction } from '../types';

export interface AsyncOptions {
  timeout?: number;
  retries?: number;
  backoff?: 'fixed' | 'exponential';
  backoffDelay?: number;
  onRetry?: (error: Error, attempt: number) => void | Promise<void>;
}

export class AsyncUtils {
  private readonly defaultOptions: Required<AsyncOptions>;

  constructor(options: Partial<AsyncOptions> = {}) {
    this.defaultOptions = {
      timeout: 30000,
      retries: 0,
      backoff: 'fixed',
      backoffDelay: 1000,
      onRetry: () => {},
      ...options
    };
  }

  /**
   * Type guard to check if a value is a Promise
   */
  public isPromise<T = unknown>(value: unknown): value is Promise<T> {
    return Boolean(
      value && 
      typeof value === 'object' && 
      'then' in value && 
      typeof value.then === 'function'
    );
  }

  /**
   * Ensures a function returns a Promise
   */
  public ensureAsync<T extends AnyFunction>(
    fn: T,
    options: Partial<AsyncOptions> = {}
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      let lastError: Error | undefined;
      
      for (let attempt = 0; attempt <= mergedOptions.retries; attempt++) {
        try {
          const timeoutPromise = this.createTimeout(mergedOptions.timeout);
          const resultPromise = fn(...args);
          
          const result = await Promise.race([
            resultPromise,
            timeoutPromise
          ]);

          return result as ReturnType<T>;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < mergedOptions.retries) {
            await mergedOptions.onRetry(lastError, attempt + 1);
            await this.delay(this.calculateBackoff(attempt, mergedOptions));
          }
        }
      }

      throw lastError || new Error('Operation failed');
    };
  }

  /**
   * Creates a retry wrapper for any async function
   */
  public withRetry<T extends AnyFunction>(
    fn: T,
    options: Partial<AsyncOptions> = {}
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return this.ensureAsync(fn, options);
  }

  /**
   * Executes multiple promises with concurrency limit
   */
  public async withConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const execution = task().then(result => {
        results.push(result);
        executing.splice(executing.indexOf(execution), 1);
      });

      executing.push(execution);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Creates a debounced version of an async function
   */
  public debounceAsync<T extends AnyFunction>(
    fn: T,
    wait: number
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeoutId: NodeJS.Timeout;
    let pendingPromise: Promise<ReturnType<T>> | null = null;

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      if (pendingPromise) {
        clearTimeout(timeoutId);
      }

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            const result = await fn(...args);
            pendingPromise = null;
            resolve(result);
          } catch (error) {
            pendingPromise = null;
            reject(error);
          }
        }, wait);

        pendingPromise = Promise.race([
          new Promise((_, reject) => {
            timeoutId.unref?.(); // Optional chaining for non-Node environments
          })
        ]) as Promise<ReturnType<T>>;
      });
    };
  }

  /**
   * Creates a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);
      timeoutId.unref?.(); // Optional chaining for non-Node environments
    });
  }

  /**
   * Calculates backoff delay based on strategy
   */
  private calculateBackoff(attempt: number, options: Required<AsyncOptions>): number {
    if (options.backoff === 'exponential') {
      return options.backoffDelay * Math.pow(2, attempt);
    }
    return options.backoffDelay;
  }

  /**
   * Creates a delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeoutId = setTimeout(resolve, ms);
      timeoutId.unref?.(); // Optional chaining for non-Node environments
    });
  }

  /**
   * Gets the current default options
   */
  public getDefaultOptions(): Required<AsyncOptions> {
    return { ...this.defaultOptions };
  }

  /**
   * Updates the default options
   */
  public setDefaultOptions(options: Partial<AsyncOptions>): void {
    Object.assign(this.defaultOptions, options);
  }
}

// Export singleton instance
export const asyncUtils = new AsyncUtils();