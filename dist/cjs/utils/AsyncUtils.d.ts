import type { AnyFunction } from '../types';
export interface AsyncOptions {
    timeout?: number;
    retries?: number;
    backoff?: 'fixed' | 'exponential';
    backoffDelay?: number;
    onRetry?: (error: Error, attempt: number) => void | Promise<void>;
}
export declare class AsyncUtils {
    private readonly defaultOptions;
    constructor(options?: Partial<AsyncOptions>);
    /**
     * Type guard to check if a value is a Promise
     */
    isPromise<T = unknown>(value: unknown): value is Promise<T>;
    /**
     * Ensures a function returns a Promise
     */
    ensureAsync<T extends AnyFunction>(fn: T, options?: Partial<AsyncOptions>): (...args: Parameters<T>) => Promise<ReturnType<T>>;
    /**
     * Creates a retry wrapper for any async function
     */
    withRetry<T extends AnyFunction>(fn: T, options?: Partial<AsyncOptions>): (...args: Parameters<T>) => Promise<ReturnType<T>>;
    /**
     * Executes multiple promises with concurrency limit
     */
    withConcurrency<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]>;
    /**
     * Creates a debounced version of an async function
     */
    debounceAsync<T extends AnyFunction>(fn: T, wait: number): (...args: Parameters<T>) => Promise<ReturnType<T>>;
    /**
     * Creates a timeout promise
     */
    private createTimeout;
    /**
     * Calculates backoff delay based on strategy
     */
    private calculateBackoff;
    /**
     * Creates a delay promise
     */
    private delay;
    /**
     * Gets the current default options
     */
    getDefaultOptions(): Required<AsyncOptions>;
    /**
     * Updates the default options
     */
    setDefaultOptions(options: Partial<AsyncOptions>): void;
}
export declare const asyncUtils: AsyncUtils;
//# sourceMappingURL=AsyncUtils.d.ts.map