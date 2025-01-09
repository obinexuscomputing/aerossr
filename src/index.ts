export * from './core';
export * from './http';
export * from './routing';
export * from './middleware';
export * from './utils';
// src/index.ts
export { AeroSSR } from './core/AeroSSR';

// Re-export middlewares
export { StaticFileMiddleware } from './middleware/static';
export { SecurityMiddleware } from './middleware/security';

// Re-export HTTP types and utilities
export {
  Request,
  Response,
  RequestContext
} from './http';

// Re-export router and its types
export {
  Router,
  RouteBuilder,
  type RouteStrategy,
  type RouteMatch
} from './routing';

// Re-export utility implementations
export {
  Logger,
  corsManager,
  etagGenerator,
  ErrorHandler,
  
} from './utils';

// Re-export core types with explicit names to avoid conflicts
export type {
  // Core config types
  AeroSSRConfig,
  BundleHandler,
  StaticFileOptions,
  MiddlewareOptions,
  // Utility types
  CacheStore,
  CorsOptions,
  MetaTags,
  LoggerOptions,
  // Middleware types
  Middleware,
  // Router types
  RouteHandler,
  // Error types

  AsyncOptions,
  // Response types
  ResponseMetadata
} from './types';

// Export version
export const VERSION = '0.1.1';