import { CacheStore } from "@/types";

export function createCache<T>(): CacheStore<T> {
  const cache = new Map<string, T>();

  return {
    get: (key: string): T | undefined => cache.get(key),
    set: (key: string, value: T): void => { cache.set(key, value); },
    clear: (): void => cache.clear()
  };
}

