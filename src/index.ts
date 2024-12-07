import { AeroSSR as AeroSSRBase } from './AeroSSR';
import { StaticFileMiddleware } from './middleware/StaticFileMiddleware';
import { Logger } from './utils/logger';
import { createCache } from './utils/cache';
import { setCorsHeaders } from './utils/cors';
import { generateETag } from './utils/etag';
import { generateErrorPage, handleError } from './utils/errorHandler';
import { injectMetaTags } from './utils/html';
import { generateBundle } from './utils/bundler';

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

// Create the base namespace with its implementations
export const AeroSSR = {
    Core: AeroSSRBase,
    Middleware: {
        StaticFile: StaticFileMiddleware
    },
    Utils: {
        Logger,
        Cache: {
            create: createCache
        },
        HTTP: {
            setCorsHeaders,
            generateETag
        },
        Error: {
            generatePage: generateErrorPage,
            handle: handleError
        },
        HTML: {
            injectMetaTags
        },
        Bundle: {
            generate: generateBundle
        }
    }
} as const;

// Export utilities for direct access
export {
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

// Single default export of the base class
export default AeroSSRBase;

// Re-export everything from sub-modules
export * from './middleware/index';
export * from './utils/index';