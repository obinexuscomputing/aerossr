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

export namespace AeroSSR {
    export class Core extends AeroSSRBase {}
    export namespace Middleware {
        export class StaticFile extends StaticFileMiddleware {}
    }
    export namespace Utils {
        export class LoggerUtil extends Logger {}
        export const Cache = {
            create: createCache
        };
        export const HTTP = {
            setCorsHeaders,
            generateETag
        };
        export const Error = {
            generatePage: generateErrorPage,
            handle: handleError
        };
        export const HTML = {
            injectMetaTags
        };
        export const Bundle = {
            generate: generateBundle
        };
    }
}

// Export the base class as AeroSSR for backward compatibility
export { AeroSSRBase as default };

// Export other utilities
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

// Export the base class as default
export default AeroSSRBase;

// Re-export everything from sub-modules
export * from './middleware/index';
export * from './utils/index';