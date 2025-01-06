
// src/index.ts
export { default as AeroSSR } from './AeroSSR';
export * from './types';
export * from './utils';
export * from './middlewares';
// Export interfaces with new names to avoid conflicts
export type {
  CacheStoreBase as CacheStore,
  CorsOptionsBase as CorsOptions,
  MetaTagsBase as MetaTags,
  LoggerOptionsBase as LoggerOptions
} from './types';