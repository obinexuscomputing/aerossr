
// src/index.ts
export * from './types';
export { setCorsHeaders, normalizeCorsOptions } from './utils/cors';
export { isPromise, ensureAsync } from './utils/async';

// Export interfaces with new names to avoid conflicts
export type {
  CacheStoreBase as CacheStore,
  CorsOptionsBase as CorsOptions,
  MetaTagsBase as MetaTags,
  LoggerOptionsBase as LoggerOptions
} from './types';