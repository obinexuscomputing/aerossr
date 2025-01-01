import { AnyFunction } from "..";

export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return Boolean(
    value && typeof value === 'object' && 'then' in value && typeof value.then === 'function'
  );
}

export function ensureAsync<T extends AnyFunction>(
  fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async function(...args: Parameters<T>): Promise<ReturnType<T>> {
    const result = await fn(...args);
    return result as ReturnType<T>;
  };
}
