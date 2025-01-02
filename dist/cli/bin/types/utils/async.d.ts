import type { AnyFunction } from '../types';
/**
 * Type guard to check if a value is a Promise
 */
export declare function isPromise<T = unknown>(value: unknown): value is Promise<T>;
/**
 * Ensures a function returns a Promise
 */
export declare function ensureAsync<T extends AnyFunction>(fn: T): (...args: Parameters<T>) => Promise<ReturnType<T>>;
//# sourceMappingURL=async.d.ts.map