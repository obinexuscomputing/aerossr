import { AnyFunction } from "@/types";

export interface AsyncOptions {
  timeout?: number;
  retries?: number;
  backoff?: 'fixed' | 'exponential';
  backoffDelay?: number;
  onRetry?: (error: Error, attempt: number) => void | Promise<void>;
}

export class AsyncUtils {
  private readonly defaultOptions: Required<AsyncOptions>;
  private timeoutIds: Set<NodeJS.Timeout>;

  constructor(options: Partial<AsyncOptions> = {}) {
    this.defaultOptions = {
      timeout: 30000,
      retries: 0,
      backoff: 'fixed',
      backoffDelay: 1000,
      onRetry: () => {},
      ...options
    };
    this.timeoutIds = new Set();
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
   * Creates a timeout promise with cleanup
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        this.timeoutIds.delete(timeoutId);
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);
      
      this.timeoutIds.add(timeoutId);
      timeoutId.unref?.();
    });
  }

  /**
   * Creates a delay promise with cleanup
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        this.timeoutIds.delete(timeoutId);
        resolve();
      }, ms);
      
      this.timeoutIds.add(timeoutId);
      timeoutId.unref?.();
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
          const resultPromise = Promise.resolve(fn(...args));
          
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
            continue;
          }
          break;
        }
      }

      throw lastError || new Error('Operation failed');
    };
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

    try {
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
    } catch (error) {
      this.clearTimeouts();
      throw error;
    }
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
        this.timeoutIds.delete(timeoutId);
      }

      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          this.timeoutIds.delete(timeoutId);
          try {
            const result = await fn(...args);
            pendingPromise = null;
            resolve(result);
          } catch (error) {
            pendingPromise = null;
            reject(error);
          }
        }, wait);

        this.timeoutIds.add(timeoutId);
        timeoutId.unref?.();
      });
    };
  }

  /**
   * Cleans up any pending timeouts
   */
  public clearTimeouts(): void {
    for (const timeoutId of this.timeoutIds) {
      clearTimeout(timeoutId);
    }
    this.timeoutIds.clear();
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