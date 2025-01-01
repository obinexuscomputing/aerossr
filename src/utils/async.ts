import type { AnyFunction } from '../types';

/**
 * Type guard to check if a value is a Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return Boolean(
    value && typeof value === 'object' && 'then' in value && typeof value.then === 'function'
  );
}

/**
 * Ensures a function returns a Promise
 */
export function ensureAsync<T extends AnyFunction>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async function(...args: Parameters<T>): Promise<ReturnType<T>> {
    const result = await fn(...args);
    return result as ReturnType<T>;
  };
}