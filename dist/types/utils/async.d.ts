import { AnyFunction } from '../types/index.js';

/**
 * Type guard to check if a value is a Promise
 */
declare function isPromise<T = unknown>(value: unknown): value is Promise<T>;
/**
 * Ensures a function returns a Promise
 */
declare function ensureAsync<T extends AnyFunction>(fn: T): (...args: Parameters<T>) => Promise<ReturnType<T>>;

export { ensureAsync, isPromise };
