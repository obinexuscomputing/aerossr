// src/index.ts

// Import all components and types
import { AeroSSR as AeroSSRCore } from './AeroSSR';
import { StaticFileMiddleware } from './middleware/StaticFileMiddleware';
import { Logger } from './utils/logger';
import { createCache } from './utils/cache';
import { setCorsHeaders } from './utils/cors';
import { generateETag } from './utils/etag';
import { generateErrorPage, handleError } from './utils/errorHandler';
import { injectMetaTags } from './utils/html';
import { generateBundle } from './utils/bundler';

// Export types
export type {
  AeroSSRConfig,
  CacheStore,
  StaticFileOptions,
  RouteHandler,
  Middleware,
  LoggerOptions,
  ErrorResponse,
  MetaTags
} from './types/index';

// Create namespace
export namespace AeroSSR {
  export const Server = AeroSSRCore;
  export const Middleware = {
    StaticFile: StaticFileMiddleware
  };
  export const Utils = {
    Logger,
    createCache,
    setCorsHeaders,
    generateETag,
    generateErrorPage,
    handleError,
    injectMetaTags,
    generateBundle
  };
}

// Export default for convenience
export default AeroSSRCore;

// Export individual components for those who prefer destructuring
export {
  AeroSSRCore as AeroSSR,
  StaticFileMiddleware,
  Logger,
  createCache,
  setCorsHeaders,
  generateETag,
  generateErrorPage,
  handleError,
  injectMetaTags,
  generateBundle
};