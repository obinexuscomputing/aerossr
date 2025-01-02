import { AnyFunction } from "..";
export declare function isPromise<T = unknown>(value: unknown): value is Promise<T>;
export declare function ensureAsync<T extends AnyFunction>(fn: T): (...args: Parameters<T>) => Promise<ReturnType<T>>;
//# sourceMappingURL=async.d.ts.map